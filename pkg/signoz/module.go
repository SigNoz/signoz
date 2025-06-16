package signoz

import (
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
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
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
)

type Modules struct {
	OrgGetter   organization.Getter
	OrgSetter   organization.Setter
	Preference  preference.Module
	User        user.Module
	SavedView   savedview.Module
	Apdex       apdex.Module
	Dashboard   dashboard.Module
	QuickFilter quickfilter.Module
	TraceFunnel tracefunnel.Module
}

func NewModules(
	sqlstore sqlstore.SQLStore,
	jwt *authtypes.JWT,
	emailing emailing.Emailing,
	providerSettings factory.ProviderSettings,
	orgGetter organization.Getter,
	alertmanager alertmanager.Alertmanager,
	analytics analytics.Analytics,
) Modules {
	quickfilter := implquickfilter.NewModule(implquickfilter.NewStore(sqlstore))
	orgSetter := implorganization.NewSetter(implorganization.NewStore(sqlstore), alertmanager, quickfilter)
	user := impluser.NewModule(impluser.NewStore(sqlstore, providerSettings), jwt, emailing, providerSettings, orgSetter, analytics)
	return Modules{
		OrgGetter:   orgGetter,
		OrgSetter:   orgSetter,
		Preference:  implpreference.NewModule(implpreference.NewStore(sqlstore), preferencetypes.NewAvailablePreference()),
		SavedView:   implsavedview.NewModule(sqlstore),
		Apdex:       implapdex.NewModule(sqlstore),
		Dashboard:   impldashboard.NewModule(sqlstore, providerSettings, analytics),
		User:        user,
		QuickFilter: quickfilter,
		TraceFunnel: impltracefunnel.NewModule(impltracefunnel.NewStore(sqlstore)),
	}
}
