using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Azure.Cosmos;

namespace Jambiz.Advent.Api;

public sealed class CalendarStore
{
    private readonly Container container;
    private readonly SeasonDocument seed;
    private readonly JsonObject seedDocument;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public string Season => seed.Season;
    public int Year => int.Parse(Season);
    public CalendarStore(CosmosClient cosmos, IConfiguration config)
    {
        container = cosmos.GetContainer(config["Cosmos:Database"] ?? "advent", "calendar");
        seedDocument = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,
            "Data", "calendar-2026.json")))!.AsObject();
        seed = seedDocument.Deserialize<SeasonDocument>(Json)!;
    }
    public async Task<SeasonDocument> Calendar()
    {
        for (var retry = 0; retry < 8; retry++)
        {
            try
            {
                var response = await container.ReadItemAsync<JsonObject>("calendar", new(Season));
                var upgraded = CalendarMigrations.UpgradeGames(response.Resource, seedDocument);
                if (upgraded is null) return response.Resource.Deserialize<SeasonDocument>(Json)!;
                // ETag protects a reward editor or another host migrating the same revision.
                await container.ReplaceItemAsync(upgraded, "calendar", new(Season), new() { IfMatchEtag = response.ETag });
                return upgraded.Deserialize<SeasonDocument>(Json)!;
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                try { await container.CreateItemAsync(seedDocument, new(Season)); }
                catch (CosmosException conflict) when (conflict.StatusCode == HttpStatusCode.Conflict) { }
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.PreconditionFailed) { }
        }
        throw new ApiException(409, "The calendar is being updated. Retry shortly.");
    }
    public async Task<PlayerDocument> Player(string playerId, string name)
    {
        try { return (await container.ReadItemAsync<PlayerDocument>(playerId, new(Season))).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        { return new(playerId, Season, name, []); }
    }
    public async Task<AttemptDocument> Start(string playerId, int day)
    {
        if (!(await Calendar()).Days.Any(d => d.Day == day)) throw new ApiException(404, "Day not found.");
        if (!CalendarRules.IsUnlocked(Year, day, DateTimeOffset.UtcNow)) throw new ApiException(403, "This door is still locked.");
        var attempt = new AttemptDocument($"attempt:{Guid.NewGuid():N}", Season, playerId, day, DateTimeOffset.UtcNow);
        await container.CreateItemAsync(attempt, new(Season));
        return attempt;
    }
    public async Task<PlayerDocument> Complete(string playerId, string name, CompleteRequest input)
    {
        if (input.AttemptId is null || !input.AttemptId.StartsWith("attempt:") || input.AttemptId.Length > 64)
            throw new ApiException(400, "Invalid attempt.");
        if (input.Stats?.ToJsonString().Length > 16000) throw new ApiException(400, "Statistics are too large.");
        for (var retry = 0; retry < 8; retry++)
        {
            ItemResponse<AttemptDocument> attemptResponse;
            try { attemptResponse = await container.ReadItemAsync<AttemptDocument>(input.AttemptId, new(Season)); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { throw new ApiException(410, "Run expired. Start again."); }
            var attempt = attemptResponse.Resource;
            if (attempt.PlayerId != playerId) throw new ApiException(403, "This run belongs to another player.");
            if (attempt.Used) return await Player(playerId, name); // Idempotent retry, no second score.
            var elapsed = (DateTimeOffset.UtcNow - attempt.StartedAt).TotalSeconds;
            var result = new DayResult(attempt.Day, CalendarRules.Score(elapsed), elapsed, DateTimeOffset.UtcNow, input.Stats ?? []);
            ItemResponse<PlayerDocument>? response = null;
            try { response = await container.ReadItemAsync<PlayerDocument>(playerId, new(Season)); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { }
            var player = new PlayerDocument(playerId, Season, name, CalendarRules.KeepBest(response?.Resource.Days ?? [], result))
                { Extras = response?.Resource.Extras ?? [] };
            var batch = container.CreateTransactionalBatch(new(Season))
                .ReplaceItem(attempt.Id, attempt with { Used = true }, new() { IfMatchEtag = attemptResponse.ETag });
            if (response is null) batch.CreateItem(player);
            else batch.ReplaceItem(player.Id, player, new() { IfMatchEtag = response.ETag });
            using var saved = await batch.ExecuteAsync();
            if (saved.IsSuccessStatusCode) return player;
            if (saved.StatusCode is not (HttpStatusCode.Conflict or HttpStatusCode.PreconditionFailed or HttpStatusCode.FailedDependency))
                throw new ApiException(503, "Could not save your result. Retry shortly.");
        }
        throw new ApiException(409, "Another result is being saved. Retry shortly.");
    }
    public async Task<object> Leaderboard(int? day)
    {
        if (day is < 1 or > 24) throw new ApiException(400, "Invalid day.");
        var players = new List<PlayerDocument>();
        using var iterator = container.GetItemQueryIterator<PlayerDocument>(
            "SELECT * FROM c WHERE STARTSWITH(c.id, 'player:')", requestOptions: new() { PartitionKey = new(Season) });
        while (iterator.HasMoreResults) players.AddRange(await iterator.ReadNextAsync());
        var ranked = players.Select(p => new
            {
                p.Id, p.DisplayName,
                Score = p.Days.Where(d => day is null || d.Day == day).Sum(d => d.Score),
                CompletedDays = p.Days.Count(d => day is null || d.Day == day),
                ElapsedSeconds = p.Days.Where(d => day is null || d.Day == day).Sum(d => d.ElapsedSeconds),
                AchievedAt = p.Days.Where(d => day is null || d.Day == day).Max(d => (DateTimeOffset?)d.CompletedAt)
            }).Where(p => p.CompletedDays > 0).OrderByDescending(p => p.Score).ThenBy(p => p.ElapsedSeconds)
            .ThenBy(p => p.AchievedAt).ThenBy(p => p.Id, StringComparer.Ordinal).Take(100)
            .Select((p, index) => new { Rank = index + 1, p.Id, p.DisplayName, p.Score, p.CompletedDays, p.ElapsedSeconds });
        return new { Season, Day = day, Entries = ranked };
    }

    public async Task<PlayerDocument> SaveExtra(string id, string name, ExtraRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.LevelId) || input.LevelId.Length > 100 ||
            !System.Text.RegularExpressions.Regex.IsMatch(input.LevelId, "^[a-zA-Z0-9_-]+$") ||
            input.Stats?.ToJsonString().Length > 16000) throw new ApiException(400, "Invalid extra result.");
        for (var retry = 0; retry < 8; retry++)
        {
            ItemResponse<PlayerDocument>? response = null;
            try { response = await container.ReadItemAsync<PlayerDocument>(id, new(Season)); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { }
            var player = response?.Resource ?? new PlayerDocument(id, Season, name, []);
            if (!player.Extras.ContainsKey(input.LevelId) && player.Extras.Count >= 300)
                throw new ApiException(400, "Extra result limit reached.");
            player.Extras[input.LevelId] = input.Stats ?? [];
            try
            {
                if (response is null) await container.CreateItemAsync(player, new(Season));
                else await container.ReplaceItemAsync(player, id, new(Season), new() { IfMatchEtag = response.ETag });
                return player;
            }
            catch (CosmosException ex) when (ex.StatusCode is HttpStatusCode.Conflict or HttpStatusCode.PreconditionFailed) { }
        }
        throw new ApiException(409, "Another result is being saved. Retry shortly.");
    }
}
