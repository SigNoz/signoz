package querier

import (
	"context"
	"net/http"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Querier interface defines the contract for querying data.
type Querier interface {
	QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error)
	QueryRawStream(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, client *qbtypes.RawStream)
	// QueryRangePreview validates and renders the queries in req without
	// executing them. opts controls dry-run behavior such as which
	// EXPLAIN variant to attach to the response; the zero value performs
	// a validation-only preview with no EXPLAIN.
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
	QueryRawStream(rw http.ResponseWriter, req *http.Request)
	QueryRangePreview(rw http.ResponseWriter, req *http.Request)
	ReplaceVariables(rw http.ResponseWriter, req *http.Request)
}
