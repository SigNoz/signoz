package queryparser

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/parsertypes"
)

type API struct {
	queryParser QueryParser
	settings    factory.ProviderSettings
}

func NewAPI(settings factory.ProviderSettings, queryParser QueryParser) *API {
	return &API{settings: settings, queryParser: queryParser}
}

// AnalyzeQueryFilter analyzes a query and extracts metric names and grouping columns
func (a *API) AnalyzeQueryFilter(w http.ResponseWriter, r *http.Request) {
	// Limit request body size to 255 KB (CH query limit is 256 KB)
	r.Body = http.MaxBytesReader(w, r.Body, 255*1024)

	var req parsertypes.QueryFilterAnalyzeRequest
	if err := binding.JSON.BindBody(r.Body, &req); err != nil {
		render.Error(w, err)
		return
	}

	result, err := a.queryParser.AnalyzeQueryFilter(r.Context(), req.QueryType, req.Query)
	if err != nil {
		a.settings.Logger.ErrorContext(r.Context(), "failed to analyze query filter", "error", err)
		render.Error(w, err)
		return
	}

	// prepare the response
	var resp parsertypes.QueryFilterAnalyzeResponse
	for _, group := range result.GroupByColumns {
		resp.Groups = append(resp.Groups, parsertypes.ColumnInfoResponse{
			Name:  group.Name,
			Alias: group.Alias,
		}) // add the group name and alias to the response
	}
	resp.MetricNames = append(resp.MetricNames, result.MetricNames...) // add the metric names to the response
	render.Success(w, http.StatusOK, resp)
}
