targetScope = 'resourceGroup'
param location string = 'swedencentral'
param tenantId string = 'bd4bd237-f885-4525-b60d-581adb48c358'
param apiClientId string
param spaClientId string
var suffix = take(uniqueString(resourceGroup().id), 8)
var tags = { product: 'jambiz-advent', environment: 'develop', managedBy: 'bicep' }

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stadvent${suffix}'
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: { minimumTlsVersion: 'TLS1_2', allowBlobPublicAccess: false, supportsHttpsTrafficOnly: true }
  resource blobs 'blobServices' = {
    name: 'default'
    resource packages 'containers' = {
      name: 'app-package'
      properties: { publicAccess: 'None' }
    }
  }
}
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'cosmos-jambiz-advent-${suffix}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [{ name: 'EnableServerless' }]
    locations: [{ locationName: location, failoverPriority: 0 }]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    disableLocalAuth: true
    minimalTlsVersion: 'Tls12'
  }
  resource database 'sqlDatabases' = {
    name: 'advent'
    properties: { resource: { id: 'advent' } }
    resource calendar 'containers' = {
      name: 'calendar'
      properties: {
        resource: {
          id: 'calendar'
          partitionKey: { paths: ['/season'], kind: 'Hash' }
          defaultTtl: -1
        }
      }
    }
  }
}
resource swa 'Microsoft.Web/staticSites@2025-03-01' = {
  name: 'swa-jambiz-advent-develop'
  location: 'westeurope'
  tags: tags
  sku: { name: 'Free', tier: 'Free' }
  properties: { stagingEnvironmentPolicy: 'Disabled' }
}
resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: 'plan-jambiz-advent-${suffix}'
  location: location
  tags: tags
  sku: { name: 'FC1', tier: 'FlexConsumption' }
  kind: 'functionapp'
  properties: { reserved: true }
}
var storageConnection = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
resource api 'Microsoft.Web/sites@2024-04-01' = {
  name: 'func-jambiz-advent-${suffix}'
  location: location
  tags: tags
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      cors: { allowedOrigins: ['https://${swa.properties.defaultHostname}', 'https://jambizadvent.se', 'http://localhost:4200'] }
    }
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}app-package'
          authentication: { type: 'StorageAccountConnectionString', storageAccountConnectionStringName: 'DEPLOYMENT_STORAGE_CONNECTION_STRING' }
        }
      }
      runtime: { name: 'dotnet-isolated', version: '10.0' }
      scaleAndConcurrency: { maximumInstanceCount: 40, instanceMemoryMB: 512 }
    }
  }
  resource settings 'config' = {
    name: 'appsettings'
    properties: {
      AzureWebJobsStorage: storageConnection
      DEPLOYMENT_STORAGE_CONNECTION_STRING: storageConnection
      Authentication__TenantId: tenantId
      Authentication__Audience: apiClientId
      Authentication__SpaClientId: spaClientId
      Cosmos__Endpoint: cosmos.properties.documentEndpoint
      Cosmos__Database: 'advent'
    }
  }
}
resource cosmosRole 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmos
  name: guid(cosmos.id, api.id, 'data-contributor')
  properties: {
    principalId: api.identity.principalId
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    scope: '${cosmos.id}/dbs/advent'
  }
}
output functionName string = api.name
output apiBaseUrl string = 'https://${api.properties.defaultHostName}'
output staticSiteName string = swa.name
output siteUrl string = 'https://${swa.properties.defaultHostname}'
output cosmosName string = cosmos.name
