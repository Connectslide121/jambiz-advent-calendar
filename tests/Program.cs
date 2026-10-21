using Azure.Identity;
using Jambiz.Advent.Api;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using System.Text.Json.Nodes;

var assertions = 0;
void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
    assertions++;
}
void Reject(Action action, int status)
{
    try { action(); throw new Exception("Expected rejection"); }
    catch (ApiException ex) { Check(ex.Status == status, "Wrong rejection status"); }
}
async Task RejectAsync(Func<Task> action, int status)
{
    try { await action(); throw new Exception("Expected rejection"); }
    catch (ApiException ex) { Check(ex.Status == status, "Wrong rejection status"); }
}
Check(!CalendarRules.IsUnlocked(2026, 1, DateTimeOffset.Parse("2026-11-30T22:59:59Z")), "Early unlock");
Check(CalendarRules.IsUnlocked(2026, 1, DateTimeOffset.Parse("2026-11-30T23:00:00Z")), "Stockholm midnight");
Check(!CalendarRules.IsUnlocked(2026, 2, DateTimeOffset.Parse("2026-12-01T12:00:00Z")), "Future day unlocked");
Check(CalendarRules.IsUnlocked(2026, 24, DateTimeOffset.Parse("2027-01-01T00:00:00Z")), "Archive relocked");
Check(CalendarRules.Score(60) == 1500, "Scoring formula");
Check(CalendarRules.Score(1) > CalendarRules.Score(60), "Faster run must score higher");
foreach (var seconds in new[] { 0, -1, 3601, double.NaN, double.PositiveInfinity }) Reject(() => CalendarRules.Score(seconds), 400);
var result = new DayResult(1, 1500, 60, DateTimeOffset.UtcNow, []);
Check(CalendarRules.KeepBest([result], result with { Score = 1200 }).Single().Score == 1500, "Worse result replaced best");
Check(CalendarRules.KeepBest([result], result with { Score = 1600 }).Single().Score == 1600, "Best result not saved");
Check(CalendarRules.KeepBest([result], result with { Day = 2 }).Count == 2, "New day lost");
Check(CalendarRules.KeepBest([result], result with { ElapsedSeconds = 59.99 }).Single().ElapsedSeconds == 59.99, "Tied score must use precise elapsed time");
var oid = Guid.Parse("1a2b3c4d-0000-0000-0000-000000000000");
Check(CalendarRules.DisplayName(oid, "Anna Lind", "anna@jambiz.se") == "Anna Lind", "Display name must win");
Check(CalendarRules.DisplayName(oid, "  ", null, "anna@jambiz.se") == "anna@jambiz.se", "Blank name must fall back to the email");
Check(CalendarRules.DisplayName(oid, null, null, null, null) == "Jambiz #1a2b3c", "Missing claims need a distinct label");
Check(CalendarRules.DisplayName(oid, new string('x', 150)).Length == 100, "Names are capped");

var catalog = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "calendar-2026.json")))!.AsObject();
var legacy = (JsonObject)catalog.DeepClone();
legacy.Remove("gameRevision");
legacy["customField"] = "preserve me";
var legacyDay = legacy["days"]!.AsArray().OfType<JsonObject>().Single(d => d["day"]!.GetValue<int>() == 13);
legacyDay["challengeType"] = "juldle";
legacyDay["challengeData"] = new JsonObject { ["wordEn"] = "TINSEL" };
legacyDay["reward"] = new JsonObject { ["type"] = "text", ["textKey"] = "custom.reward" };
legacyDay["editorNote"] = "keep this too";
legacyDay["gridPosition"] = 22;
var upgradedCatalog = CalendarMigrations.UpgradeGames(legacy, catalog)!;
var upgradedDay = upgradedCatalog["days"]!.AsArray().OfType<JsonObject>().Single(d => d["day"]!.GetValue<int>() == 13);
Check(upgradedDay["challengeType"]!.GetValue<string>() == "cryptogram", "Game migration did not update the old duplicate");
Check(upgradedDay["challengeData"]!.ToJsonString() == "{}", "Old game config remained");
Check(upgradedDay["reward"]!["textKey"]!.GetValue<string>() == "custom.reward", "Game migration overwrote edited reward");
Check(upgradedDay["gridPosition"]!.GetValue<int>() == 22, "Game migration moved the door");
Check(upgradedDay["editorNote"]!.GetValue<string>() == "keep this too", "Game migration lost day metadata");
Check(upgradedCatalog["customField"]!.GetValue<string>() == "preserve me", "Game migration lost season metadata");
Check(legacyDay["challengeType"]!.GetValue<string>() == "juldle", "Migration mutated its input document");
Check(CalendarMigrations.UpgradeGames(upgradedCatalog, catalog) is null, "Migration is not idempotent");
var newerCatalog = (JsonObject)upgradedCatalog.DeepClone();
newerCatalog["gameRevision"] = 999;
Check(CalendarMigrations.UpgradeGames(newerCatalog, catalog) is null, "Older release overwrote a newer calendar");
Check(upgradedCatalog["days"]!.AsArray().OfType<JsonObject>().Select(d => d["challengeType"]!.GetValue<string>()).Distinct().Count() == 24, "Calendar still contains duplicate game types");

