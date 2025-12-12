package signozapiserver

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/gorilla/mux"
)

type provider struct {
	config     apiserver.Config
	settings   factory.ScopedProviderSettings
	router     *mux.Router
	authZ      *middleware.AuthZ
	orgHandler organization.Handler
}

func NewProviderFactory(
	orgGetter organization.Getter,
	authz authz.AuthZ,
	orgHandler organization.Handler,
) factory.ProviderFactory[apiserver.APIServer, apiserver.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, providerSettings factory.ProviderSettings, config apiserver.Config) (apiserver.APIServer, error) {
		return newProvider(ctx, providerSettings, config, orgGetter, authz, orgHandler)
	})
}

func newProvider(
	_ context.Context,
	providerSettings factory.ProviderSettings,
	config apiserver.Config,
	orgGetter organization.Getter,
	authz authz.AuthZ,
	orgHandler organization.Handler,
) (apiserver.APIServer, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/apiserver/signozapiserver")
	router := mux.NewRouter().UseEncodedPath()

	provider := &provider{
		config:     config,
		settings:   settings,
		router:     router,
		orgHandler: orgHandler,
	}

	provider.authZ = middleware.NewAuthZ(settings.Logger(), orgGetter, authz)

	provider.AddToRouter(router)
	return provider, nil
}

func (provider *provider) Router() *mux.Router {
	return provider.router
}

func (provider *provider) AddToRouter(router *mux.Router) error {
	if err := router.Handle("/api/v2/orgs/me", handler.New(provider.orgHandler.Get, handler.Def{
		Tags:              []string{"orgs"},
		Summary:           "Get my organization",
		Description:       "This endpoint returns the organization I belong to",
		Request:           nil,
		Response:          &types.Organization{},
		SuccessStatusCode: http.StatusOK,
		ErrorStatusCodes:  []int{http.StatusUnauthorized},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}
