package metricsexplorer

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"go.uber.org/zap"

	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/model/metrics_explorer"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/rules"
	"golang.org/x/sync/errgroup"
)

type SummaryService struct {
	reader       interfaces.Reader
	alertManager *rules.Manager
}

func NewSummaryService(reader interfaces.Reader, alertManager *rules.Manager) *SummaryService {
	return &SummaryService{reader: reader, alertManager: alertManager}
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
	case "metric_unit":
		attributes, err := receiver.reader.GetAllMetricFilterUnits(ctx, params)
		if err != nil {
			return nil, err
		}
		response.FilterValues = attributes
		return &response, nil
	case "metric_type":
		attributes, err := receiver.reader.GetAllMetricFilterTypes(ctx, params)
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

	g.Go(func() error {
		dataPoints, err := receiver.reader.GetMetricsDataPoints(ctx, metricName)
		if err != nil {
			return err
		}
		metricDetailsDTO.Samples = dataPoints
		return nil
	})

	g.Go(func() error {
		lastReceived, err := receiver.reader.GetMetricsLastReceived(ctx, metricName)
		if err != nil {
			return err
		}
		metricDetailsDTO.LastReceived = lastReceived
		return nil
	})

	g.Go(func() error {
		totalSeries, err := receiver.reader.GetTotalTimeSeriesForMetricName(ctx, metricName)
		if err != nil {
			return err
		}
		metricDetailsDTO.TimeSeriesTotal = totalSeries
		return nil
	})

	g.Go(func() error {
		activeSeries, err := receiver.reader.GetActiveTimeSeriesForMetricName(ctx, metricName, 120*time.Minute)
		if err != nil {
			return err
		}
		metricDetailsDTO.TimeSeriesActive = activeSeries
		return nil
	})

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

	g.Go(func() error {
		var metrics []string
		var metricsAlerts []metrics_explorer.Alert
		metrics = append(metrics, metricName)
		data, err := receiver.alertManager.GetAlertDetailsForMetricNames(ctx, metrics)
		if err != nil {
			return err
		}
		if rulesLists, ok := data[metricName]; ok {
			for _, rule := range rulesLists {
				metricsAlerts = append(metricsAlerts, metrics_explorer.Alert{AlertName: rule.AlertName, AlertID: rule.Id})
			}
		}
		metricDetailsDTO.Alerts = metricsAlerts
		return nil
	})

	// Wait for all goroutines and handle any errors
	if err := g.Wait(); err != nil {

		var apiErr *model.ApiError
		if errors.As(err, &apiErr) {
			return metrics_explorer.MetricDetailsDTO{}, apiErr
		}
		return metrics_explorer.MetricDetailsDTO{}, &model.ApiError{Typ: "InternalError", Err: err}
	}

	return metricDetailsDTO, nil
}

func (receiver *SummaryService) ListMetricsWithSummary(ctx context.Context, params *metrics_explorer.SummaryListMetricsRequest) (*metrics_explorer.SummaryListMetricsResponse, *model.ApiError) {
	return receiver.reader.ListSummaryMetrics(ctx, params)
}

func (receiver *SummaryService) GetMetricsTreemap(ctx context.Context, params *metrics_explorer.TreeMapMetricsRequest) (*metrics_explorer.TreeMap, *model.ApiError) {
	var response metrics_explorer.TreeMap
	switch params.Treemap {
	case metrics_explorer.TimeSeriesTeeMap:
		cardinality, apiError := receiver.reader.GetMetricsTimeSeriesPercentage(ctx, params)
		if apiError != nil {
			return nil, apiError
		}
		response.TimeSeries = *cardinality
		return &response, nil
	case metrics_explorer.SamplesTreeMap:
		dataPoints, apiError := receiver.reader.GetMetricsSamplesPercentage(ctx, params)
		if apiError != nil {
			return nil, apiError
		}
		response.Samples = *dataPoints
		return &response, nil
	default:
		return nil, nil
	}
}
