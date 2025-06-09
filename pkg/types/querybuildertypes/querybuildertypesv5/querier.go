package querybuildertypesv5

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Querier interface {
	QueryRange(ctx context.Context, orgID valuer.UUID, req *QueryRangeRequest) (*QueryRangeResponse, error)
}
