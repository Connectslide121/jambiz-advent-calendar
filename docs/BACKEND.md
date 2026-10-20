# Azure backend and tenant sign-in

The 2026 redesign was merged into `develop` with merge commit `31fb71d`. The source branch
`claude/advent-2026-redesign-4uuw47` remains at `c6ff133`.

## Production environment

Subscription **Sprinta Intern** (`ffb12bea-8324-4344-8361-bdcf71f032d0`), resource group
**rg-jambiz-advent-dev-swc**. Compute, storage and Cosmos are in Sweden Central; SWA is in West Europe.

| Resource | Name |
| --- | --- |
| Frontend | https://calm-water-0b43e6903.5.azurestaticapps.net |
| Static Web App, Free | `swa-jambiz-advent-develop` |
| Function App, .NET 10 isolated, Flex Consumption | `func-jambiz-advent-wipgysmx` |
| API origin | https://func-jambiz-advent-wipgysmx.azurewebsites.net |
| Cosmos DB for NoSQL, serverless | `cosmos-jambiz-advent-wipgysmx` |
| Database / container / partition key | `advent` / `calendar` / `/season` |
| Function host/package storage | `stadventwipgysmx` |

This is the **only production environment**, tagged `environment=prod` on the resource group
and all five top-level resources. The `dev` / `develop` strings in the original group and SWA names
are historical names, retained because Azure cannot rename them in place. They do not designate
a separate development environment. Keep these names in deployment scripts and infrastructure
so future deployments update the same resources.

`https://jambizadvent.se` serves the frontend through GitHub Pages. The SWA is another frontend
for this same production backend and Cosmos database, not a second environment. Podium-ops resources are unchanged. There are no always-ready Function instances or provisioned
Cosmos throughput. Azure resources still have usage charges.

## Authentication and data access

Tenant: **bd4bd237-f885-4525-b60d-581adb48c358**, the same tenant as podium-ops.
The calendar uses independent registrations and does not request access to the Operations API.

- API `jambiz-advent-api`: `5a625966-7547-489d-86f1-322386384708`.
- SPA `jambiz-advent-spa`: `14c4ffbf-5eea-4580-abc1-e9d3325e1cb6`.
- Delegated scope: `api://5a625966-7547-489d-86f1-322386384708/access_as_user`.
- Both registrations are single-tenant; the SPA is preauthorized for the scope.
- Tenant users, including admitted guests, can sign in subject to tenant policies. No app-level
  group, email-domain or user allowlist is imposed, and enterprise-app assignment is not required.
- MSAL uses authorization code with PKCE and full-page redirects, with the SWA origin and
  `http://localhost:4200` and `https://jambizadvent.se` registered. No client secret is used.
- Every API route validates bearer signature, v2 issuer, API audience, tenant, calling SPA (`azp`),
  delegated scope (`scp`) and user object ID (`oid`). There is no development auth bypass.
- Functions' `AuthorizationLevel.Anonymous` means no Function key is required; the explicit
  Entra checks in `CalendarFunctions.Execute` still apply.
- `public/app-config.json` contains only public IDs and API origin. CORS allows the SWA origin, `https://jambizadvent.se`
  and localhost. Player responses have `Cache-Control: no-store`.
- Cosmos key authentication is disabled. The Function's managed identity has Cosmos Data
  Contributor scoped to `/dbs/advent` only.
- At the user's request, `jon.mendizabal@sprinta.se` (`c8d0ed7e-283e-4587-a583-4f95a8bca427`)
  also has permanent Cosmos Data Contributor on this database for development/data management.

## Data and rewards

One logical partition per season (`2026`) contains:

- `calendar`: 24 challenge definitions, grid positions, reward metadata and translation keys.
  `api/Data/calendar-2026.json` seeds it once on the first authenticated calendar request.
  `gameRevision` controls one-time upgrades of `challengeType` and `challengeData`. Revision 1
  replaces ten repeated games, while preserving edited rewards, grid positions, other metadata
  and all player documents. An ETag-conditional write retries concurrent edits. After the revision
  is applied, subsequent requests preserve later edits to game definitions too.
- `player:<Entra oid>`: display name, best scored result and game statistics per day, plus
  extra-level completions/statistics. Cloud progress follows the user across devices.
