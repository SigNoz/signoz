package querybuildertypesv5

import "context"

type Querier interface {
	QueryRange(ctx context.Context, req QueryRangeRequest) (QueryRangeResponse, error)
}
