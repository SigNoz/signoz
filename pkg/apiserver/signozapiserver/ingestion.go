package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ingestiontypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addIngestionRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/ingestion", handler.New(provider.authZ.EditAccess(provider.ingestionHandler.Get), handler.OpenAPIDef{
		ID:                  "GetIngestion",
		Tags:                []string{"ingestion"},
		Summary:             "Get ingestion details",
		Description:         "This endpoints returns ingestion details",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(ingestiontypes.GettableIngestion),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}
