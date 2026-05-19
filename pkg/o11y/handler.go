package o11y

import (
	"github.com/hanzoai/o11y/pkg/analytics"
	"github.com/hanzoai/o11y/pkg/authz"
	"github.com/hanzoai/o11y/pkg/authz/o11yauthzapi"
	"github.com/hanzoai/o11y/pkg/factory"
	"github.com/hanzoai/o11y/pkg/flagger"
	"github.com/hanzoai/o11y/pkg/gateway"
	"github.com/hanzoai/o11y/pkg/global"
	"github.com/hanzoai/o11y/pkg/global/o11yglobal"
	"github.com/hanzoai/o11y/pkg/licensing"
	"github.com/hanzoai/o11y/pkg/modules/apdex"
	"github.com/hanzoai/o11y/pkg/modules/apdex/implapdex"
	"github.com/hanzoai/o11y/pkg/modules/dashboard"
	"github.com/hanzoai/o11y/pkg/modules/dashboard/impldashboard"
	"github.com/hanzoai/o11y/pkg/modules/fields"
	"github.com/hanzoai/o11y/pkg/modules/fields/implfields"
	"github.com/hanzoai/o11y/pkg/modules/metricsexplorer"
	"github.com/hanzoai/o11y/pkg/modules/metricsexplorer/implmetricsexplorer"
	"github.com/hanzoai/o11y/pkg/modules/quickfilter"
	"github.com/hanzoai/o11y/pkg/modules/quickfilter/implquickfilter"
	"github.com/hanzoai/o11y/pkg/modules/rawdataexport"
	"github.com/hanzoai/o11y/pkg/modules/rawdataexport/implrawdataexport"
	"github.com/hanzoai/o11y/pkg/modules/savedview"
	"github.com/hanzoai/o11y/pkg/modules/savedview/implsavedview"
	"github.com/hanzoai/o11y/pkg/modules/serviceaccount"
	"github.com/hanzoai/o11y/pkg/modules/serviceaccount/implserviceaccount"
	"github.com/hanzoai/o11y/pkg/modules/services"
	"github.com/hanzoai/o11y/pkg/modules/services/implservices"
	"github.com/hanzoai/o11y/pkg/modules/spanpercentile"
	"github.com/hanzoai/o11y/pkg/modules/spanpercentile/implspanpercentile"
	"github.com/hanzoai/o11y/pkg/modules/tracefunnel"
	"github.com/hanzoai/o11y/pkg/modules/tracefunnel/impltracefunnel"
	"github.com/hanzoai/o11y/pkg/querier"
	"github.com/hanzoai/o11y/pkg/types/telemetrytypes"
	"github.com/hanzoai/o11y/pkg/zeus"
)

type Handlers struct {
	SavedView             savedview.Handler
	Apdex                 apdex.Handler
	Dashboard             dashboard.Handler
	QuickFilter           quickfilter.Handler
	TraceFunnel           tracefunnel.Handler
	RawDataExport         rawdataexport.Handler
	SpanPercentile        spanpercentile.Handler
	Services              services.Handler
	MetricsExplorer       metricsexplorer.Handler
	Global                global.Handler
	FlaggerHandler        flagger.Handler
	GatewayHandler        gateway.Handler
	Fields                fields.Handler
	AuthzHandler          authz.Handler
	ZeusHandler           zeus.Handler
	QuerierHandler        querier.Handler
	ServiceAccountHandler serviceaccount.Handler
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
) Handlers {
	return Handlers{
		SavedView:             implsavedview.NewHandler(modules.SavedView),
		Apdex:                 implapdex.NewHandler(modules.Apdex),
		Dashboard:             impldashboard.NewHandler(modules.Dashboard, providerSettings),
		QuickFilter:           implquickfilter.NewHandler(modules.QuickFilter),
		TraceFunnel:           impltracefunnel.NewHandler(modules.TraceFunnel),
		RawDataExport:         implrawdataexport.NewHandler(modules.RawDataExport),
		Services:              implservices.NewHandler(modules.Services),
		MetricsExplorer:       implmetricsexplorer.NewHandler(modules.MetricsExplorer),
		SpanPercentile:        implspanpercentile.NewHandler(modules.SpanPercentile),
		Global:                o11yglobal.NewHandler(global),
		FlaggerHandler:        flagger.NewHandler(flaggerService),
		GatewayHandler:        gateway.NewHandler(gatewayService),
		Fields:                implfields.NewHandler(providerSettings, telemetryMetadataStore),
		AuthzHandler:          o11yauthzapi.NewHandler(authz),
		ZeusHandler:           zeus.NewHandler(zeusService, licensing),
		QuerierHandler:        querierHandler,
		ServiceAccountHandler: implserviceaccount.NewHandler(modules.ServiceAccount),
	}
}
