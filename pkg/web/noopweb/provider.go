package noopweb

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/web"
)

type provider struct{}

func NewFactory() factory.ProviderFactory[web.Web, web.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config web.Config) (web.Web, error) {
	return &provider{}, nil
}

func (provider *provider) AddToRouter(router *mux.Router) error {
	return nil
}

func (provider *provider) ServeHTTP(w http.ResponseWriter, r *http.Request) {}
