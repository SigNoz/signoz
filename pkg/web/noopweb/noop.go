package noopweb

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/web"
)

type noop struct{}

func NewFactory() factory.ProviderFactory[web.Web, web.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config web.Config) (web.Web, error) {
	return &noop{}, nil
}

func (n *noop) AddToRouter(router *mux.Router) error {
	return nil
}

func (n *noop) ServeHTTP(w http.ResponseWriter, r *http.Request) {}
