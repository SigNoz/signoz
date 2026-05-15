package coretypes

var Resources = []Resource{
	ResourceAnonymous,
	ResourceOrganization,
	ResourceRole,
	ResourceServiceAccount,
	ResourceUser,
	ResourceMetaResourceNotificationChannel,
	ResourceMetaResourceRoutePolicy,
	ResourceMetaResourceApdexSetting,
	ResourceMetaResourceAuthDomain,
	ResourceMetaResourceSession,
	ResourceMetaResourceCloudIntegration,
	ResourceMetaResourceCloudIntegrationService,
	ResourceMetaResourceIntegration,
	ResourceMetaResourceDashboard,
	ResourceMetaResourcePublicDashboard,
	ResourceMetaResourceIngestionKey,
	ResourceMetaResourceIngestionLimit,
	ResourceMetaResourcePipeline,
	ResourceMetaResourceUserPreference,
	ResourceMetaResourceOrgPreference,
	ResourceMetaResourceQuickFilter,
	ResourceMetaResourceTTLSetting,
	ResourceMetaResourceRule,
	ResourceMetaResourcePlannedMaintenance,
	ResourceMetaResourceSavedView,
	ResourceMetaResourceTraceFunnel,
	ResourceMetaResourceFactorPassword,
	ResourceMetaResourceFactorAPIKey,
	ResourceMetaResourceLicense,
	ResourceMetaResourceSubscription,
	ResourceTelemetryResourceLogs,
	ResourceTelemetryResourceTraces,
	ResourceTelemetryResourceMetrics,
	ResourceTelemetryResourceAuditLogs,
	ResourceTelemetryResourceMeterMetrics,
	ResourceMetaResourceLogsField,
	ResourceMetaResourceTracesField,
}

var (
	ResourceAnonymous                           Resource = NewResourceAnonymous()
	ResourceOrganization                                 = NewResourceOrganization()
	ResourceRole                                         = NewResourceRole()
	ResourceServiceAccount                               = NewResourceServiceAccount()
	ResourceUser                                         = NewResourceUser()
	ResourceMetaResourceNotificationChannel              = NewResourceMetaResource(KindNotificationChannel)
	ResourceMetaResourceRoutePolicy                      = NewResourceMetaResource(KindRoutePolicy)
	ResourceMetaResourceApdexSetting                     = NewResourceMetaResource(KindApdexSetting)
	ResourceMetaResourceAuthDomain                       = NewResourceMetaResource(KindAuthDomain)
	ResourceMetaResourceSession                          = NewResourceMetaResource(KindSession)
	ResourceMetaResourceCloudIntegration                 = NewResourceMetaResource(KindCloudIntegration)
	ResourceMetaResourceCloudIntegrationService          = NewResourceMetaResource(KindCloudIntegrationService)
	ResourceMetaResourceIntegration                      = NewResourceMetaResource(KindIntegration)
	ResourceMetaResourceDashboard                        = NewResourceMetaResource(KindDashboard)
	ResourceMetaResourcePublicDashboard                  = NewResourceMetaResource(KindPublicDashboard)
	ResourceMetaResourceIngestionKey                     = NewResourceMetaResource(KindIngestionKey)
	ResourceMetaResourceIngestionLimit                   = NewResourceMetaResource(KindIngestionLimit)
	ResourceMetaResourcePipeline                         = NewResourceMetaResource(KindPipeline)
	ResourceMetaResourceUserPreference                   = NewResourceMetaResource(KindUserPreference)
	ResourceMetaResourceOrgPreference                    = NewResourceMetaResource(KindOrgPreference)
	ResourceMetaResourceQuickFilter                      = NewResourceMetaResource(KindQuickFilter)
	ResourceMetaResourceTTLSetting                       = NewResourceMetaResource(KindTTLSetting)
	ResourceMetaResourceRule                             = NewResourceMetaResource(KindRule)
	ResourceMetaResourcePlannedMaintenance               = NewResourceMetaResource(KindPlannedMaintenance)
	ResourceMetaResourceSavedView                        = NewResourceMetaResource(KindSavedView)
	ResourceMetaResourceTraceFunnel                      = NewResourceMetaResource(KindTraceFunnel)
	ResourceMetaResourceFactorPassword                   = NewResourceMetaResource(KindFactorPassword)
	ResourceMetaResourceFactorAPIKey                     = NewResourceMetaResource(KindFactorAPIKey)
	ResourceMetaResourceLicense                          = NewResourceMetaResource(KindLicense)
	ResourceMetaResourceSubscription                     = NewResourceMetaResource(KindSubscription)
	ResourceTelemetryResourceLogs                        = NewResourceTelemetryResource(KindLogs)
	ResourceTelemetryResourceTraces                      = NewResourceTelemetryResource(KindTraces)
	ResourceTelemetryResourceMetrics                     = NewResourceTelemetryResource(KindMetrics)
	ResourceTelemetryResourceAuditLogs                   = NewResourceTelemetryResource(KindAuditLogs)
	ResourceTelemetryResourceMeterMetrics                = NewResourceTelemetryResource(KindMeterMetrics)
	ResourceMetaResourceLogsField                        = NewResourceMetaResource(KindLogsField)
	ResourceMetaResourceTracesField                      = NewResourceMetaResource(KindTracesField)
)