- `attempt:<random id>`: owner, day, server start time and consumed flag; one-hour TTL.

Media stays under `public/rewards/`; Cosmos stores URLs/configuration rather than binary files.
Those files and translation text are public assets. Reward metadata is withheld until the player
completes that day, or December 25. This is a reveal mechanism, not confidential media storage.
The imported rewards remain the redesign's **2025 placeholders**.

The frontend loads definitions from the authenticated API before rendering. Edit the Cosmos
`calendar` document for an existing season and the seed for fresh environments. Extras definitions
remain in `extras-config.ts`; their saved results are separate from the competitive scoreboards.
Old browser progress is intentionally not imported into official results. Language/sound settings
remain local. Dev tools are localhost-only previews and cannot bypass server dates or reset cloud data.

For full local access, type **`devtools`** outside an input. This opens the calendar and its developer
controls. Dev-tools visibility and dev mode are remembered in localStorage, independently. On a
reload, saved dev mode is restored after sign-in and before the calendar renders. Turning either
setting off is remembered too. Turn **Dev mode ON** to play every day and extra level and browse all rewards. Preview games
skip run creation and result/extra submissions; completions and stats stay in memory for that session.
The game modal also offers **Show reward** without requiring a win. Turning dev mode off restores
the authenticated calendar and cloud progress. A banner identifies preview runs.

Reward definitions for preview come from `/dev-preview/calendar-2026.json`, copied from the seed
only by Angular's **development** build configuration. Production output does not contain this asset,
and activation also requires a development build on `localhost`. Preview does not relax API checks.

## Scoring and reliability

Door N opens December N, 2026 at **00:00 Europe/Stockholm**, and stays unlocked afterward.
The API enforces this independently of the browser clock. Replays and catching up are allowed.
Opening a daily game creates a server-timed run before rendering it. A win saves before revealing
the reward; failed saves retry the same run ID. Runs expire after an hour. Timing includes setup,
retries and the game's brief win animation.

Score: `1000 + floor(1000 / (1 + elapsedSeconds / 60))`. This common scale gives different games
comparable contributions. Each player's best run per day counts; the global board sums those 24
scores. A worse replay cannot reduce a score. Ties use elapsed time, then achievement time and
stable player ID. Both boards show the top 100.

Completed doors have a full-size replay button over the revealed picture. **Play Again** in the
game window restarts any game, including from its reward/success screen. The host destroys the
previous game to stop its timers, remounts a fresh instance, and creates a new timed attempt for
daily scored runs. Extra-level wins stay in the window so they can be replayed too. Viewing an
already-earned reward does not submit a result. Dev-mode replays keep skipping cloud writes.

Identity comes from the token; duration/points come from the server. Clients cannot submit points,
timestamps or another user's ID. An ETag-conditional Cosmos transaction consumes a run and updates
the player together. Duplicate retries are idempotent; concurrent saves retry without losing other days.

Games run in the browser and report a win. There is no server-side simulation/replay proof, so a
determined tenant user can fabricate completion. This is for a friendly staff competition, not
prizes requiring cheat-proof rankings. Keep the scoring policy fixed during the season.

Leaderboards scan the small staff-season partition and sort in the backend. At substantially larger
participation, replace this with materialized leaderboard documents.

## API

