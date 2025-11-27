package queryfilterextractor

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/parsertypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type API struct {
	settings factory.ProviderSettings
}

func NewAPI(set factory.ProviderSettings) *API {
	return &API{settings: set}
}

// AnalyzeQueryFilter analyzes a query and extracts metric names and grouping columns
func (a *API) AnalyzeQueryFilter(w http.ResponseWriter, r *http.Request) {
	// Limit request body size to 255 KB (CH query limit is 256 KB)
	r.Body = http.MaxBytesReader(w, r.Body, 255*1024)

	var req parsertypes.QueryFilterAnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(w, err)
		return
	}

	// Query and QueryType are already validated and normalized by UnmarshalJSON
	query := req.Query
	var extractorType ExtractorType

	switch req.QueryType {
	case querybuildertypesv5.QueryTypePromQL:
		extractorType = ExtractorTypePromQL
	case querybuildertypesv5.QueryTypeClickHouseSQL:
		extractorType = ExtractorTypeClickHouseSQL
	default:
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported queryType: %s. Supported values are '%s' and '%s'", req.QueryType, querybuildertypesv5.QueryTypePromQL, querybuildertypesv5.QueryTypeClickHouseSQL))
		return
	}

	// Create extractor
	extractor, err := NewExtractor(extractorType)
	if err != nil {
		a.settings.Logger.ErrorContext(r.Context(), "failed to create extractor", "extractor_type", extractorType, "error", err)
		render.Error(w, err)
		return
	}

	// Extract filter results
	result, err := extractor.Extract(query)
	if err != nil {
		a.settings.Logger.ErrorContext(r.Context(), "query filter extraction failed", "query_type", req.QueryType, "error", err)
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
