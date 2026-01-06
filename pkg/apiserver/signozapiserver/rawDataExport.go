package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addRawDataExportRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/export_raw_data", handler.New(provider.authZ.ViewAccess(provider.rawDataExportHandler.ExportRawData), handler.OpenAPIDef{
		ID:                  "HandleExportRawData",
		Tags:                []string{"logs", "traces"},
		Summary:             "Export raw data",
		Description:         "This endpoints allows exporting raw data for traces and logs",
		Request:             new([]*promotetypes.PromotePath),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}
