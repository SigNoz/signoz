package signoz

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/global/signozglobal"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/apdex"
	"github.com/SigNoz/signoz/pkg/modules/apdex/implapdex"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer/implmetricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter/implquickfilter"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport/implrawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/modules/role/implrole"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/modules/services"
	"github.com/SigNoz/signoz/pkg/modules/services/implservices"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile/implspanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel/impltracefunnel"
	"github.com/SigNoz/signoz/pkg/querier"
)

type Handlers struct {
	SavedView       savedview.Handler
	Apdex           apdex.Handler
	Dashboard       dashboard.Handler
	QuickFilter     quickfilter.Handler
	TraceFunnel     tracefunnel.Handler
	RawDataExport   rawdataexport.Handler
	SpanPercentile  spanpercentile.Handler
	Services        services.Handler
	MetricsExplorer metricsexplorer.Handler
	Global          global.Handler
	FlaggerHandler  flagger.Handler
	GatewayHandler  gateway.Handler
	Role            role.Handler
}

func NewHandlers(modules Modules, providerSettings factory.ProviderSettings, querier querier.Querier, licensing licensing.Licensing, global global.Global, flaggerService flagger.Flagger, gatewayService gateway.Gateway) Handlers {
	return Handlers{
		SavedView:       implsavedview.NewHandler(modules.SavedView),
		Apdex:           implapdex.NewHandler(modules.Apdex),
		Dashboard:       impldashboard.NewHandler(modules.Dashboard, providerSettings),
		QuickFilter:     implquickfilter.NewHandler(modules.QuickFilter),
		TraceFunnel:     impltracefunnel.NewHandler(modules.TraceFunnel),
		RawDataExport:   implrawdataexport.NewHandler(modules.RawDataExport),
		Services:        implservices.NewHandler(modules.Services),
		MetricsExplorer: implmetricsexplorer.NewHandler(modules.MetricsExplorer),
		SpanPercentile:  implspanpercentile.NewHandler(modules.SpanPercentile),
		Global:          signozglobal.NewHandler(global),
		FlaggerHandler:  flagger.NewHandler(flaggerService),
		GatewayHandler:  gateway.NewHandler(gatewayService),
		Role:            implrole.NewHandler(modules.RoleSetter, modules.RoleGetter),
	}
}
