package implrole

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/modules/role"
)

type handler struct {
	module role.Module
}

func NewHandler(module role.Module) (role.Handler, error) {
	return &handler{module: module}, nil
}

func (h *handler) Create(*http.Request, http.ResponseWriter) {}

func (h *handler) Delete(*http.Request, http.ResponseWriter) {}

func (h *handler) Get(*http.Request, http.ResponseWriter) {}

func (h *handler) GetResourcesAndRelations(*http.Request, http.ResponseWriter) {}

func (h *handler) List(*http.Request, http.ResponseWriter) {}

func (h *handler) Update(*http.Request, http.ResponseWriter) {}
