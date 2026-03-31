package signozapiserver

import (
	"context"

	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/fields"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/modules/session"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/gorilla/mux"
)

type provider struct {
	config                  apiserver.Config
	settings                factory.ScopedProviderSettings
	router                  *mux.Router
	authZ                   *middleware.AuthZ
	orgHandler              organization.Handler
	userHandler             user.Handler
	sessionHandler          session.Handler
	authDomainHandler       authdomain.Handler
	preferenceHandler       preference.Handler
	globalHandler           global.Handler
	promoteHandler          promote.Handler
	flaggerHandler          flagger.Handler
	dashboardModule         dashboard.Module
	dashboardHandler        dashboard.Handler
	metricsExplorerHandler  metricsexplorer.Handler
	gatewayHandler          gateway.Handler
	fieldsHandler           fields.Handler
	authzHandler            authz.Handler
	rawDataExportHandler    rawdataexport.Handler
	zeusHandler             zeus.Handler
	querierHandler          querier.Handler
	serviceAccountHandler   serviceaccount.Handler
	factoryHandler          factory.Handler
	cloudIntegrationHandler cloudintegration.Handler
	ruleStateHistoryHandler rulestatehistory.Handler
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
	rawDataExportHandler rawdataexport.Handler,
	zeusHandler zeus.Handler,
	querierHandler querier.Handler,
	serviceAccountHandler serviceaccount.Handler,
	factoryHandler factory.Handler,
	cloudIntegrationHandler cloudintegration.Handler,
	ruleStateHistoryHandler rulestatehistory.Handler,
) factory.ProviderFactory[apiserver.APIServer, apiserver.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, providerSettings factory.ProviderSettings, config apiserver.Config) (apiserver.APIServer, error) {
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
			rawDataExportHandler,
			zeusHandler,
			querierHandler,
			serviceAccountHandler,
			factoryHandler,
			cloudIntegrationHandler,
			ruleStateHistoryHandler,
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
	rawDataExportHandler rawdataexport.Handler,
	zeusHandler zeus.Handler,
	querierHandler querier.Handler,
	serviceAccountHandler serviceaccount.Handler,
	factoryHandler factory.Handler,
	cloudIntegrationHandler cloudintegration.Handler,
	ruleStateHistoryHandler rulestatehistory.Handler,
) (apiserver.APIServer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/apiserver/signozapiserver")
	router := mux.NewRouter().UseEncodedPath()

	provider := &provider{
		config:                  config,
		settings:                settings,
		router:                  router,
		orgHandler:              orgHandler,
		userHandler:             userHandler,
		sessionHandler:          sessionHandler,
		authDomainHandler:       authDomainHandler,
		preferenceHandler:       preferenceHandler,
		globalHandler:           globalHandler,
		promoteHandler:          promoteHandler,
		flaggerHandler:          flaggerHandler,
		dashboardModule:         dashboardModule,
		dashboardHandler:        dashboardHandler,
		metricsExplorerHandler:  metricsExplorerHandler,
		gatewayHandler:          gatewayHandler,
		fieldsHandler:           fieldsHandler,
		authzHandler:            authzHandler,
		rawDataExportHandler:    rawDataExportHandler,
		zeusHandler:             zeusHandler,
		querierHandler:          querierHandler,
		serviceAccountHandler:   serviceAccountHandler,
		factoryHandler:          factoryHandler,
		cloudIntegrationHandler: cloudIntegrationHandler,
		ruleStateHistoryHandler: ruleStateHistoryHandler,
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

	if err := provider.addRawDataExportRoutes(router); err != nil {
		return err
	}

	if err := provider.addZeusRoutes(router); err != nil {
		return err
	}

	if err := provider.addQuerierRoutes(router); err != nil {
		return err
	}

	if err := provider.addServiceAccountRoutes(router); err != nil {
		return err
	}

	if err := provider.addRegistryRoutes(router); err != nil {
		return err
	}

	if err := provider.addCloudIntegrationRoutes(router); err != nil {
		return err
	}

	if err := provider.addRuleStateHistoryRoutes(router); err != nil {
		return err
	}

	return nil
}

func newSecuritySchemes(role types.Role) []handler.OpenAPISecurityScheme {
	return []handler.OpenAPISecurityScheme{
		{Name: authtypes.IdentNProviderAPIKey.StringValue(), Scopes: []string{role.String()}},
		{Name: authtypes.IdentNProviderTokenizer.StringValue(), Scopes: []string{role.String()}},
	}
}

func newAnonymousSecuritySchemes(scopes []string) []handler.OpenAPISecurityScheme {
	return []handler.OpenAPISecurityScheme{
		{Name: authtypes.IdentNProviderAnonymous.StringValue(), Scopes: scopes},
	}
}
