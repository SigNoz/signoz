package queryparser

import (
	"context"
	"fmt"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/queryparser/queryfilterextractor"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// QueryParser defines the interface for parsing and analyzing queries.
type QueryParser interface {
	// AnalyzeQueryFilter extracts filter conditions from a given query string.
	AnalyzeQueryFilter(ctx context.Context, queryType querybuildertypesv5.QueryType, query string) (*queryfilterextractor.FilterResult, error)
	// AnalyzeCompositeQuery extracts filter conditions from a composite query.
	AnalyzeCompositeQuery(ctx context.Context, compositeQuery *v3.CompositeQuery) (*queryfilterextractor.FilterResult, error)
	// ValidateCompositeQuery validates a composite query and returns an error if validation fails.
	ValidateCompositeQuery(ctx context.Context, compositeQuery *v3.CompositeQuery) error
}

type QueryParseError struct {
	StartPosition *int
	EndPosition   *int
	ErrorMessage  string
	Query         string
}

func (e *QueryParseError) Error() string {
	if e.StartPosition != nil && e.EndPosition != nil {
		return fmt.Sprintf("query parse error: %s at position %d:%d", e.ErrorMessage, *e.StartPosition, *e.EndPosition)
	}
	return fmt.Sprintf("query parse error: %s", e.ErrorMessage)
}
