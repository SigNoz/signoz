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
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
)

type Modules struct {
	Organization organization.Module
	Preference   preference.Module
	User         user.Module
	SavedView    savedview.Module
	Apdex        apdex.Module
	Dashboard    dashboard.Module
}

func NewModules(sqlstore sqlstore.SQLStore, user user.Module) Modules {
	return Modules{
		Organization: implorganization.NewModule(implorganization.NewStore(sqlstore)),
		Preference:   implpreference.NewModule(implpreference.NewStore(sqlstore), preferencetypes.NewDefaultPreferenceMap()),
		User:         user,
		SavedView:    implsavedview.NewModule(sqlstore),
		Apdex:        implapdex.NewModule(sqlstore),
		Dashboard:    impldashboard.NewModule(sqlstore),
	}
}
