param([string]$TenantId = 'bd4bd237-f885-4525-b60d-581adb48c358')
$ErrorActionPreference = 'Stop'
function Invoke-AzJson([string[]]$Arguments) {
  $result = & az @Arguments --only-show-errors -o json
  if ($LASTEXITCODE -ne 0) { throw "Azure command failed: $($Arguments[0..1] -join ' ')" }
  if ($result) { $result | ConvertFrom-Json }
}
function Write-GraphBody($Body, [string]$Name) {
  $path = Join-Path $PSScriptRoot "../.azure-local/$Name.json"
  [IO.File]::WriteAllText($path, ($Body | ConvertTo-Json -Depth 20))
  return "@$path"
}
$null = New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot '../.azure-local')
$account = Invoke-AzJson @('account', 'show', '--subscription', 'Sprinta Intern')
if ($account.tenantId -ne $TenantId) { throw 'Wrong tenant for Sprinta Intern.' }
function Get-OrCreateApp([string]$Name) {
  $apps = @(Invoke-AzJson @('ad', 'app', 'list', '--display-name', $Name) | Where-Object displayName -eq $Name)
  if ($apps.Count -gt 1) { throw "Multiple apps named $Name" }
  if ($apps.Count -eq 1) { return $apps[0] }
  Invoke-AzJson @('ad', 'app', 'create', '--display-name', $Name, '--sign-in-audience', 'AzureADMyOrg')
}
$api = Get-OrCreateApp 'jambiz-advent-api'
$spa = Get-OrCreateApp 'jambiz-advent-spa'
$scopeId = if ($api.api.oauth2PermissionScopes.Count) { $api.api.oauth2PermissionScopes[0].id } else { [guid]::NewGuid().ToString() }
$scope = @{
  id = $scopeId; value = 'access_as_user'; type = 'User'; isEnabled = $true
  adminConsentDisplayName = 'Play the Jambiz advent calendar'
  adminConsentDescription = 'Read calendar content and save your own progress and scoreboard results.'
  userConsentDisplayName = 'Play the Jambiz advent calendar'
  userConsentDescription = 'Read calendar content and save your progress and scoreboard results.'
}
$body = Write-GraphBody @{
  identifierUris = @("api://$($api.appId)")
  api = @{ requestedAccessTokenVersion = 2; oauth2PermissionScopes = @($scope) }
} 'api-registration'
$null = Invoke-AzJson @('rest', '--method', 'PATCH', '--url', "https://graph.microsoft.com/v1.0/applications/$($api.id)", '--body', $body)
$body = Write-GraphBody @{
  api = @{ preAuthorizedApplications = @(@{ appId = $spa.appId; delegatedPermissionIds = @($scopeId) }) }
} 'api-preauthorization'
$null = Invoke-AzJson @('rest', '--method', 'PATCH', '--url', "https://graph.microsoft.com/v1.0/applications/$($api.id)", '--body', $body)
$body = Write-GraphBody @{
  spa = @{ redirectUris = @(@('http://localhost:4200') + @($spa.spa.redirectUris) | Where-Object { $_ } | Sort-Object -Unique) }
  requiredResourceAccess = @(@{ resourceAppId = $api.appId; resourceAccess = @(@{ id = $scopeId; type = 'Scope' }) })
} 'spa-registration'
$null = Invoke-AzJson @('rest', '--method', 'PATCH', '--url', "https://graph.microsoft.com/v1.0/applications/$($spa.id)", '--body', $body)
foreach ($app in @($api, $spa)) {
  $principal = Invoke-AzJson @('ad', 'sp', 'list', '--filter', "appId eq '$($app.appId)'")
  if (!$principal) { $null = Invoke-AzJson @('ad', 'sp', 'create', '--id', $app.appId) }
}
$result = @{ tenantId = $TenantId; apiClientId = $api.appId; spaClientId = $spa.appId; apiObjectId = $api.id; spaObjectId = $spa.id; scopeId = $scopeId }
$result | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot '../.azure-local/entra.json')
$result | ConvertTo-Json
