package signoz

import (
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/authz/signozauthzapi"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/global/signozglobal"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/apdex"
	"github.com/SigNoz/signoz/pkg/modules/apdex/implapdex"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration/implcloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/fields"
	"github.com/SigNoz/signoz/pkg/modules/fields/implfields"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer/implmetricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter/implquickfilter"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport/implrawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory/implrulestatehistory"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount/implserviceaccount"
	"github.com/SigNoz/signoz/pkg/modules/services"
	"github.com/SigNoz/signoz/pkg/modules/services/implservices"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile/implspanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel/impltracefunnel"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type Handlers struct {
	SavedView               savedview.Handler
	Apdex                   apdex.Handler
	Dashboard               dashboard.Handler
	QuickFilter             quickfilter.Handler
	TraceFunnel             tracefunnel.Handler
	RawDataExport           rawdataexport.Handler
	SpanPercentile          spanpercentile.Handler
	Services                services.Handler
	MetricsExplorer         metricsexplorer.Handler
	Global                  global.Handler
	FlaggerHandler          flagger.Handler
	GatewayHandler          gateway.Handler
	Fields                  fields.Handler
	AuthzHandler            authz.Handler
	ZeusHandler             zeus.Handler
	QuerierHandler          querier.Handler
	ServiceAccountHandler   serviceaccount.Handler
	RegistryHandler         factory.Handler
	CloudIntegrationHandler cloudintegration.Handler
	RuleStateHistory        rulestatehistory.Handler
}

func NewHandlers(
	modules Modules,
	providerSettings factory.ProviderSettings,
	analytics analytics.Analytics,
	querierHandler querier.Handler,
	licensing licensing.Licensing,
	global global.Global,
	flaggerService flagger.Flagger,
	gatewayService gateway.Gateway,
	telemetryMetadataStore telemetrytypes.MetadataStore,
	authz authz.AuthZ,
	zeusService zeus.Zeus,
	registryHandler factory.Handler,
) Handlers {
	return Handlers{
		SavedView:               implsavedview.NewHandler(modules.SavedView),
		Apdex:                   implapdex.NewHandler(modules.Apdex),
		Dashboard:               impldashboard.NewHandler(modules.Dashboard, providerSettings),
		QuickFilter:             implquickfilter.NewHandler(modules.QuickFilter),
		TraceFunnel:             impltracefunnel.NewHandler(modules.TraceFunnel),
		RawDataExport:           implrawdataexport.NewHandler(modules.RawDataExport),
		Services:                implservices.NewHandler(modules.Services),
		MetricsExplorer:         implmetricsexplorer.NewHandler(modules.MetricsExplorer),
		SpanPercentile:          implspanpercentile.NewHandler(modules.SpanPercentile),
		Global:                  signozglobal.NewHandler(global),
		FlaggerHandler:          flagger.NewHandler(flaggerService),
		GatewayHandler:          gateway.NewHandler(gatewayService),
		Fields:                  implfields.NewHandler(providerSettings, telemetryMetadataStore),
		AuthzHandler:            signozauthzapi.NewHandler(authz),
		ZeusHandler:             zeus.NewHandler(zeusService, licensing),
		QuerierHandler:          querierHandler,
		ServiceAccountHandler:   implserviceaccount.NewHandler(modules.ServiceAccount),
		RegistryHandler:         registryHandler,
		CloudIntegrationHandler: implcloudintegration.NewHandler(),
		RuleStateHistory:        implrulestatehistory.NewHandler(modules.RuleStateHistory),
	}
}
