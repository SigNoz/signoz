package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addSpanPercentileRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/span_percentile", handler.New(
		provider.authzMiddleware.ViewAccess(provider.spanPercentileHandler.GetSpanPercentileDetails),
		handler.OpenAPIDef{
			ID:                  "GetSpanPercentile",
			Tags:                []string{"spanpercentile"},
			Summary:             "Get percentile of a span duration",
			Description:         "Places a span's duration among the spans of the same name and service, and the same resource attributes when given, that started in the time range.",
			Request:             new(spanpercentiletypes.SpanPercentileRequest),
			RequestContentType:  "application/json",
			Response:            new(spanpercentiletypes.SpanPercentileResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}
