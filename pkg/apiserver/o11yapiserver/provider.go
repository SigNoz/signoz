package o11yapiserver

import (
	"context"

	"github.com/hanzoai/o11y/pkg/apiserver"
	"github.com/hanzoai/o11y/pkg/authz"
	"github.com/hanzoai/o11y/pkg/factory"
	"github.com/hanzoai/o11y/pkg/flagger"
	"github.com/hanzoai/o11y/pkg/gateway"
	"github.com/hanzoai/o11y/pkg/global"
	"github.com/hanzoai/o11y/pkg/http/handler"
	"github.com/hanzoai/o11y/pkg/http/middleware"
	"github.com/hanzoai/o11y/pkg/modules/authdomain"
	"github.com/hanzoai/o11y/pkg/modules/dashboard"
	"github.com/hanzoai/o11y/pkg/modules/fields"
	"github.com/hanzoai/o11y/pkg/modules/metricsexplorer"
	"github.com/hanzoai/o11y/pkg/modules/organization"
	"github.com/hanzoai/o11y/pkg/modules/preference"
	"github.com/hanzoai/o11y/pkg/modules/promote"
	"github.com/hanzoai/o11y/pkg/modules/serviceaccount"
	"github.com/hanzoai/o11y/pkg/modules/session"
	"github.com/hanzoai/o11y/pkg/modules/user"
	"github.com/hanzoai/o11y/pkg/querier"
	"github.com/hanzoai/o11y/pkg/types"
	"github.com/hanzoai/o11y/pkg/types/ctxtypes"
	"github.com/hanzoai/o11y/pkg/billing"
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
	gatewayHandler         gateway.Handler
	fieldsHandler          fields.Handler
	authzHandler           authz.Handler
	billingHandler         billing.Handler
	querierHandler         querier.Handler
	serviceAccountHandler  serviceaccount.Handler
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
	gatewayHandler gateway.Handler,
	fieldsHandler fields.Handler,
	authzHandler authz.Handler,
	billingHandler billing.Handler,
	querierHandler querier.Handler,
	serviceAccountHandler serviceaccount.Handler,
) factory.ProviderFactory[apiserver.APIServer, apiserver.Config] {
	return factory.NewProviderFactory(factory.MustNewName("observe"), func(ctx context.Context, providerSettings factory.ProviderSettings, config apiserver.Config) (apiserver.APIServer, error) {
		return newProvider(
			ctx,
			providerSettings,
			config,
			orgGetter,
			authz,
			orgHandler,
			userHandler,
			sessionHandler,
			authDomainHandler,
			preferenceHandler,
			globalHandler,
			promoteHandler,
			flaggerHandler,
			dashboardModule,
			dashboardHandler,
			metricsExplorerHandler,
			gatewayHandler,
			fieldsHandler,
			authzHandler,
			billingHandler,
			querierHandler,
			serviceAccountHandler,
		)
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
	gatewayHandler gateway.Handler,
	fieldsHandler fields.Handler,
	authzHandler authz.Handler,
	billingHandler billing.Handler,
	querierHandler querier.Handler,
	serviceAccountHandler serviceaccount.Handler,
) (apiserver.APIServer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/hanzoai/o11y/pkg/apiserver/o11yapiserver")
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
		gatewayHandler:         gatewayHandler,
		fieldsHandler:          fieldsHandler,
		authzHandler:           authzHandler,
		billingHandler:         billingHandler,
		querierHandler:         querierHandler,
		serviceAccountHandler:  serviceAccountHandler,
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

	if err := provider.addMetricsExplorerRoutes(router); err != nil {
		return err
	}

	if err := provider.addGatewayRoutes(router); err != nil {
		return err
	}

	if err := provider.addRoleRoutes(router); err != nil {
		return err
	}

	if err := provider.addAuthzRoutes(router); err != nil {
		return err
	}

	if err := provider.addFieldsRoutes(router); err != nil {
		return err
	}

	if err := provider.addBillingRoutes(router); err != nil {
		return err
	}

	if err := provider.addQuerierRoutes(router); err != nil {
		return err
	}

	if err := provider.addServiceAccountRoutes(router); err != nil {
		return err
	}

	if err := provider.addTenantRoutes(router); err != nil {
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
