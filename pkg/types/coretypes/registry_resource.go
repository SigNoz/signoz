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
	ResourceMetaResourceDeploymentHost,
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
	ResourceMetaResourceDashboard                        = NewResourceMetaResource(KindDashboard, VerbCreate, VerbList, VerbRead, VerbUpdate, VerbDelete)
	ResourceMetaResourcePublicDashboard                  = NewResourceMetaResource(KindPublicDashboard)
	ResourceMetaResourceIngestionKey                     = NewResourceMetaResource(KindIngestionKey)
	ResourceMetaResourceIngestionLimit                   = NewResourceMetaResource(KindIngestionLimit)
	ResourceMetaResourcePipeline                         = NewResourceMetaResource(KindPipeline)
	ResourceMetaResourceUserPreference                   = NewResourceMetaResource(KindUserPreference)
	ResourceMetaResourceOrgPreference                    = NewResourceMetaResource(KindOrgPreference)
	ResourceMetaResourceQuickFilter                      = NewResourceMetaResource(KindQuickFilter, VerbList, VerbRead, VerbUpdate)
	ResourceMetaResourceTTLSetting                       = NewResourceMetaResource(KindTTLSetting)
	ResourceMetaResourceRule                             = NewResourceMetaResource(KindRule)
	ResourceMetaResourcePlannedMaintenance               = NewResourceMetaResource(KindPlannedMaintenance)
	ResourceMetaResourceSavedView                        = NewResourceMetaResource(KindSavedView, VerbCreate, VerbList, VerbRead, VerbUpdate, VerbDelete)
	ResourceMetaResourceTraceFunnel                      = NewResourceMetaResource(KindTraceFunnel)
	ResourceMetaResourceFactorPassword                   = NewResourceMetaResource(KindFactorPassword)
	ResourceMetaResourceFactorAPIKey                     = NewResourceMetaResource(KindFactorAPIKey, VerbCreate, VerbList, VerbRead, VerbUpdate, VerbDelete)
	ResourceMetaResourceLicense                          = NewResourceMetaResource(KindLicense, VerbCreate, VerbList, VerbRead, VerbUpdate, VerbDelete)
	ResourceMetaResourceSubscription                     = NewResourceMetaResource(KindSubscription)
	ResourceMetaResourceDeploymentHost                   = NewResourceMetaResource(KindDeploymentHost, VerbList, VerbUpdate)
	ResourceTelemetryResourceLogs                        = NewResourceTelemetryResource(KindLogs)
	ResourceTelemetryResourceTraces                      = NewResourceTelemetryResource(KindTraces)
	ResourceTelemetryResourceMetrics                     = NewResourceTelemetryResource(KindMetrics)
	ResourceTelemetryResourceAuditLogs                   = NewResourceTelemetryResource(KindAuditLogs)
	ResourceTelemetryResourceMeterMetrics                = NewResourceTelemetryResource(KindMeterMetrics)
	ResourceMetaResourceLogsField                        = NewResourceMetaResource(KindLogsField)
	ResourceMetaResourceTracesField                      = NewResourceMetaResource(KindTracesField)
)
