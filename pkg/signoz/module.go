package signoz

import (
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
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
	"github.com/SigNoz/signoz/pkg/modules/role/implrole"
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
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
)

type Modules struct {
	OrgGetter      organization.Getter
	OrgSetter      organization.Setter
	Preference     preference.Module
	User           user.Module
	UserGetter     user.Getter
	SavedView      savedview.Module
	Apdex          apdex.Module
	Dashboard      dashboard.Module
	QuickFilter    quickfilter.Module
	TraceFunnel    tracefunnel.Module
	RawDataExport  rawdataexport.Module
	AuthDomain     authdomain.Module
	Session        session.Module
	Services       services.Module
	SpanPercentile spanpercentile.Module
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
	authNs map[authtypes.AuthNProvider]authn.AuthN,
	authz authz.AuthZ,
) Modules {
	quickfilter := implquickfilter.NewModule(implquickfilter.NewStore(sqlstore))
	orgSetter := implorganization.NewSetter(implorganization.NewStore(sqlstore), alertmanager, quickfilter)
	user := impluser.NewModule(impluser.NewStore(sqlstore, providerSettings), tokenizer, emailing, providerSettings, orgSetter, analytics)
	userGetter := impluser.NewGetter(impluser.NewStore(sqlstore, providerSettings))

	return Modules{
		OrgGetter:      orgGetter,
		OrgSetter:      orgSetter,
		Preference:     implpreference.NewModule(implpreference.NewStore(sqlstore), preferencetypes.NewAvailablePreference()),
		SavedView:      implsavedview.NewModule(sqlstore),
		Apdex:          implapdex.NewModule(sqlstore),
		Dashboard:      impldashboard.NewModule(sqlstore, providerSettings, analytics, orgGetter, implrole.NewModule(implrole.NewStore(sqlstore), authz, nil)),
		User:           user,
		UserGetter:     userGetter,
		QuickFilter:    quickfilter,
		TraceFunnel:    impltracefunnel.NewModule(impltracefunnel.NewStore(sqlstore)),
		RawDataExport:  implrawdataexport.NewModule(querier),
		AuthDomain:     implauthdomain.NewModule(implauthdomain.NewStore(sqlstore)),
		Session:        implsession.NewModule(providerSettings, authNs, user, userGetter, implauthdomain.NewModule(implauthdomain.NewStore(sqlstore)), tokenizer, orgGetter),
		SpanPercentile: implspanpercentile.NewModule(querier, providerSettings),
		Services:       implservices.NewModule(querier, telemetryStore),
	}
}
