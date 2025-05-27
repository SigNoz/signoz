package implqueryrange

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/queryrange"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type module struct {
	querier qbtypes.Querier
}

func NewModule(querier qbtypes.Querier) queryrange.Module {
	return &module{querier: querier}
}

func (m *module) QueryRange(ctx context.Context, orgID string, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {
	return m.querier.QueryRange(ctx, orgID, req)
}
