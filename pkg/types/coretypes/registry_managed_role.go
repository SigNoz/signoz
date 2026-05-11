package coretypes

var (
	ManagedRoles = []string{
		SigNozAdminRoleName,
		SigNozEditorRoleName,
		SigNozViewerRoleName,
		SigNozAnonymousRoleName,
	}
)

const (
	SigNozAdminRoleName     string = "signoz-admin"
	SigNozEditorRoleName    string = "signoz-editor"
	SigNozViewerRoleName    string = "signoz-viewer"
	SigNozAnonymousRoleName string = "signoz-anonymous"
)

var ManagedRoleToTransactions = map[string][]Transaction{
	SigNozAdminRoleName: {
		// role attach — admin can attach/detach role assignments
		{Verb: VerbAttach, Object: *MustNewObject(ResourceRef{Type: TypeRole, Kind: KindRole}, WildCardSelectorString)},
		// user attach — admin can attach roles to any user
		{Verb: VerbAttach, Object: *MustNewObject(ResourceRef{Type: TypeUser, Kind: KindUser}, WildCardSelectorString)},
		// serviceaccount attach — admin can attach roles to any SA
		{Verb: VerbAttach, Object: *MustNewObject(ResourceRef{Type: TypeServiceAccount, Kind: KindServiceAccount}, WildCardSelectorString)},
		// auth-domain — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindAuthDomain}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindAuthDomain}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindAuthDomain}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindAuthDomain}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindAuthDomain}, WildCardSelectorString)},
		// cloud-integration — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindCloudIntegration}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindCloudIntegration}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindCloudIntegration}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindCloudIntegration}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindCloudIntegration}, WildCardSelectorString)},
		// cloud-integration-service — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindCloudIntegrationService}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindCloudIntegrationService}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindCloudIntegrationService}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindCloudIntegrationService}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindCloudIntegrationService}, WildCardSelectorString)},
		// integration — viewer/editor/admin (install/uninstall via ViewAccess)
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIntegration}, WildCardSelectorString)},
		// factor-api-key — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindFactorAPIKey}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindFactorAPIKey}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindFactorAPIKey}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindFactorAPIKey}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindFactorAPIKey}, WildCardSelectorString)},
		// factor-password — admin can issue and inspect reset tokens; users change their own password via OpenAccess
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindFactorPassword}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindFactorPassword}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindFactorPassword}, WildCardSelectorString)},
		// license — admin only.
		// Uniform LCRUD shape; actual ee routes are POST /api/v3/licenses (create
		// = Activate), PUT /api/v3/licenses (update = Refresh), GET
		// /api/v3/licenses/active (read; currently exposed as ViewAccess on the
		// route side). delete and list are placeholders for shape parity, no
		// route serves them today.
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindLicense}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindLicense}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindLicense}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindLicense}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindLicense}, WildCardSelectorString)},
		// subscription — admin only.
		// Uniform LCRUD shape; actual ee routes are POST /api/v1/checkout
		// (create), POST /api/v1/portal (update — opens Stripe portal), GET
		// /api/v1/billing (read — current billing state). delete and list are
		// placeholders for shape parity; cancellation flows through Stripe's
		// portal, no in-process route serves them.
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSubscription}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSubscription}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSubscription}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindSubscription}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindSubscription}, WildCardSelectorString)},
		// organization — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeOrganization, Kind: KindOrganization}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeOrganization, Kind: KindOrganization}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindOrganization}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindOrganization}, WildCardSelectorString)},
		// org-preference — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindOrgPreference}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindOrgPreference}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindOrgPreference}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindOrgPreference}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindOrgPreference}, WildCardSelectorString)},
		// public-dashboard — admin manages, anonymous reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPublicDashboard}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPublicDashboard}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPublicDashboard}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPublicDashboard}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPublicDashboard}, WildCardSelectorString)},
		// role — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeRole, Kind: KindRole}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeRole, Kind: KindRole}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeRole, Kind: KindRole}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRole}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRole}, WildCardSelectorString)},
		// serviceaccount — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeServiceAccount, Kind: KindServiceAccount}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeServiceAccount, Kind: KindServiceAccount}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeServiceAccount, Kind: KindServiceAccount}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindServiceAccount}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindServiceAccount}, WildCardSelectorString)},
		// session — admin can revoke and list
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSession}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSession}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindSession}, WildCardSelectorString)},
		// user — admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeUser, Kind: KindUser}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeUser, Kind: KindUser}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeUser, Kind: KindUser}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindUser}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindUser}, WildCardSelectorString)},
		// dashboard — full CRUD (also held by editor)
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindDashboard}, WildCardSelectorString)},
		// pipeline — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPipeline}, WildCardSelectorString)},
		// planned-maintenance — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		// rule — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRule}, WildCardSelectorString)},
		// saved-view — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindSavedView}, WildCardSelectorString)},
		// trace-funnel — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTraceFunnel}, WildCardSelectorString)},
		// ingestion-key — editor+admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionKey}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionKey}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionKey}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIngestionKey}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIngestionKey}, WildCardSelectorString)},
		// ingestion-limit — editor+admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionLimit}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionLimit}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionLimit}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIngestionLimit}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIngestionLimit}, WildCardSelectorString)},
		// notification-channel — admin writes, viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindNotificationChannel}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindNotificationChannel}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindNotificationChannel}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindNotificationChannel}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindNotificationChannel}, WildCardSelectorString)},
		// route-policy — admin writes, viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRoutePolicy}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRoutePolicy}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRoutePolicy}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRoutePolicy}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRoutePolicy}, WildCardSelectorString)},
		// apdex-setting — admin updates, viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindApdexSetting}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindApdexSetting}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindApdexSetting}, WildCardSelectorString)},
		// quick-filter — admin updates, viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindQuickFilter}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindQuickFilter}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindQuickFilter}, WildCardSelectorString)},
		// ttl-setting — admin updates, viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTTLSetting}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTTLSetting}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTTLSetting}, WildCardSelectorString)},
		// user-preference — every authenticated user can read+update their own
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindUserPreference}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindUserPreference}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindUserPreference}, WildCardSelectorString)},
		// telemetry — read on each signal (logs/traces/metrics); schema permits read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindLogs}, WildCardSelectorString)},
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindTraces}, WildCardSelectorString)},
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindMetrics}, WildCardSelectorString)},
		// audit-logs and meter-metrics — admin-only read; sensitive source-qualified streams
		// (signal=logs source=audit; signal=metrics source=meter). Start admin-only;
		// widen to viewer/editor only on explicit ask (compliance/auditor flow).
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindAuditLogs}, WildCardSelectorString)},
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindMeterMetrics}, WildCardSelectorString)},
		// logs-field — editor+admin update (POST overwrites field config), viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindLogsField}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindLogsField}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindLogsField}, WildCardSelectorString)},
		// traces-field — editor+admin update, viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTracesField}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTracesField}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTracesField}, WildCardSelectorString)},
	},
	SigNozEditorRoleName: {
		// dashboard — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindDashboard}, WildCardSelectorString)},
		// pipeline — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPipeline}, WildCardSelectorString)},
		// planned-maintenance — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		// rule — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRule}, WildCardSelectorString)},
		// saved-view — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindSavedView}, WildCardSelectorString)},
		// trace-funnel — full CRUD
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTraceFunnel}, WildCardSelectorString)},
		// integration — viewer/editor/admin
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIntegration}, WildCardSelectorString)},
		// ingestion-key — editor+admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionKey}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionKey}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionKey}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIngestionKey}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIngestionKey}, WildCardSelectorString)},
		// ingestion-limit — editor+admin only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionLimit}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionLimit}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIngestionLimit}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIngestionLimit}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIngestionLimit}, WildCardSelectorString)},
		// notification-channel — read only (admin writes)
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindNotificationChannel}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindNotificationChannel}, WildCardSelectorString)},
		// route-policy — read only (admin writes)
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRoutePolicy}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRoutePolicy}, WildCardSelectorString)},
		// apdex-setting — read only (admin updates)
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindApdexSetting}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindApdexSetting}, WildCardSelectorString)},
		// quick-filter — read only (admin updates)
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindQuickFilter}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindQuickFilter}, WildCardSelectorString)},
		// ttl-setting — read only (admin updates)
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTTLSetting}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTTLSetting}, WildCardSelectorString)},
		// user-preference — every authenticated user can read+update their own
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindUserPreference}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindUserPreference}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindUserPreference}, WildCardSelectorString)},
		// telemetry — read on each signal
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindLogs}, WildCardSelectorString)},
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindTraces}, WildCardSelectorString)},
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindMetrics}, WildCardSelectorString)},
		// logs-field — editor reads+updates
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindLogsField}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindLogsField}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindLogsField}, WildCardSelectorString)},
		// traces-field — editor reads+updates
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTracesField}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTracesField}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTracesField}, WildCardSelectorString)},
	},
	SigNozViewerRoleName: {
		// dashboard — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindDashboard}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindDashboard}, WildCardSelectorString)},
		// pipeline — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPipeline}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPipeline}, WildCardSelectorString)},
		// planned-maintenance — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindPlannedMaintenance}, WildCardSelectorString)},
		// rule — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRule}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRule}, WildCardSelectorString)},
		// saved-view — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindSavedView}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindSavedView}, WildCardSelectorString)},
		// trace-funnel — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTraceFunnel}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTraceFunnel}, WildCardSelectorString)},
		// integration — viewer/editor/admin (install/uninstall via ViewAccess)
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbDelete, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIntegration}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindIntegration}, WildCardSelectorString)},
		// notification-channel — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindNotificationChannel}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindNotificationChannel}, WildCardSelectorString)},
		// route-policy — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindRoutePolicy}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindRoutePolicy}, WildCardSelectorString)},
		// apdex-setting — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindApdexSetting}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindApdexSetting}, WildCardSelectorString)},
		// quick-filter — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindQuickFilter}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindQuickFilter}, WildCardSelectorString)},
		// ttl-setting — read only
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTTLSetting}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTTLSetting}, WildCardSelectorString)},
		// user-preference — every authenticated user can read+update their own
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindUserPreference}, WildCardSelectorString)},
		{Verb: VerbUpdate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindUserPreference}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindUserPreference}, WildCardSelectorString)},
		// telemetry — read on each signal
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindLogs}, WildCardSelectorString)},
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindTraces}, WildCardSelectorString)},
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeTelemetryResource, Kind: KindMetrics}, WildCardSelectorString)},
		// logs-field — viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindLogsField}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindLogsField}, WildCardSelectorString)},
		// traces-field — viewer reads
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindTracesField}, WildCardSelectorString)},
		{Verb: VerbList, Object: *MustNewObject(ResourceRef{Type: TypeMetaResources, Kind: KindTracesField}, WildCardSelectorString)},
	},
	SigNozAnonymousRoleName: {
		// public-dashboard — anonymous read
		{Verb: VerbRead, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPublicDashboard}, WildCardSelectorString)},
	},
}
