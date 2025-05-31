package querybuildertypesv5

import "context"

type Querier interface {
	QueryRange(ctx context.Context, orgID string, req *QueryRangeRequest) (*QueryRangeResponse, error)
}
