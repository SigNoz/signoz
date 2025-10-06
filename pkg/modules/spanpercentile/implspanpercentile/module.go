package implspanpercentile

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/querier"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	querier querier.Querier
}

func NewModule(querier querier.Querier) spanpercentile.Module {
	return &module{querier: querier}
}

func (m *module) GetSpanPercentileDetails(ctx context.Context, orgID valuer.UUID, req *spanpercentiletypes.SpanPercentileRequest) (*qbtypes.QueryRangeResponse, error) {
	queryRangeRequest, err := buildSpanPercentileQuery(req)
	if err != nil {
		return nil, err
	}

	if err := queryRangeRequest.Validate(); err != nil {
		return nil, err
	}

	result, err := m.querier.QueryRange(ctx, orgID, queryRangeRequest)
	if err != nil {
		return nil, err
	}

	return result, nil
}
