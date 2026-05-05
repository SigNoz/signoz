package coretypes

var Resources = []Resource{
	ResourceAnonymous,
	ResourceOrganization,
	ResourceRole,
	ResourceServiceAccount,
	ResourceUser,
	ResourceMetaResourcesRole,
	ResourceMetaResourcesOrganization,
	ResourceMetaResourcesServiceAccount,
	ResourceMetaResourcesServiceAccount,
	ResourceMetaResourcesUser,
	ResourceMetaResourceNotificationChannel,
	ResourceMetaResourcesNotificationChannel,
	ResourceMetaResourceRoutePolicy,
	ResourceMetaResourcesRoutePolicy,
	ResourceMetaResourceApdexSetting,
	ResourceMetaResourcesApdexSetting,
	ResourceMetaResourceAuthDomain,
	ResourceMetaResourcesAuthDomain,
	ResourceMetaResourceSession,
	ResourceMetaResourcesSession,
	ResourceMetaResourceCloudIntegration,
	ResourceMetaResourcesCloudIntegration,
	ResourceMetaResourceCloudIntegrationService,
	ResourceMetaResourcesCloudIntegrationService,
	ResourceMetaResourceIntegration,
	ResourceMetaResourcesIntegration,
	ResourceMetaResourceDashboard,
	ResourceMetaResourcesDashboard,
	ResourceMetaResourcePublicDashboard,
	ResourceMetaResourcesPublicDashboard,
	ResourceMetaResourceIngestionKey,
	ResourceMetaResourcesIngestionKey,
	ResourceMetaResourceIngestionLimit,
	ResourceMetaResourcesIngestionLimit,
	ResourceMetaResourcePipeline,
	ResourceMetaResourcesPipeline,
	ResourceMetaResourceUserPreference,
	ResourceMetaResourcesUserPreference,
	ResourceMetaResourceOrgPreference,
	ResourceMetaResourcesOrgPreference,
	ResourceMetaResourceQuickFilter,
	ResourceMetaResourcesQuickFilter,
	ResourceMetaResourceTTLSetting,
	ResourceMetaResourcesTTLSetting,
	ResourceMetaResourceRule,
	ResourceMetaResourcesRule,
	ResourceMetaResourcePlannedMaintenance,
	ResourceMetaResourcesPlannedMaintenance,
	ResourceMetaResourceSavedView,
	ResourceMetaResourcesSavedView,
	ResourceMetaResourceTraceFunnel,
	ResourceMetaResourcesTraceFunnel,
	ResourceMetaResourceFactorPassword,
	ResourceMetaResourcesFactorPassword,
	ResourceMetaResourceFactorAPIKey,
	ResourceMetaResourcesFactorAPIKey,
	ResourceMetaResourceLicense,
	ResourceMetaResourcesLicense,
	ResourceMetaResourceSubscription,
	ResourceMetaResourcesSubscription,
	ResourceTelemetryResourceLogs,
	ResourceTelemetryResourceTraces,
	ResourceTelemetryResourceMetrics,
	ResourceTelemetryResourceAuditLogs,
	ResourceTelemetryResourceMeterMetrics,
	ResourceMetaResourceLogsField,
	ResourceMetaResourcesLogsField,
	ResourceMetaResourceTracesField,
	ResourceMetaResourcesTracesField,
}

