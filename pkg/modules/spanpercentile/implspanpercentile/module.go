package implspanpercentile

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/querier"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	querier querier.Querier
}

func NewModule(
	querier querier.Querier,
	_ factory.ProviderSettings,
) spanpercentile.Module {
	return &module{
		querier: querier,
	}
}

func (m *module) GetSpanPercentile(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, req *spanpercentiletypes.SpanPercentileRequest) (*spanpercentiletypes.SpanPercentileResponse, error) {
	queryRangeRequest, err := buildSpanPercentileQuery(ctx, req)
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

	return transformToSpanPercentileResponse(result)
}

func transformToSpanPercentileResponse(queryResult *qbtypes.QueryRangeResponse) (*spanpercentiletypes.SpanPercentileResponse, error) {
	if len(queryResult.Data.Results) == 0 {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "no data returned from query")
	}

	scalarData, ok := queryResult.Data.Results[0].(*qbtypes.ScalarData)
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "unexpected result type")
	}

	if len(scalarData.Data) == 0 {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "no rows returned from query")
	}

	row := scalarData.Data[0]

	columnMap := make(map[string]int)
	for i, col := range scalarData.Columns {
		columnMap[col.Name] = i
	}

	p50Idx, ok := columnMap["__result_0"]
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "missing __result_0 column")
	}
	p90Idx, ok := columnMap["__result_1"]
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "missing __result_1 column")
	}
	p99Idx, ok := columnMap["__result_2"]
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "missing __result_2 column")
	}
	positionIdx, ok := columnMap["__result_3"]
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "missing __result_3 column")
	}

	p50, err := toInt64(row[p50Idx])
	if err != nil {
		return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "no spans found matching the specified criteria")
	}
	p90, err := toInt64(row[p90Idx])
	if err != nil {
		return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "no spans found matching the specified criteria")
	}
	p99, err := toInt64(row[p99Idx])
	if err != nil {
		return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "no spans found matching the specified criteria")
	}
	position, err := toFloat64(row[positionIdx])
	if err != nil {
		return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "no spans found matching the specified criteria")
	}

	description := fmt.Sprintf("faster than %.1f%% of spans", position)
	if position < 50 {
		description = fmt.Sprintf("slower than %.1f%% of spans", 100-position)
	}

	return &spanpercentiletypes.SpanPercentileResponse{
		Percentiles: spanpercentiletypes.PercentileStats{
			P50: p50,
			P90: p90,
			P99: p99,
		},
		Position: spanpercentiletypes.PercentilePosition{
			Percentile:  position,
			Description: description,
		},
	}, nil
}

func toInt64(val any) (int64, error) {
	switch v := val.(type) {
	case int64:
		return v, nil
	case int:
		return int64(v), nil
	case uint64:
		return int64(v), nil
	case float64:
		if v != v {
			return 0, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is NaN")
		}
		return int64(v), nil
	case float32:
		if v != v {
			return 0, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is NaN")
		}
		return int64(v), nil
	default:
		return 0, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert %T to int64", val)
	}
}

func toFloat64(val any) (float64, error) {
	switch v := val.(type) {
	case float64:
		if v != v {
			return 0, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is NaN")
		}
		return v, nil
	case float32:
		if v != v {
			return 0, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "value is NaN")
		}
		return float64(v), nil
	case int:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case uint64:
		return float64(v), nil
	default:
		return 0, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert %T to float64", val)
	}
}
