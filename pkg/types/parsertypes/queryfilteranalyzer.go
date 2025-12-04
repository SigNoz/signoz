package parsertypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// QueryFilterAnalyzeRequest represents the request body for query filter analysis
type QueryFilterAnalyzeRequest struct {
	Query     string                        `json:"query"`
	QueryType querybuildertypesv5.QueryType `json:"queryType"`
}

// UnmarshalJSON implements custom JSON unmarshaling with validation and normalization
func (q *QueryFilterAnalyzeRequest) UnmarshalJSON(data []byte) error {
	// Use a temporary struct to avoid infinite recursion
	type Alias QueryFilterAnalyzeRequest
	aux := (*Alias)(q)

	if err := json.Unmarshal(data, aux); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse json: %v", err)
	}

	// Trim and validate query is not empty
	q.Query = strings.TrimSpace(aux.Query)
	if q.Query == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "query is required and cannot be empty")
	}

	// Validate query type
	if aux.QueryType != querybuildertypesv5.QueryTypeClickHouseSQL && aux.QueryType != querybuildertypesv5.QueryTypePromQL {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported queryType: %v. Supported values are '%s' and '%s'", aux.QueryType, querybuildertypesv5.QueryTypePromQL, querybuildertypesv5.QueryTypeClickHouseSQL)
	}
	return nil
}

type ColumnInfoResponse struct {
	Name  string `json:"columnName"`
	Alias string `json:"columnAlias"`
}

// QueryFilterAnalyzeResponse represents the response body for query filter analysis
type QueryFilterAnalyzeResponse struct {
	MetricNames []string             `json:"metricNames"`
	Groups      []ColumnInfoResponse `json:"groups"`
}
