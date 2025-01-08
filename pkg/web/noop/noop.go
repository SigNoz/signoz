package noop

import (
	"net/http"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/web"
)

type noop struct{}

func New() web.Web {
	return &noop{}
}

func (n *noop) AddToRouter(router *mux.Router) error {
	return nil
}

func (n *noop) ServeHTTP(w http.ResponseWriter, r *http.Request) {}
