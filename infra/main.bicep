param location string = resourceGroup().location
param environmentName string = 'gyro'
param apiImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param webImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param webOrigin string = ''

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: 'acrdu6ob5u24hia6'
  scope: resourceGroup('rg-production')
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${environmentName}-logs'
  location: location
  properties: { retentionInDays: 30 }
  sku: { name: 'PerGB2018' }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${environmentName}-env'
  location: location
  properties: { appLogsConfiguration: { destination: 'log-analytics', logAnalyticsConfiguration: { customerId: logAnalytics.properties.customerId, sharedKey: logAnalytics.listKeys().primarySharedKey } } }
}

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${environmentName}-api'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: environment.id
    configuration: { ingress: { external: true, targetPort: 3001, transport: 'http', allowInsecure: false }, registries: [{ server: registry.properties.loginServer, identity: 'system' }] }
    template: { containers: [{ name: 'api', image: apiImage, env: [{ name: 'WEB_ORIGIN', value: webOrigin }], probes: [{ type: 'Liveness', httpGet: { path: '/health', port: 3001 }, initialDelaySeconds: 10, periodSeconds: 30 }] }] }
  }
  tags: { 'azd-service-name': 'api' }
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${environmentName}-web'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: environment.id
    configuration: { ingress: { external: true, targetPort: 3000, transport: 'http', allowInsecure: false }, registries: [{ server: registry.properties.loginServer, identity: 'system' }] }
    template: { containers: [{ name: 'web', image: webImage, env: [{ name: 'GYRO_API_URL', value: 'https://${api.properties.configuration.ingress.fqdn}' }], probes: [{ type: 'Liveness', httpGet: { path: '/', port: 3000 }, initialDelaySeconds: 5, periodSeconds: 30 }] }] }
  }
  tags: { 'azd-service-name': 'web' }
}

output apiUri string = 'https://${api.properties.configuration.ingress.fqdn}'
output webUri string = 'https://${web.properties.configuration.ingress.fqdn}'
