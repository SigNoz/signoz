package querybuildertypesv5

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

// BucketCache is the only thing orchestrator cares about.
type BucketCache interface {
	// cached portion + list of gaps to fetch
	GetMissRanges(ctx context.Context, orgID valuer.UUID, q Query, step Step) (cached *Result, missing []*TimeRange)
	// store fresh buckets for future hits
	Put(ctx context.Context, orgID valuer.UUID, q Query, fresh *Result)
}
