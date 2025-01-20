package web

import (
	"net/http"

	"github.com/gorilla/mux"
)

// Web is the interface that wraps the methods of the web package.
type Web interface {
	// AddToRouter adds the web routes to an existing router.
	AddToRouter(router *mux.Router) error
	// ServeHTTP serves the web routes.
	http.Handler
}
