package querier

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Querier interface defines the contract for querying data.
type Querier interface {
	QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error)
	QueryRawStream(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, client *qbtypes.RawStream)
	statsreporter.StatsCollector
	// QueryRangePreview validates and renders the queries without executing them.
	QueryRangePreview(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, opts qbtypes.QueryRangePreviewOptions) (*qbtypes.QueryRangePreviewResponse, error)
}

// BucketCache is the interface for bucket-based caching.
type BucketCache interface {
	// cached portion + list of gaps to fetch
	GetMissRanges(ctx context.Context, orgID valuer.UUID, q qbtypes.Query, step qbtypes.Step) (cached *qbtypes.Result, missing []*qbtypes.TimeRange)
	// store fresh buckets for future hits
	Put(ctx context.Context, orgID valuer.UUID, q qbtypes.Query, step qbtypes.Step, fresh *qbtypes.Result)
}

type Handler interface {
	QueryRange(rw http.ResponseWriter, req *http.Request)
	// QueryRangePreview is the dry-run endpoint: validate and render without executing.
	QueryRangePreview(rw http.ResponseWriter, req *http.Request)
	QueryRawStream(rw http.ResponseWriter, req *http.Request)
	ReplaceVariables(rw http.ResponseWriter, req *http.Request)
}
