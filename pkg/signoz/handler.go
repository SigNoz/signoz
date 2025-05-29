package signoz

import (
	"github.com/SigNoz/signoz/pkg/modules/apdex"
	"github.com/SigNoz/signoz/pkg/modules/apdex/implapdex"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/preference/implpreference"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter/implquickfilter"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel/impltracefunnel"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
)

type Handlers struct {
	Organization organization.Handler
	Preference   preference.Handler
	User         user.Handler
	SavedView    savedview.Handler
	Apdex        apdex.Handler
	Dashboard    dashboard.Handler
	QuickFilter  quickfilter.Handler
	TraceFunnel  tracefunnel.Handler
}

func NewHandlers(modules Modules) Handlers {
	return Handlers{
		Organization: implorganization.NewHandler(modules.OrgGetter, modules.OrgSetter),
		Preference:   implpreference.NewHandler(modules.Preference),
		User:         impluser.NewHandler(modules.User),
		SavedView:    implsavedview.NewHandler(modules.SavedView),
		Apdex:        implapdex.NewHandler(modules.Apdex),
		Dashboard:    impldashboard.NewHandler(modules.Dashboard),
		QuickFilter:  implquickfilter.NewHandler(modules.QuickFilter),
		TraceFunnel:  impltracefunnel.NewHandler(modules.TraceFunnel),
	}
}
