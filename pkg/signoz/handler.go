package signoz

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/apdex"
	"github.com/SigNoz/signoz/pkg/modules/apdex/implapdex"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/modules/authdomain/implauthdomain"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/preference/implpreference"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter/implquickfilter"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport/implrawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/modules/services"
	"github.com/SigNoz/signoz/pkg/modules/services/implservices"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/modules/session/implsession"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile/implspanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel/impltracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/querier"
)

type Handlers struct {
	Organization   organization.Handler
	Preference     preference.Handler
	User           user.Handler
	SavedView      savedview.Handler
	Apdex          apdex.Handler
	Dashboard      dashboard.Handler
	QuickFilter    quickfilter.Handler
	TraceFunnel    tracefunnel.Handler
	RawDataExport  rawdataexport.Handler
	AuthDomain     authdomain.Handler
	Session        session.Handler
	SpanPercentile spanpercentile.Handler
	Services       services.Handler
}

func NewHandlers(modules Modules, providerSettings factory.ProviderSettings, querier querier.Querier, licensing licensing.Licensing) Handlers {
	return Handlers{
		Organization:   implorganization.NewHandler(modules.OrgGetter, modules.OrgSetter),
		Preference:     implpreference.NewHandler(modules.Preference),
		User:           impluser.NewHandler(modules.User, modules.UserGetter),
		SavedView:      implsavedview.NewHandler(modules.SavedView),
		Apdex:          implapdex.NewHandler(modules.Apdex),
		Dashboard:      impldashboard.NewHandler(modules.Dashboard, providerSettings, querier, licensing),
		QuickFilter:    implquickfilter.NewHandler(modules.QuickFilter),
		TraceFunnel:    impltracefunnel.NewHandler(modules.TraceFunnel),
		RawDataExport:  implrawdataexport.NewHandler(modules.RawDataExport),
		AuthDomain:     implauthdomain.NewHandler(modules.AuthDomain),
		Session:        implsession.NewHandler(modules.Session),
		Services:       implservices.NewHandler(modules.Services),
		SpanPercentile: implspanpercentile.NewHandler(modules.SpanPercentile),
	}
}
