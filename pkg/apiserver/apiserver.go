package apiserver

import (
	"github.com/gorilla/mux"
)

type APIServer interface {
	// Returns the mux router for the API server. Primarily used for collecting OpenAPI operations.
	Router() *mux.Router

	// Adds the API server routes to an existing router. This is a backwards compatible method for adding routes to the input router.
	AddToRouter(router *mux.Router) error
}
