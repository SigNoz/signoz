// Package billing is the o11y billing handler contract.
//
// The community build supplies a noop implementation; an enterprise
// build overrides it. The route layer in pkg/apiserver/o11yapiserver
// wires whichever handler is registered.
package billing

import "net/http"

// Handler is the http handler set for billing routes.
type Handler interface {
	PutProfile(w http.ResponseWriter, r *http.Request)
	GetHosts(w http.ResponseWriter, r *http.Request)
	PutHost(w http.ResponseWriter, r *http.Request)
}

// NewNoopHandler returns a Handler that responds 501 Not Implemented on
// every route. Community builds use this; enterprise builds replace it.
func NewNoopHandler() Handler { return noop{} }

type noop struct{}

func (noop) PutProfile(w http.ResponseWriter, _ *http.Request) {
	http.Error(w, "billing routes require enterprise build", http.StatusNotImplemented)
}

func (noop) GetHosts(w http.ResponseWriter, _ *http.Request) {
	http.Error(w, "billing routes require enterprise build", http.StatusNotImplemented)
}

func (noop) PutHost(w http.ResponseWriter, _ *http.Request) {
	http.Error(w, "billing routes require enterprise build", http.StatusNotImplemented)
}
