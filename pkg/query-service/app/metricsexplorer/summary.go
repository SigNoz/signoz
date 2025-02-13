package metricsexplorer

import (
	"context"
	"encoding/json"
	"time"

	"go.uber.org/zap"

	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/model/metrics_explorer"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"golang.org/x/sync/errgroup"
)

type SummaryService struct {
	reader    interfaces.Reader
	querierV2 interfaces.Querier
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
		availableColumnFilter = append(availableColumnFilter, key)
	}
	response.MetricColumns = availableColumnFilter
	return &response, nil
}

func (receiver *SummaryService) FilterValues(ctx context.Context, params *metrics_explorer.FilterValueRequest) (*metrics_explorer.FilterValueResponse, *model.ApiError) {
	var response metrics_explorer.FilterValueResponse
	switch params.FilterKey {
	case "metric_name":
		var filterValues []string
		request := v3.AggregateAttributeRequest{DataSource: v3.DataSourceMetrics, SearchText: params.SearchText, Limit: params.Limit}
		attributes, err := receiver.reader.GetMetricAggregateAttributes(ctx, &request, true)
		if err != nil {
			return nil, model.InternalError(err)
		}
		for _, item := range attributes.AttributeKeys {
			filterValues = append(filterValues, item.Key)
		}
		response.FilterValues = filterValues
		return &response, nil
	case "unit":
		attributes, err := receiver.reader.GetAllMetricFilterUnits(ctx, params)
		if err != nil {
			return nil, err
		}
		response.FilterValues = attributes
		return &response, nil
	default:
		attributes, err := receiver.reader.GetAllMetricFilterAttributeValues(ctx, params)
		if err != nil {
			return nil, err
		}
		response.FilterValues = attributes
		return &response, nil
	}
}

func (receiver *SummaryService) GetMetricsSummary(ctx context.Context, metricName string) (metrics_explorer.MetricDetailsDTO, *model.ApiError) {
	var metricDetailsDTO metrics_explorer.MetricDetailsDTO
	g, ctx := errgroup.WithContext(ctx)

	// Call 1: GetMetricMetadata
	g.Go(func() error {
		metadata, err := receiver.reader.GetMetricMetadata(ctx, metricName, metricName)
		if err != nil {
			return &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		metricDetailsDTO.Name = metricName
		metricDetailsDTO.Unit = metadata.Unit
		metricDetailsDTO.Description = metadata.Description
		metricDetailsDTO.Type = metadata.Type
		metricDetailsDTO.Metadata.MetricType = metadata.Type
		metricDetailsDTO.Metadata.Description = metadata.Description
		metricDetailsDTO.Metadata.Unit = metadata.Unit
		return nil
	})

	// Call 2: GetMetricsDataPointsAndLastReceived
	g.Go(func() error {
		dataPoints, lastReceived, err := receiver.reader.GetMetricsDataPointsAndLastReceived(ctx, metricName)
		if err != nil {
			return err
		}
		metricDetailsDTO.DataPoints = dataPoints
		metricDetailsDTO.LastReceived = lastReceived
		return nil
	})

	// Call 3: GetTotalTimeSeriesForMetricName
	g.Go(func() error {
		totalSeries, cardinality, err := receiver.reader.GetTotalTimeSeriesForMetricName(ctx, metricName)
		if err != nil {
			return err
		}
		metricDetailsDTO.TimeSeriesTotal = totalSeries
		metricDetailsDTO.Cardinality = cardinality
		return nil
	})

	// Call 4: GetActiveTimeSeriesForMetricName
	g.Go(func() error {
		activeSeries, err := receiver.reader.GetActiveTimeSeriesForMetricName(ctx, metricName, 30*time.Minute)
		if err != nil {
			return err
		}
		metricDetailsDTO.TimeSeriesActive = activeSeries
		return nil
	})

	// Call 5: GetAttributesForMetricName
	g.Go(func() error {
		attributes, err := receiver.reader.GetAttributesForMetricName(ctx, metricName)
		if err != nil {
			return err
		}
		if attributes != nil {
			metricDetailsDTO.Attributes = *attributes
		}
		return nil
	})

	// Call 6: GetDashboardsWithMetricName
	g.Go(func() error {
		data, err := dashboards.GetDashboardsWithMetricName(ctx, metricName)
		if err != nil {
			return err
		}
		if data != nil {
			jsonData, err := json.Marshal(data)
			if err != nil {
				zap.L().Error("Error marshalling data:", zap.Error(err))
				return &model.ApiError{Typ: "MarshallingErr", Err: err}
			}

			var dashboards []metrics_explorer.Dashboard
			err = json.Unmarshal(jsonData, &dashboards)
			if err != nil {
				zap.L().Error("Error unmarshalling data:", zap.Error(err))
				return &model.ApiError{Typ: "UnMarshallingErr", Err: err}
			}
			metricDetailsDTO.Dashboards = dashboards
		}
		return nil
	})

	// Wait for all goroutines and handle any errors
	if err := g.Wait(); err != nil {
		// Type assert to check if it's already an ApiError
		if apiErr, ok := err.(*model.ApiError); ok {
			return metrics_explorer.MetricDetailsDTO{}, apiErr
		}
		// If it's not an ApiError, wrap it in one
		return metrics_explorer.MetricDetailsDTO{}, &model.ApiError{Typ: "InternalError", Err: err}
	}

	return metricDetailsDTO, nil
}

func (receiver *SummaryService) ListMetricsWithSummary(ctx context.Context, params *metrics_explorer.SummaryListMetricsRequest) (*metrics_explorer.SummaryListMetricsResponse, *model.ApiError) {
	return receiver.reader.ListSummaryMetrics(ctx, params)
}
