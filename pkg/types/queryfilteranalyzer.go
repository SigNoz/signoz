package types

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// QueryFilterAnalyzeRequest represents the request body for query filter analysis
type QueryFilterAnalyzeRequest struct {
	Query     string `json:"query"`
	QueryType string `json:"queryType"`
}

// UnmarshalJSON implements custom JSON unmarshaling with validation and normalization
func (q *QueryFilterAnalyzeRequest) UnmarshalJSON(data []byte) error {
	// Use a temporary struct to avoid infinite recursion
	type tempQueryFilterAnalyzeRequest QueryFilterAnalyzeRequest
	aux := &tempQueryFilterAnalyzeRequest{}

	if err := json.Unmarshal(data, aux); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse json: %v", err)
	}

	// Trim and validate query is not empty
	q.Query = strings.TrimSpace(aux.Query)
	if q.Query == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "query is required and cannot be empty")
	}

	// Normalize queryType to lowercase and trim
	q.QueryType = strings.ToLower(strings.TrimSpace(aux.QueryType))

	return nil
}

// QueryFilterAnalyzeResponse represents the response body for query filter analysis
type QueryFilterAnalyzeResponse struct {
	MetricNames []string `json:"metricNames"`
	Groups      []string `json:"groups"`
}
