package querier

import (
	"context"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Querier interface defines the contract for querying data
type Querier interface {
	QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error)
	QueryRawStream(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, client *qbtypes.RawStream)
}

// BucketCache is the interface for bucket-based caching
type BucketCache interface {
	// cached portion + list of gaps to fetch
	GetMissRanges(ctx context.Context, orgID valuer.UUID, q qbtypes.Query, step qbtypes.Step) (cached *qbtypes.Result, missing []*qbtypes.TimeRange)
	// store fresh buckets for future hits
	Put(ctx context.Context, orgID valuer.UUID, q qbtypes.Query, step qbtypes.Step, fresh *qbtypes.Result)
}
