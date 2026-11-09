using System.Text.Json.Nodes;

namespace Jambiz.Advent.Api;

public static class CalendarMigrations
{
    // Applies every pending revision from the seed, or returns null when the stored calendar is current.
    public static JsonObject? Upgrade(JsonObject current, JsonObject seed)
    {
        var games = UpgradeGames(current, seed);
        var rewards = UpgradeRewards(games ?? current, seed);
        return rewards ?? games;
    }

    // A release changes game definitions once. Edited rewards, grid positions and other
    // document fields are retained. Player/attempt documents are never involved.
    public static JsonObject? UpgradeGames(JsonObject current, JsonObject seed) =>
        UpgradeDays(current, seed, "gameRevision", (existing, definition) =>
        {
            existing["challengeType"] = definition["challengeType"]?.DeepClone();
            existing["challengeData"] = definition["challengeData"]?.DeepClone();
        });

    // A release replaces every day's reward once. Games, grid positions and other fields are
    // retained; a day without a reward or funFactKey in the seed loses the stored one.
    public static JsonObject? UpgradeRewards(JsonObject current, JsonObject seed) =>
        UpgradeDays(current, seed, "rewardRevision", (existing, definition) =>
        {
            foreach (var field in new[] { "reward", "funFactKey" })
            {
                if (definition[field] is { } value) existing[field] = value.DeepClone();
                else existing.Remove(field);
            }
        });

    private static JsonObject? UpgradeDays(JsonObject current, JsonObject seed, string revisionField,
        Action<JsonObject, JsonObject> apply)
    {
        var revision = seed[revisionField]?.GetValue<int>() ?? 0;
        if ((current[revisionField]?.GetValue<int>() ?? 0) >= revision) return null;
        if (current["season"]?.GetValue<string>() != seed["season"]?.GetValue<string>())
            throw new InvalidOperationException("Calendar season mismatch.");
        var upgraded = (JsonObject)current.DeepClone();
        var days = upgraded["days"]?.AsArray() ?? throw new InvalidOperationException("Calendar days missing.");
        foreach (var definition in seed["days"]!.AsArray().OfType<JsonObject>())
        {
            var number = definition["day"]!.GetValue<int>();
            var existing = days.OfType<JsonObject>().SingleOrDefault(d => d["day"]?.GetValue<int>() == number);
            if (existing is null) { days.Add(definition.DeepClone()); continue; }
            apply(existing, definition);
        }
        upgraded[revisionField] = revision;
        return upgraded;
    }
}
