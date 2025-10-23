package implspanpercentile

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	querier                   querier.Querier
	preferenceModule          preference.Module
	resourceFilterStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	metadataStore             telemetrytypes.MetadataStore
}

func NewModule(
	querier querier.Querier,
	preferenceModule preference.Module,
	providerSettings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
) spanpercentile.Module {
	resourceFilterFieldMapper := resourcefilter.NewFieldMapper()
	resourceFilterConditionBuilder := resourcefilter.NewConditionBuilder(resourceFilterFieldMapper)
	resourceFilterStmtBuilder := resourcefilter.NewTraceResourceFilterStatementBuilder(
		providerSettings,
		resourceFilterFieldMapper,
		resourceFilterConditionBuilder,
		metadataStore,
	)

	return &module{
		querier:                   querier,
		preferenceModule:          preferenceModule,
		resourceFilterStmtBuilder: resourceFilterStmtBuilder,
		metadataStore:             metadataStore,
	}
}

func (m *module) GetSpanPercentile(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, req *spanpercentiletypes.SpanPercentileRequest) (*spanpercentiletypes.SpanPercentileResponse, error) {
	queryRangeRequest, err := buildSpanPercentileQuery(ctx, req, m.resourceFilterStmtBuilder, m.metadataStore)
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

	attrKeys := make([]any, 0, len(req.ResourceAttributes))
	for key := range req.ResourceAttributes {
		attrKeys = append(attrKeys, key)
	}
	_ = m.preferenceModule.UpdateByUser(ctx, userID, preferencetypes.NameSpanPercentileResourceAttributes, attrKeys)

	return transformToSpanPercentileResponse(result)
}

func transformToSpanPercentileResponse(queryResult *qbtypes.QueryRangeResponse) (*spanpercentiletypes.SpanPercentileResponse, error) {
	if len(queryResult.Data.Results) == 0 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "no data returned from query")
	}

	scalarData, ok := queryResult.Data.Results[0].(*qbtypes.ScalarData)
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "unexpected result type")
	}

	if len(scalarData.Data) == 0 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "no rows returned from query")
	}

	row := scalarData.Data[0]

	columnMap := make(map[string]int)
	for i, col := range scalarData.Columns {
		columnMap[col.Name] = i
	}

	p50Idx, ok := columnMap["p50_duration_nano"]
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "missing p50_duration_nano column")
	}
	p90Idx, ok := columnMap["p90_duration_nano"]
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "missing p90_duration_nano column")
	}
	p99Idx, ok := columnMap["p99_duration_nano"]
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "missing p99_duration_nano column")
	}
	positionIdx, ok := columnMap["percentile_position"]
	if !ok {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "missing percentile_position column")
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
