package implpromote

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/modules/promote"
)

type handler struct {
	module module
}

func NewHandler(module promote.Module) promote.Handler {
	return &handler{module: module}
}

func (h *handler) Promote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
}
