using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace Jambiz.Advent.Api;

public sealed class CalendarFunctions(CalendarStore store, IConfiguration config, ILogger<CalendarFunctions> logger)
{
    private async Task<IActionResult> Execute(HttpRequest request, Func<string, string, Task<object>> action)
    {
        var auth = await request.HttpContext.AuthenticateAsync();
        if (!auth.Succeeded || auth.Principal is not { } user) return new UnauthorizedResult();
        if (user.FindFirstValue("tid") != config["Authentication:TenantId"] ||
            user.FindFirstValue("azp") != config["Authentication:SpaClientId"] ||
            !(user.FindFirstValue("scp") ?? "").Split(' ').Contains("access_as_user") ||
            !Guid.TryParse(user.FindFirstValue("oid"), out var oid)) return new ForbidResult();
        request.HttpContext.Response.Headers.CacheControl = "no-store";
        try
        {
            var displayName = user.FindFirstValue("name") ?? "Player";
            return new OkObjectResult(await action($"player:{oid}", displayName[..Math.Min(100, displayName.Length)]));
        }
        catch (ApiException ex) { return new ObjectResult(new { error = ex.Message }) { StatusCode = ex.Status }; }
        catch (JsonException) { return new BadRequestObjectResult(new { error = "Invalid JSON." }); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Calendar API request failed");
            return new ObjectResult(new { error = "The calendar service is unavailable. Please retry." }) { StatusCode = 503 };
        }
    }
    private static async Task<T> Body<T>(HttpRequest request)
    {
        const int limit = 20000;
        if (request.ContentLength > limit) throw new ApiException(413, "Request is too large.");
        using var buffer = new MemoryStream();
        var bytes = new byte[4096];
        int count;
        while ((count = await request.Body.ReadAsync(bytes)) > 0)
        {
            if (buffer.Length + count > limit) throw new ApiException(413, "Request is too large.");
            await buffer.WriteAsync(bytes.AsMemory(0, count));
        }
        return JsonSerializer.Deserialize<T>(buffer.ToArray(), new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new ApiException(400, "Missing result.");
    }
    [Function("Calendar")]
    public Task<IActionResult> Calendar([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "calendar")] HttpRequest request) =>
        Execute(request, async (id, name) =>
        {
            var calendar = await store.Calendar();
            var player = await store.Player(id, name);
            var christmas = CalendarRules.IsUnlocked(store.Year, 25, DateTimeOffset.UtcNow);
            return new { calendar.Season, Days = calendar.Days.Select(d => d with
                { Reward = christmas || player.Days.Any(p => p.Day == d.Day) ? d.Reward : null,
                  FunFactKey = christmas || player.Days.Any(p => p.Day == d.Day) ? d.FunFactKey : null }), Player = player };
        });
    [Function("StartRun")]
    public Task<IActionResult> Start([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "days/{day:int}/attempts")] HttpRequest request, int day) =>
        Execute(request, async (id, _) => await store.Start(id, day));
    [Function("CompleteRun")]
    public Task<IActionResult> Complete([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "attempts/complete")] HttpRequest request) =>
        Execute(request, async (id, name) =>
        {
            var input = await Body<CompleteRequest>(request);
            return await store.Complete(id, name, input);
        });
    [Function("GlobalLeaderboard")]
    public Task<IActionResult> Global([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "leaderboards/global")] HttpRequest request) =>
        Execute(request, async (_, _) => await store.Leaderboard(null));
    [Function("SaveExtra")]
    public Task<IActionResult> Extra([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "me/extras")] HttpRequest request) =>
        Execute(request, async (id, name) => await store.SaveExtra(id, name,
            await Body<ExtraRequest>(request)));
    [Function("DailyLeaderboard")]
    public Task<IActionResult> Daily([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "leaderboards/days/{day:int}")] HttpRequest request, int day) =>
        Execute(request, async (_, _) => await store.Leaderboard(day));
}
