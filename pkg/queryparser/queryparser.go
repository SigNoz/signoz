package queryparser

import (
	"context"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/queryparser/queryfilterextractor"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// QueryParser defines the interface for parsing and analyzing queries.
type QueryParser interface {
	// AnalyzeQueryFilter extracts filter conditions from a given query string.
	AnalyzeQueryFilter(ctx context.Context, queryType querybuildertypesv5.QueryType, query string) (*queryfilterextractor.FilterResult, error)
	// AnalyzeCompositeQuery extracts filter conditions from a composite query.
	// Returns an array of FilterResult, where each element corresponds to the filter result
	// for the query at the same index in compositeQuery.Queries.
	AnalyzeCompositeQuery(ctx context.Context, compositeQuery *v3.CompositeQuery) ([]*queryfilterextractor.FilterResult, error)
}