All routes require a delegated Entra token for the calendar API.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/calendar` | Calendar, eligible rewards, own progress/extras |
| POST | `/api/days/{day}/attempts` | Start a timed run for an unlocked door |
| POST | `/api/attempts/complete` | `{ attemptId, stats }`, consume once and keep best |
| POST | `/api/me/extras` | `{ levelId, stats }`, save own extra completion |
| GET | `/api/leaderboards/days/{day}` | Daily top 100 |
| GET | `/api/leaderboards/global` | Global top 100 |

Status codes: invalid input 400, missing authentication 401, wrong scope/app/tenant or locked door
403, missing day 404, contention 409, missing/expired run 410, oversized body 413, storage failure 503.
Raw server errors and credentials are never returned to the client.

## Build, local development and deployment

Requires Node 20.19+ (or another version supported by Angular 20), .NET 10 SDK, Azure CLI and,
for local API hosting, Functions Core Tools v4 and Azurite.

```powershell
npm ci
dotnet run --project tests/Jambiz.Advent.Tests.csproj
npx ng build --configuration development
npx ng build --configuration production
npx ng test --watch=false --browsers=ChromeHeadless
```

Initialize and start the local API from the repository root:

```powershell
Copy-Item api/local.settings.example.json api/local.settings.json # first time only
az login --tenant bd4bd237-f885-4525-b60d-581adb48c358
# Keep this running in a separate terminal:
npx --yes azurite@3.37.0 --silent --location .azure-local/azurite
# Then start the API in the original terminal:
cd api
dotnet run
```

Run `dotnet run` with `api/` as the working directory. The SDK builds the project and starts Core
Tools from the correct output directory. Prefer this over `func start` with `Azure.Functions.Sdk`;
the current SDK's relative working directory also prevents `dotnet run --project api/...` from the root.
The ignored local settings specify `FUNCTIONS_WORKER_RUNTIME=dotnet-isolated`, the public Entra IDs,
Cosmos endpoint and localhost CORS. Azurite provides local host storage; Cosmos data still lives in
Azure. Without Azurite, HTTP routes may start but the current host's storage health check fails.

To connect the local frontend to this API, set `apiBaseUrl` in `public/app-config.json` to
`http://localhost:7071`, then run `npm start` at the root. Restore the deployed API origin before
committing this public configuration. Direct Cosmos access requires a data role; subscription
Contributor alone does not provide it. Local frontend can use the deployed API too.

If Core Tools reports `Worker runtime cannot be 'None'`, verify `api/local.settings.json` exists:
the current project SDK is not detected by Core Tools' older language heuristics without that
runtime setting. The example is safe to commit; the working local file is ignored and never published.

The Angular dev server excludes `@azure/msal-browser` from dependency prebundling. This keeps its
lazy import in Angular's own compiled chunks and avoids Vite's `504 (Outdated Optimize Dep)` on
the sign-in library. Restart `npm start` after changing this setting, then reload the browser.

`scripts/configure-entra.ps1` creates/reuses the exact calendar registrations and writes nonsecret
metadata into ignored `.azure-local/entra.json`. It preserves existing redirect URIs.

```powershell
./scripts/configure-entra.ps1
./scripts/deploy.ps1 -Provision # first installation or infrastructure changes
./scripts/deploy.ps1            # code update to existing resources
```

Deploy builds/tests first, uploads the Angular output with SWA CLI, then publishes a Function ZIP
including hidden host files. The frontend must understand the new game types before the API
applies a calendar revision. Already-open browser tabs may need a reload after the update. The SWA deployment token is held only in a process environment variable
and removed afterward. No Git push or automatic GitHub Actions deployment is configured here.
`npm run deploy` builds and publishes the frontend to the existing `gh-pages` branch for
`https://jambizadvent.se`. It uses the same public API configuration and Entra SPA as the SWA.
Use the PowerShell script for Azure. Azure DevOps migration and pipeline setup are deferred.

Optional live Cosmos tests create uniquely named test players/runs and clean them up:

```powershell
dotnet run --project tests/Jambiz.Advent.Tests.csproj -- --cosmos https://cosmos-jambiz-advent-wipgysmx.documents.azure.com:443/
```

These require an explicitly authorized data role. The ordinary test command is offline.

## Verification on 20 October 2026

- Development/production Angular builds and .NET publish passed. The initial JS/CSS bundle is
  under the 500 kB warning budget; existing reward SCSS deprecation/size warnings remain.
- Offline scoring/date/best-result and calendar migration tests: 25 assertions passed.
- Live Cosmos tests: 26 assertions passed, covering seed, date enforcement, persistence,
  duplicate/foreign attempts, worse replays, concurrent saves, extras and both leaderboards.
  Test player/run documents were removed afterward; the calendar seed remains.
- Angular sign-in gate tests: 2 passed using headless Edge.
- All six deployed Functions are indexed. Calendar and both scoreboard routes return 401 for
  missing/invalid bearer tokens; the SWA-origin preflight returns 204 with the expected origin.
- Both enterprise apps are enabled with assignment not required. Browser sign-in redirects to
  the correct tenant, SPA client and delegated API scope. The sign-in screen fits 390×844 and
  desktop. Completing an actual user's sign-in and callback still needs a manual check.
