param(
  [string]$Subscription = 'ffb12bea-8324-4344-8361-bdcf71f032d0',
  # Existing production group; Azure does not support renaming resource groups.
  [string]$ResourceGroup = 'rg-jambiz-advent-dev-swc',
  [switch]$Provision
)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
function Check([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed" } }
$null = New-Item -ItemType Directory -Force .azure-local
if (!(Test-Path .azure-local/entra.json)) { & ./scripts/configure-entra.ps1 }
$entra = Get-Content .azure-local/entra.json -Raw | ConvertFrom-Json
if ($Provision) {
  az group create --subscription $Subscription -n $ResourceGroup -l swedencentral --tags product=jambiz-advent environment=prod --only-show-errors -o none
  Check 'Create resource group'
  az deployment group create --subscription $Subscription -g $ResourceGroup -n calendar-backend --template-file infra/main.bicep --parameters apiClientId=$($entra.apiClientId) spaClientId=$($entra.spaClientId) --only-show-errors -o none
  Check 'Provision resources'
}
$outputs = az deployment group show --subscription $Subscription -g $ResourceGroup -n calendar-backend --query properties.outputs -o json | ConvertFrom-Json
Check 'Read deployment'
$config = @{ tenantId = $entra.tenantId; spaClientId = $entra.spaClientId; apiClientId = $entra.apiClientId; apiBaseUrl = $outputs.apiBaseUrl.value }
$config | ConvertTo-Json | Set-Content public/app-config.json
$app = az ad app show --id $entra.spaClientId -o json | ConvertFrom-Json
Check 'Read SPA registration'
$redirects = @(@($app.spa.redirectUris) + @($outputs.siteUrl.value, 'https://jambizadvent.se', 'http://localhost:4200') | Sort-Object -Unique)
@{ spa = @{ redirectUris = $redirects } } | ConvertTo-Json -Depth 5 | Set-Content .azure-local/redirects.json
az rest --method PATCH --url "https://graph.microsoft.com/v1.0/applications/$($entra.spaObjectId)" --body '@.azure-local/redirects.json' --only-show-errors -o none
Check 'Configure site redirect URI'

dotnet run --project tests/Jambiz.Advent.Tests.csproj
Check 'Backend tests'
dotnet publish api/Jambiz.Advent.Api.csproj -c Release -o .azure-local/api
Check 'Publish backend'
npx ng build --configuration production
Check 'Build frontend'
$zipPath = Join-Path (Get-Location) '.azure-local/api.zip'
if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath }
[IO.Compression.ZipFile]::CreateFromDirectory((Join-Path (Get-Location) '.azure-local/api'), $zipPath)
try {
  $env:SWA_CLI_DEPLOYMENT_TOKEN = az staticwebapp secrets list --subscription $Subscription -g $ResourceGroup -n $outputs.staticSiteName.value --query properties.apiKey -o tsv
  Check 'Get frontend deployment token'
  npx --yes @azure/static-web-apps-cli@2.1.0 deploy dist/jambiz-advent-calendar/browser --env production
  Check 'Deploy frontend'
} finally { Remove-Item Env:SWA_CLI_DEPLOYMENT_TOKEN -ErrorAction SilentlyContinue }
# Publish compatible game loaders before the backend migrates the calendar definitions.
az functionapp deployment source config-zip --subscription $Subscription -g $ResourceGroup -n $outputs.functionName.value --src $zipPath --build-remote false --only-show-errors -o none
Check 'Deploy backend'
Write-Output "Frontend: $($outputs.siteUrl.value)"
Write-Output "Backend: $($outputs.apiBaseUrl.value)"