var (
	ResourceAnonymous                            Resource = NewResourceAnonymous()
	ResourceOrganization                                  = NewResourceOrganization()
	ResourceRole                                          = NewResourceRole()
	ResourceServiceAccount                                = NewResourceServiceAccount()
	ResourceUser                                          = NewResourceUser()
	ResourceMetaResourcesRole                             = NewResourceMetaResources(KindRole)
	ResourceMetaResourcesOrganization                     = NewResourceMetaResources(KindOrganization)
	ResourceMetaResourcesServiceAccount                   = NewResourceMetaResources(KindServiceAccount)
	ResourceMetaResourcesUser                             = NewResourceMetaResources(KindUser)
	ResourceMetaResourceNotificationChannel               = NewResourceMetaResource(KindNotificationChannel)
	ResourceMetaResourcesNotificationChannel              = NewResourceMetaResources(KindNotificationChannel)
	ResourceMetaResourceRoutePolicy                       = NewResourceMetaResource(KindRoutePolicy)
	ResourceMetaResourcesRoutePolicy                      = NewResourceMetaResources(KindRoutePolicy)
	ResourceMetaResourceApdexSetting                      = NewResourceMetaResource(KindApdexSetting)
	ResourceMetaResourcesApdexSetting                     = NewResourceMetaResources(KindApdexSetting)
	ResourceMetaResourceAuthDomain                        = NewResourceMetaResource(KindAuthDomain)
	ResourceMetaResourcesAuthDomain                       = NewResourceMetaResources(KindAuthDomain)
	ResourceMetaResourceSession                           = NewResourceMetaResource(KindSession)
	ResourceMetaResourcesSession                          = NewResourceMetaResources(KindSession)
	ResourceMetaResourceCloudIntegration                  = NewResourceMetaResource(KindCloudIntegration)
	ResourceMetaResourcesCloudIntegration                 = NewResourceMetaResources(KindCloudIntegration)
	ResourceMetaResourceCloudIntegrationService           = NewResourceMetaResource(KindCloudIntegrationService)
	ResourceMetaResourcesCloudIntegrationService          = NewResourceMetaResources(KindCloudIntegrationService)
	ResourceMetaResourceIntegration                       = NewResourceMetaResource(KindIntegration)
	ResourceMetaResourcesIntegration                      = NewResourceMetaResources(KindIntegration)
	ResourceMetaResourceDashboard                         = NewResourceMetaResource(KindDashboard)
	ResourceMetaResourcesDashboard                        = NewResourceMetaResources(KindDashboard)
	ResourceMetaResourcePublicDashboard                   = NewResourceMetaResource(KindPublicDashboard)
	ResourceMetaResourcesPublicDashboard                  = NewResourceMetaResources(KindPublicDashboard)
	ResourceMetaResourceIngestionKey                      = NewResourceMetaResource(KindIngestionKey)
	ResourceMetaResourcesIngestionKey                     = NewResourceMetaResources(KindIngestionKey)
	ResourceMetaResourceIngestionLimit                    = NewResourceMetaResource(KindIngestionLimit)
	ResourceMetaResourcesIngestionLimit                   = NewResourceMetaResources(KindIngestionLimit)
	ResourceMetaResourcePipeline                          = NewResourceMetaResource(KindPipeline)
	ResourceMetaResourcesPipeline                         = NewResourceMetaResources(KindPipeline)
	ResourceMetaResourceUserPreference                    = NewResourceMetaResource(KindUserPreference)
	ResourceMetaResourcesUserPreference                   = NewResourceMetaResources(KindUserPreference)
	ResourceMetaResourceOrgPreference                     = NewResourceMetaResource(KindOrgPreference)
	ResourceMetaResourcesOrgPreference                    = NewResourceMetaResources(KindOrgPreference)
	ResourceMetaResourceQuickFilter                       = NewResourceMetaResource(KindQuickFilter)
	ResourceMetaResourcesQuickFilter                      = NewResourceMetaResources(KindQuickFilter)
	ResourceMetaResourceTTLSetting                        = NewResourceMetaResource(KindTTLSetting)
	ResourceMetaResourcesTTLSetting                       = NewResourceMetaResources(KindTTLSetting)
	ResourceMetaResourceRule                              = NewResourceMetaResource(KindRule)
	ResourceMetaResourcesRule                             = NewResourceMetaResources(KindRule)
	ResourceMetaResourcePlannedMaintenance                = NewResourceMetaResource(KindPlannedMaintenance)
	ResourceMetaResourcesPlannedMaintenance               = NewResourceMetaResources(KindPlannedMaintenance)
	ResourceMetaResourceSavedView                         = NewResourceMetaResource(KindSavedView)
	ResourceMetaResourcesSavedView                        = NewResourceMetaResources(KindSavedView)
	ResourceMetaResourceTraceFunnel                       = NewResourceMetaResource(KindTraceFunnel)
	ResourceMetaResourcesTraceFunnel                      = NewResourceMetaResources(KindTraceFunnel)
	ResourceMetaResourceFactorPassword                    = NewResourceMetaResource(KindFactorPassword)
	ResourceMetaResourcesFactorPassword                   = NewResourceMetaResources(KindFactorPassword)
	ResourceMetaResourceFactorAPIKey                      = NewResourceMetaResource(KindFactorAPIKey)
	ResourceMetaResourcesFactorAPIKey                     = NewResourceMetaResources(KindFactorAPIKey)
	ResourceMetaResourceLicense                           = NewResourceMetaResource(KindLicense)
	ResourceMetaResourcesLicense                          = NewResourceMetaResources(KindLicense)
	ResourceMetaResourceSubscription                      = NewResourceMetaResource(KindSubscription)
	ResourceMetaResourcesSubscription                     = NewResourceMetaResources(KindSubscription)
	ResourceTelemetryResourceLogs                         = NewResourceTelemetryResource(KindLogs)
	ResourceTelemetryResourceTraces                       = NewResourceTelemetryResource(KindTraces)
	ResourceTelemetryResourceMetrics                      = NewResourceTelemetryResource(KindMetrics)
	ResourceTelemetryResourceAuditLogs                    = NewResourceTelemetryResource(KindAuditLogs)
	ResourceTelemetryResourceMeterMetrics                 = NewResourceTelemetryResource(KindMeterMetrics)
	ResourceMetaResourceLogsField                         = NewResourceMetaResource(KindLogsField)
	ResourceMetaResourcesLogsField                        = NewResourceMetaResources(KindLogsField)
	ResourceMetaResourceTracesField                       = NewResourceMetaResource(KindTracesField)
	ResourceMetaResourcesTracesField                      = NewResourceMetaResources(KindTracesField)
)
