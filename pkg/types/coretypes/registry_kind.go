package coretypes

var Kinds = []Kind{
	KindAnonymous,
	KindOrganization,
	KindRole,
	KindServiceAccount,
	KindUser,
	KindNotificationChannel,
	KindRoutePolicy,
	KindApdexSetting,
	KindAuthDomain,
	KindSession,
	KindCloudIntegration,
	KindCloudIntegrationService,
	KindIntegration,
	KindDashboard,
	KindPublicDashboard,
	KindIngestionKey,
	KindIngestionLimit,
	KindPipeline,
	KindUserPreference,
	KindOrgPreference,
	KindQuickFilter,
	KindTTLSetting,
	KindRule,
	KindPlannedMaintenance,
	KindSavedView,
	KindTraceFunnel,
	KindFactorPassword,
	KindFactorAPIKey,
	KindLicense,
	KindSubscription,
	KindLogs,
	KindTraces,
	KindMetrics,
	KindAuditLogs,
	KindMeterMetrics,
	KindLogsField,
	KindTracesField,
}

var (
	KindAnonymous               Kind = MustNewKind("anonymous")
	KindOrganization                 = MustNewKind("organization")
	KindRole                         = MustNewKind("role")
	KindServiceAccount               = MustNewKind("serviceaccount")
	KindUser                         = MustNewKind("user")
	KindNotificationChannel          = MustNewKind("notification-channel")
	KindRoutePolicy                  = MustNewKind("route-policy")
	KindApdexSetting                 = MustNewKind("apdex-setting")
	KindAuthDomain                   = MustNewKind("auth-domain")
	KindSession                      = MustNewKind("session")
	KindCloudIntegration             = MustNewKind("cloud-integration")
	KindCloudIntegrationService      = MustNewKind("cloud-integration-service")
	KindIntegration                  = MustNewKind("integration")
	KindDashboard                    = MustNewKind("dashboard")
	KindPublicDashboard              = MustNewKind("public-dashboard")
	KindIngestionKey                 = MustNewKind("ingestion-key")
	KindIngestionLimit               = MustNewKind("ingestion-limit")
	KindPipeline                     = MustNewKind("pipeline")
	KindUserPreference               = MustNewKind("user-preference")
	KindOrgPreference                = MustNewKind("org-preference")
	KindQuickFilter                  = MustNewKind("quick-filter")
	KindTTLSetting                   = MustNewKind("ttl-setting")
	KindRule                         = MustNewKind("rule")
	KindPlannedMaintenance           = MustNewKind("planned-maintenance")
	KindSavedView                    = MustNewKind("saved-view")
	KindTraceFunnel                  = MustNewKind("trace-funnel")
	KindFactorPassword               = MustNewKind("factor-password")
	KindFactorAPIKey                 = MustNewKind("factor-api-key")
	KindLicense                      = MustNewKind("license")
	KindSubscription                 = MustNewKind("subscription")
	KindLogs                         = MustNewKind("logs")
	KindTraces                       = MustNewKind("traces")
	KindMetrics                      = MustNewKind("metrics")
	KindAuditLogs                    = MustNewKind("audit-logs")
	KindMeterMetrics                 = MustNewKind("meter-metrics")
	KindLogsField                    = MustNewKind("logs-field")
	KindTracesField                  = MustNewKind("traces-field")
)
