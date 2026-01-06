package queryparser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/queryparser/queryfilterextractor"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// QueryParser defines the interface for parsing and analyzing queries.
type QueryParser interface {
	// AnalyzeQueryFilter extracts filter conditions from a given query string.
	AnalyzeQueryFilter(ctx context.Context, queryType querybuildertypesv5.QueryType, query string) (*queryfilterextractor.FilterResult, error)
	// AnalyzeQueryEnvelopes extracts filter conditions from a list of query envelopes.
	// Returns an array of FilterResult, where each element corresponds to the filter result
	// for the query at the same index in queries.
	AnalyzeQueryEnvelopes(ctx context.Context, queries []qbtypes.QueryEnvelope) ([]*queryfilterextractor.FilterResult, error)
}