if (args.Length == 2 && args[0] == "--cosmos")
{
    using var client = new CosmosClient(args[1], new DefaultAzureCredential(), new CosmosClientOptions
    { UseSystemTextJsonSerializerWithOptions = new(JsonSerializerDefaults.Web) });
    var store = new CalendarStore(client, new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    { ["Cosmos:Database"] = "advent" }).Build());
    var container = client.GetContainer("advent", "calendar");
    var playerId = $"player:test-{Guid.NewGuid():N}";
    var createdIds = new List<string> { playerId };
    async Task<AttemptDocument> Attempt(double seconds)
    {
        var run = new AttemptDocument($"attempt:{Guid.NewGuid():N}", store.Season, playerId, 1, DateTimeOffset.UtcNow.AddSeconds(-seconds));
        await container.CreateItemAsync(run, new(store.Season));
        createdIds.Add(run.Id);
        return run;
    }
    try
    {
        Check((await store.Calendar()).Days.Count == 24, "Calendar seed failed");
        if (DateTimeOffset.UtcNow < DateTimeOffset.Parse("2026-11-30T23:00:00Z"))
            await RejectAsync(async () => await store.Start(playerId, 1), 403);
        var run = await Attempt(60);
        var saved = await store.Complete(playerId, "Integration test", new(run.Id, new() { ["moves"] = 5 }));
        Check(saved.Days.Count == 1, "Completion not saved");
        var repeated = await store.Complete(playerId, "Integration test", new(run.Id, []));
        Check(repeated.Days.Single().Score == saved.Days.Single().Score, "Duplicate altered score");
        await RejectAsync(async () => await store.Complete("player:someone-else", "Other", new(run.Id, [])), 403);
        var slow = await Attempt(500);
        var slower = await store.Complete(playerId, "Integration test", new(slow.Id, []));
        Check(slower.Days.Single().Score == saved.Days.Single().Score, "Worse replay overwrote best");
        var fast = await Attempt(20);
        var medium = await Attempt(40);
        await Task.WhenAll(store.Complete(playerId, "Integration test", new(fast.Id, [])),
            store.Complete(playerId, "Integration test", new(medium.Id, [])));
        var best = await store.Player(playerId, "Integration test");
        Check(best.Days.Count == 1 && best.Days.Single().Score > saved.Days.Single().Score, "Concurrent results lost best score");
        await store.SaveExtra(playerId, "Integration test", new("test-extra", new() { ["moves"] = 3 }));
        Check((await store.Player(playerId, "Integration test")).Extras.ContainsKey("test-extra"), "Extra not persisted");
        var board = JsonSerializer.Serialize(await store.Leaderboard(1));
        Check(board.Contains("Integration test"), "Daily leaderboard omitted player");
        Check(JsonSerializer.Serialize(await store.Leaderboard(null)).Contains("Integration test"), "Global leaderboard omitted player");
        var expired = await Attempt(3700);
        await RejectAsync(async () => await store.Complete(playerId, "Integration test", new(expired.Id, [])), 400);
    }
    finally
    {
        foreach (var id in createdIds)
            try { await container.DeleteItemAsync<object>(id, new(store.Season)); }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
    }
}
Console.WriteLine($"Passed {assertions} assertions.");
