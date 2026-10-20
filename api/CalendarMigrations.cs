using System.Text.Json.Nodes;

namespace Jambiz.Advent.Api;

public static class CalendarMigrations
{
    // A release changes game definitions once. Edited rewards, grid positions and other
    // document fields are retained. Player/attempt documents are never involved.
    public static JsonObject? UpgradeGames(JsonObject current, JsonObject seed)
    {
        var revision = seed["gameRevision"]?.GetValue<int>() ?? 0;
        if ((current["gameRevision"]?.GetValue<int>() ?? 0) >= revision) return null;
        if (current["season"]?.GetValue<string>() != seed["season"]?.GetValue<string>())
            throw new InvalidOperationException("Calendar season mismatch.");
        var upgraded = (JsonObject)current.DeepClone();
        var days = upgraded["days"]?.AsArray() ?? throw new InvalidOperationException("Calendar days missing.");
        foreach (var definition in seed["days"]!.AsArray().OfType<JsonObject>())
        {
            var number = definition["day"]!.GetValue<int>();
            var existing = days.OfType<JsonObject>().SingleOrDefault(d => d["day"]?.GetValue<int>() == number);
            if (existing is null) { days.Add(definition.DeepClone()); continue; }
            existing["challengeType"] = definition["challengeType"]?.DeepClone();
            existing["challengeData"] = definition["challengeData"]?.DeepClone();
        }
        upgraded["gameRevision"] = revision;
        return upgraded;
    }
}
