package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	v5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/gorilla/mux"
)

func (provider *provider) addRawDataExportRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/export_raw_data", handler.New(provider.authZ.ViewAccess(provider.rawDataExportHandler.ExportRawData), handler.OpenAPIDef{
		ID:                  "HandleExportRawDataGET",
		Tags:                []string{"logs", "traces"},
		Summary:             "Export raw data",
		Description:         "This endpoints allows simple query exporting raw data for traces and logs",
		Request:             new(types.ExportRawDataQueryParams),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}
	if err := router.Handle("/api/v1/export_raw_data", handler.New(provider.authZ.ViewAccess(provider.rawDataExportHandler.ExportRawData), handler.OpenAPIDef{
		ID:                  "HandleExportRawDataPOST",
		Tags:                []string{"logs", "traces"},
		Summary:             "Export raw data",
		Description:         "This endpoints allows complex query exporting raw data for traces and logs",
		Request:             new(v5.QueryRangeRequest),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}
