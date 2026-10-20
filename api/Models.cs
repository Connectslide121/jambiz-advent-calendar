using System.Text.Json.Nodes;

namespace Jambiz.Advent.Api;

public sealed record DayDefinition(int Day, int GridPosition, string ChallengeType, JsonObject ChallengeData,
    JsonObject? Reward, string? FunFactKey);
public sealed record SeasonDocument(string Id, string Season, List<DayDefinition> Days);
public sealed record DayResult(int Day, int Score, double ElapsedSeconds, DateTimeOffset CompletedAt, JsonObject Stats);
public sealed record PlayerDocument(string Id, string Season, string DisplayName, List<DayResult> Days)
{
    public Dictionary<string, JsonObject> Extras { get; init; } = [];
}
public sealed record ExtraRequest(string LevelId, JsonObject? Stats);
public sealed record AttemptDocument(string Id, string Season, string PlayerId, int Day, DateTimeOffset StartedAt,
    bool Used = false, int Ttl = 3600);
public sealed record CompleteRequest(string AttemptId, JsonObject? Stats);
public sealed class ApiException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

public static class CalendarRules
{
    public static bool IsUnlocked(int year, int day, DateTimeOffset now) =>
        TimeZoneInfo.ConvertTime(now, TimeZoneInfo.FindSystemTimeZoneById("Europe/Stockholm")).Date
        >= new DateTime(year, 12, day);

    // Every game awards 1,000 completion points plus a speed bonus of up to 1,000.
    // One common scale prevents action-game scores overwhelming the puzzle games globally.
    public static int Score(double seconds)
    {
        if (!double.IsFinite(seconds) || seconds < 1 || seconds > 3600)
            throw new ApiException(400, "Runs must last between 1 second and 60 minutes.");
        return 1000 + (int)Math.Floor(1000 / (1 + seconds / 60));
    }
    public static List<DayResult> KeepBest(IEnumerable<DayResult> existing, DayResult candidate)
    {
        var days = existing.ToList();
        var previous = days.Find(d => d.Day == candidate.Day);
        if (previous is null) days.Add(candidate);
        else if (candidate.Score > previous.Score ||
                 candidate.Score == previous.Score && candidate.ElapsedSeconds < previous.ElapsedSeconds)
            days[days.IndexOf(previous)] = candidate;
        return days;
    }
}
