package metricsexplorer

import (
	"context"
	"encoding/json"
	"fmt"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/model/metrics_explorer"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"sync"
	"time"
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

func (receiver *SummaryService) GetMetricsSummary(ctx context.Context, metricName string) (metrics_explorer.MetricDetailsDTO, *model.ApiError) {
	var (
		wg               sync.WaitGroup
		metricDetailsDTO metrics_explorer.MetricDetailsDTO
		errCh            = make(chan *model.ApiError, 1)
	)

	// Create a context with cancellation to stop other goroutines on the first error
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	handleError := func(err *model.ApiError) {
		select {
		case errCh <- err: // Send the error if no error was sent yet
			cancel() // Cancel other goroutines
		default:
		}
	}

	wg.Add(6)

	go func() {
		defer wg.Done()
		metadata, err := receiver.reader.GetMetricMetadata(ctx, metricName, metricName)
		if err != nil {
			handleError(&model.ApiError{Typ: "ClickHouseError", Err: err})
			return
		}
		metricDetailsDTO.Name = metricName
		metricDetailsDTO.Unit = metadata.Unit
		metricDetailsDTO.Description = metadata.Description
		metricDetailsDTO.Type = metadata.Type
		metricDetailsDTO.Metadata.MetricType = metadata.Type
		metricDetailsDTO.Metadata.Description = metadata.Description
		metricDetailsDTO.Metadata.Unit = metadata.Unit
	}()

	// Call 1: GetMetricsDataPointsAndLastReceived
	go func() {
		defer wg.Done()
		dataPoints, lastReceived, err := receiver.reader.GetMetricsDataPointsAndLastReceived(ctx, metricName)
		if err != nil {
			handleError(err)
			return
		}
		metricDetailsDTO.DataPoints = dataPoints
		metricDetailsDTO.LastReceived = lastReceived
	}()

	// Call 2: GetTotalTimeSeriesForMetricName
	go func() {
		defer wg.Done()
		totalSeries, totalSeriesLastReceived, cardinality, err := receiver.reader.GetTotalTimeSeriesForMetricName(ctx, metricName)
		if err != nil {
			handleError(err)
			return
		}
		metricDetailsDTO.TimeSeriesTotal = totalSeries
		metricDetailsDTO.LastReceived = totalSeriesLastReceived
		metricDetailsDTO.Cardinality = cardinality
	}()

	// Call 3: GetActiveTimeSeriesForMetricName
	go func() {
		defer wg.Done()
		activeSeries, err := receiver.reader.GetActiveTimeSeriesForMetricName(ctx, metricName, 30*time.Minute)
		if err != nil {
			handleError(err)
			return
		}
		metricDetailsDTO.TimeSeriesActive = activeSeries
	}()

	// Call 4: GetAttributesForMetricName
	go func() {
		defer wg.Done()
		attributes, err := receiver.reader.GetAttributesForMetricName(ctx, metricName)
		if err != nil {
			handleError(err)
			return
		}
		if attributes != nil {
			metricDetailsDTO.Attributes = *attributes
		}
	}()

	go func() {
		defer wg.Done()
		data, err := dashboards.GetDashboardsWithMetricName(ctx, metricName)
		if err != nil {
			handleError(err)
			return
		}
		if data != nil {
			jsonData, err := json.Marshal(data)
			if err != nil {
				fmt.Printf("Error marshalling data: %v\n", err)
				return
			}

			// Unmarshal the JSON directly into a slice of Dashboard structs
			var dashboards []metrics_explorer.Dashboard
			err = json.Unmarshal(jsonData, &dashboards)
			if err != nil {
				fmt.Printf("Error unmarshalling JSON: %v\n", err)
				return
			}
			metricDetailsDTO.Dashboards = dashboards
		}
	}()

	//TODO: ADD ALERTS CONFIG

	// Wait for all goroutines to complete
	wg.Wait()
	close(errCh)

	// If an error occurred, return immediately
	if apiErr := <-errCh; apiErr != nil {
		return metrics_explorer.MetricDetailsDTO{}, apiErr
	}

	return metricDetailsDTO, nil
}

func (receiver *SummaryService) ListMetricsWithSummary(ctx context.Context, params *metrics_explorer.SummaryListMetricsRequest) (*metrics_explorer.SummaryListMetricsResponse, *model.ApiError) {
	return receiver.reader.ListSummaryMetrics(ctx, params)
}

func (receiver *SummaryService) GetMetricsTreemap(ctx context.Context, params *metrics_explorer.TreeMapMetricsRequest) (*metrics_explorer.TreeMap, *model.ApiError) {
	var response metrics_explorer.TreeMap
	switch params.Treemap {
	case metrics_explorer.CardinalityTreeMap:
		cardinality, apiError := receiver.reader.GetMetricsCardinalityPercentage(ctx, params)
		if apiError != nil {
			return nil, apiError
		}
		response.Cardinality = *cardinality
		return &response, nil
	case metrics_explorer.DataPointsTreeMap:
		dataPoints, apiError := receiver.reader.GetMetricsDataPointsPercentage(ctx, params)
		if apiError != nil {
			return nil, apiError
		}
		response.DataPoints = *dataPoints
		return &response, nil
	default:
		return nil, nil
	}
}
