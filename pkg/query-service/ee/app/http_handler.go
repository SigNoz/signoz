package app

import (
	"github.com/gorilla/mux"
	baseApp "go.signoz.io/query-service/app"
	"go.signoz.io/query-service/dao"
)

type APIHandler struct {
	reader DatabaseReader
	*baseApp.APIHandler
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(reader DatabaseReader, relDB dao.ModelDao) (*APIHandler, error) {
	baseHandler, err := baseApp.NewAPIHandler(reader, relDB, "../config/dashboards")
	if err != nil {
		return nil, err
	}
	ah := &APIHandler{
		reader:     reader,
		APIHandler: baseHandler,
	}
	return ah, nil
}

// RegisterRoutes registers routes for this handler on the given router
func (aH *APIHandler) RegisterRoutes(router *mux.Router) {
	aH.APIHandler.RegisterRoutes(router)
}
