package signozapiserver

import (
	"context"

	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/gorilla/mux"
)

type provider struct {
	config                 apiserver.Config
	settings               factory.ScopedProviderSettings
	router                 *mux.Router
	authZ                  *middleware.AuthZ
	orgHandler             organization.Handler
	userHandler            user.Handler
	sessionHandler         session.Handler
	authDomainHandler      authdomain.Handler
	preferenceHandler      preference.Handler
	globalHandler          global.Handler
	promoteHandler         promote.Handler
	flaggerHandler         flagger.Handler
	dashboardModule        dashboard.Module
	dashboardHandler       dashboard.Handler
	metricsExplorerHandler metricsexplorer.Handler
}

func NewFactory(
	orgGetter organization.Getter,
	authz authz.AuthZ,
	orgHandler organization.Handler,
	userHandler user.Handler,
	sessionHandler session.Handler,
	authDomainHandler authdomain.Handler,
	preferenceHandler preference.Handler,
	globalHandler global.Handler,
	promoteHandler promote.Handler,
	flaggerHandler flagger.Handler,
	dashboardModule dashboard.Module,
	dashboardHandler dashboard.Handler,
	metricsExplorerHandler metricsexplorer.Handler,
) factory.ProviderFactory[apiserver.APIServer, apiserver.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, providerSettings factory.ProviderSettings, config apiserver.Config) (apiserver.APIServer, error) {
		return newProvider(ctx, providerSettings, config, orgGetter, authz, orgHandler, userHandler, sessionHandler, authDomainHandler, preferenceHandler, globalHandler, promoteHandler, flaggerHandler, dashboardModule, dashboardHandler, metricsExplorerHandler)
	})
}

func newProvider(
	_ context.Context,
	providerSettings factory.ProviderSettings,
	config apiserver.Config,
	orgGetter organization.Getter,
	authz authz.AuthZ,
	orgHandler organization.Handler,
	userHandler user.Handler,
	sessionHandler session.Handler,
	authDomainHandler authdomain.Handler,
	preferenceHandler preference.Handler,
	globalHandler global.Handler,
	promoteHandler promote.Handler,
	flaggerHandler flagger.Handler,
	dashboardModule dashboard.Module,
	dashboardHandler dashboard.Handler,
	metricsExplorerHandler metricsexplorer.Handler,
) (apiserver.APIServer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/apiserver/signozapiserver")
	router := mux.NewRouter().UseEncodedPath()

	provider := &provider{
		config:                 config,
		settings:               settings,
		router:                 router,
		orgHandler:             orgHandler,
		userHandler:            userHandler,
		sessionHandler:         sessionHandler,
		authDomainHandler:      authDomainHandler,
		preferenceHandler:      preferenceHandler,
		globalHandler:          globalHandler,
		promoteHandler:         promoteHandler,
		flaggerHandler:         flaggerHandler,
		dashboardModule:        dashboardModule,
		dashboardHandler:       dashboardHandler,
		metricsExplorerHandler: metricsExplorerHandler,
	}

	provider.authZ = middleware.NewAuthZ(settings.Logger(), orgGetter, authz)

	if err := provider.AddToRouter(router); err != nil {
		return nil, err
	}

	return provider, nil
}

func (provider *provider) Router() *mux.Router {
	return provider.router
}

func (provider *provider) AddToRouter(router *mux.Router) error {
	if err := provider.addOrgRoutes(router); err != nil {
		return err
	}

	if err := provider.addSessionRoutes(router); err != nil {
		return err
	}

	if err := provider.addAuthDomainRoutes(router); err != nil {
		return err
	}

	if err := provider.addPreferenceRoutes(router); err != nil {
		return err
	}

	if err := provider.addUserRoutes(router); err != nil {
		return err
	}

	if err := provider.addGlobalRoutes(router); err != nil {
		return err
	}

	if err := provider.addPromoteRoutes(router); err != nil {
		return err
	}

	if err := provider.addFlaggerRoutes(router); err != nil {
		return err
	}

	if err := provider.addDashboardRoutes(router); err != nil {
		return err
	}

	if err := provider.addMetricsExplorerV2Routes(router); err != nil {
		return err
	}

	return nil
}

func newSecuritySchemes(role types.Role) []handler.OpenAPISecurityScheme {
	return []handler.OpenAPISecurityScheme{
		{Name: ctxtypes.AuthTypeAPIKey.StringValue(), Scopes: []string{role.String()}},
		{Name: ctxtypes.AuthTypeTokenizer.StringValue(), Scopes: []string{role.String()}},
	}
}

func newAnonymousSecuritySchemes(scopes []string) []handler.OpenAPISecurityScheme {
	return []handler.OpenAPISecurityScheme{
		{Name: ctxtypes.AuthTypeAnonymous.StringValue(), Scopes: scopes},
	}
}
