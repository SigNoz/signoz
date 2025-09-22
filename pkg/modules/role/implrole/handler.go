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

func (h *handler) Create(req *http.Request, rw http.ResponseWriter) {}

func (h *handler) Get(req *http.Request, rw http.ResponseWriter) {}

func (h *handler) GetObjects(*http.Request, http.ResponseWriter) {}

func (h *handler) GetResources(*http.Request, http.ResponseWriter) {}

func (h *handler) Patch(*http.Request, http.ResponseWriter) {}

func (h *handler) PatchObjects(*http.Request, http.ResponseWriter) {}

func (h *handler) Delete(req *http.Request, rw http.ResponseWriter) {}

func (h *handler) GetResourcesAndRelations(req *http.Request, rw http.ResponseWriter) {}

func (h *handler) List(req *http.Request, rw http.ResponseWriter) {}

func (h *handler) Update(req *http.Request, rw http.ResponseWriter) {}
