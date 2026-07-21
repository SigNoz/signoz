package signoz

import (
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/apdex"
	"github.com/SigNoz/signoz/pkg/modules/apdex/implapdex"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/modules/authdomain/implauthdomain"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/inframonitoring"
	"github.com/SigNoz/signoz/pkg/modules/inframonitoring/implinframonitoring"
	"github.com/SigNoz/signoz/pkg/modules/llmpricingrule"
	"github.com/SigNoz/signoz/pkg/modules/llmpricingrule/impllmpricingrule"
	"github.com/SigNoz/signoz/pkg/modules/logspipeline"
	"github.com/SigNoz/signoz/pkg/modules/logspipeline/impllogspipeline"
	"github.com/SigNoz/signoz/pkg/modules/metricreductionrule"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer/implmetricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/preference/implpreference"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/modules/promote/implpromote"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter/implquickfilter"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport/implrawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/retention"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory/implrulestatehistory"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/modules/services"
	"github.com/SigNoz/signoz/pkg/modules/services/implservices"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/modules/session/implsession"
	"github.com/SigNoz/signoz/pkg/modules/spanmapper"
	"github.com/SigNoz/signoz/pkg/modules/spanmapper/implspanmapper"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile/implspanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/tag"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel/impltracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/ruler/rulestore/sqlrulestore"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type Modules struct {
	OrgGetter           organization.Getter
	OrgSetter           organization.Setter
	Preference          preference.Module
	UserSetter          user.Setter
	UserGetter          user.Getter
	RetentionGetter     retention.Getter
	SavedView           savedview.Module
	Apdex               apdex.Module
	Dashboard           dashboard.Module
	QuickFilter         quickfilter.Module
	TraceFunnel         tracefunnel.Module
	RawDataExport       rawdataexport.Module
	AuthDomain          authdomain.Module
	Session             session.Module
	Services            services.Module
	SpanPercentile      spanpercentile.Module
	MetricsExplorer     metricsexplorer.Module
	MetricReductionRule metricreductionrule.Module
	InfraMonitoring     inframonitoring.Module
	Promote              promote.Module
	ServiceAccount       serviceaccount.Module
	ServiceAccountGetter serviceaccount.Getter
	CloudIntegration     cloudintegration.Module
	LogsPipeline        logspipeline.Module
	RuleStateHistory    rulestatehistory.Module
	TraceDetail         tracedetail.Module
	SpanMapper          spanmapper.Module
	LLMPricingRule      llmpricingrule.Module
	Tag                 tag.Module
}

func NewModules(
	sqlstore sqlstore.SQLStore,
	tokenizer tokenizer.Tokenizer,
	emailing emailing.Emailing,
	providerSettings factory.ProviderSettings,
	orgGetter organization.Getter,
	alertmanager alertmanager.Alertmanager,
	analytics analytics.Analytics,
	querier querier.Querier,
	telemetryStore telemetrystore.TelemetryStore,
	telemetryMetadataStore telemetrytypes.MetadataStore,
	authNs map[authtypes.AuthNProvider]authn.AuthN,
	authz authz.AuthZ,
	cache cache.Cache,
	queryParser queryparser.QueryParser,
	config Config,
	dashboard dashboard.Module,
	userGetter user.Getter,
	userRoleStore authtypes.UserRoleStore,
	serviceAccount serviceaccount.Module,
	serviceAccountGetter serviceaccount.Getter,
	cloudIntegrationModule cloudintegration.Module,
	retentionGetter retention.Getter,
	fl flagger.Flagger,
	tagModule tag.Module,
	metricReductionRule metricreductionrule.Module,
) Modules {
	quickfilter := implquickfilter.NewModule(implquickfilter.NewStore(sqlstore))
	orgSetter := implorganization.NewSetter(implorganization.NewStore(sqlstore), alertmanager, quickfilter)
	// Cleanup callbacks from other modules, invoked when a user is deleted.
	onDeleteUser := []user.OnDeleteUser{
		dashboard.DeletePreferencesForUser,
	}
	userSetter := impluser.NewSetter(impluser.NewStore(sqlstore, providerSettings), tokenizer, emailing, providerSettings, orgSetter, authz, analytics, config.User, userRoleStore, userGetter, onDeleteUser)
	ruleStore := sqlrulestore.NewRuleStore(sqlstore, queryParser, providerSettings)
	authDomainModule := implauthdomain.NewModule(implauthdomain.NewStore(sqlstore), authNs, authz)

	return Modules{
		OrgGetter:           orgGetter,
		OrgSetter:           orgSetter,
		Preference:          implpreference.NewModule(implpreference.NewStore(sqlstore), preferencetypes.NewAvailablePreference()),
		SavedView:           implsavedview.NewModule(sqlstore),
		Apdex:               implapdex.NewModule(sqlstore),
		Dashboard:           dashboard,
		UserSetter:          userSetter,
		UserGetter:          userGetter,
		RetentionGetter:     retentionGetter,
		QuickFilter:         quickfilter,
		TraceFunnel:         impltracefunnel.NewModule(impltracefunnel.NewStore(sqlstore)),
		RawDataExport:       implrawdataexport.NewModule(querier),
		AuthDomain:          authDomainModule,
		Session:             implsession.NewModule(providerSettings, authNs, userSetter, userGetter, authDomainModule, tokenizer, orgGetter, authz, config.Global),
		SpanPercentile:      implspanpercentile.NewModule(querier, providerSettings),
		Services:            implservices.NewModule(querier, telemetryStore),
		MetricsExplorer:     implmetricsexplorer.NewModule(telemetryStore, telemetryMetadataStore, cache, ruleStore, dashboard, fl, providerSettings, config.MetricsExplorer),
		MetricReductionRule: metricReductionRule,
		InfraMonitoring:     implinframonitoring.NewModule(telemetryStore, telemetryMetadataStore, querier, fl, providerSettings, config.InfraMonitoring),
		Promote:             implpromote.NewModule(telemetryMetadataStore, telemetryStore),
		ServiceAccount:       serviceAccount,
		ServiceAccountGetter: serviceAccountGetter,
		LogsPipeline:        impllogspipeline.NewModule(sqlstore),
		RuleStateHistory:    implrulestatehistory.NewModule(implrulestatehistory.NewStore(telemetryStore, telemetryMetadataStore, providerSettings.Logger)),
		CloudIntegration:    cloudIntegrationModule,
		TraceDetail:         impltracedetail.NewModule(impltracedetail.NewTraceStore(telemetryStore), providerSettings, config.TraceDetail),
		SpanMapper:          implspanmapper.NewModule(implspanmapper.NewStore(sqlstore), fl),
		LLMPricingRule:      impllmpricingrule.NewModule(impllmpricingrule.NewStore(sqlstore), fl, querier),
		Tag:                 tagModule,
	}
}
