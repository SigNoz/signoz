package metricsexplorer

import (
	"context"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/model/metrics_explorer"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

type SummaryService struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
	cache     MetricsExplorerCache
}

func NewSummaryService(reader interfaces.Reader, querierV2 interfaces.Querier) *SummaryService {
	return &SummaryService{reader: reader, querierV2: querierV2}
}

func (receiver *SummaryService) FilterKeys(ctx context.Context, params *metrics_explorer.FilterKeyRequest) (*metrics_explorer.FilterKeyResponse, *model.ApiError) {
	var response metrics_explorer.FilterKeyResponse
	keys, apiError := receiver.reader.GetAllMetricFilterAttributeKeys(
		ctx,
		params,
		true,
	)
	if apiError != nil {
		return nil, apiError
	}
	response.AttributeKeys = *keys
	var availableColumnFilter []string
	for key := range metrics_explorer.AvailableColumnFilterMap {
		availableColumnFilter = append(availableColumnFilter, string(key))
	}
	response.MetricColumns = availableColumnFilter
	return &response, nil
}

func (receiver *SummaryService) FilterValues(ctx context.Context, params *metrics_explorer.FilterValueRequest) (*metrics_explorer.FilterValueResponse, *model.ApiError) {
	var response metrics_explorer.FilterValueResponse
	switch params.FilterTypeKey {
	case metrics_explorer.FilterKeyMetricName:
		request := v3.AggregateAttributeRequest{DataSource: v3.DataSourceMetrics, SearchText: params.SearchText, Limit: params.Limit}
		attributes, err := receiver.reader.GetMetricAggregateAttributes(ctx, &request, true)
		if err != nil {
			return nil, model.InternalError(err)
		}
		response.FilterValues = attributes.AttributeKeys
		return &response, nil
	case metrics_explorer.FilterKeyAttributes:
		attributes, err := receiver.reader.GetAllMetricFilterAttributeValues(ctx, params)
		if err != nil {
			return nil, err
		}
		response.FilterValues = *attributes
		return &response, nil
	case metrics_explorer.FilterKeyUnit:
		attributes, err := receiver.reader.GetAllMetricFilterUnits(ctx, params)
		if err != nil {
			return nil, err
		}
		response.FilterValues = *attributes
		return &response, nil
	default:
		return nil, nil
	}
}
