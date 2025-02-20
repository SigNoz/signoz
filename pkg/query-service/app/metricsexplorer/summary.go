package metricsexplorer

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
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

	// Call 2: GetMetricsDataPointsAndLastReceived
	g.Go(func() error {
		dataPoints, lastReceived, err := receiver.reader.GetMetricsDataPointsAndLastReceived(ctx, metricName)
		if err != nil {
			return err
		}
		metricDetailsDTO.Samples = dataPoints
		metricDetailsDTO.LastReceived = lastReceived
		return nil
	})

	// Call 3: GetTotalTimeSeriesForMetricName
	g.Go(func() error {
		totalSeries, err := receiver.reader.GetTotalTimeSeriesForMetricName(ctx, metricName)
		if err != nil {
			return err
		}
		metricDetailsDTO.TimeSeriesTotal = totalSeries
		return nil
	})

	// Call 4: GetActiveTimeSeriesForMetricName
	g.Go(func() error {
		activeSeries, err := receiver.reader.GetActiveTimeSeriesForMetricName(ctx, metricName, 120*time.Minute)
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

func (receiver *SummaryService) GetRelatedMetrics(ctx context.Context, params *metrics_explorer.RelatedMetricsRequest) (*metrics_explorer.RelatedMetricsResponse, *model.ApiError) {
	var relatedMetricsResponse metrics_explorer.RelatedMetricsResponse

	relatedMetricsMap, err := receiver.reader.GetRelatedMetrics(ctx, params)
	if err != nil {
		return nil, &model.ApiError{Typ: "Error", Err: err}
	}

	finalScores := make(map[string]float64)
	for metric, scores := range relatedMetricsMap {
		finalScores[metric] = scores.NameSimilarity*0.5 + scores.AttributeSimilarity*0.5
	}

	type metricScore struct {
		Name  string
		Score float64
	}
	var sortedScores []metricScore
	for metric, score := range finalScores {
		sortedScores = append(sortedScores, metricScore{
			Name:  metric,
			Score: score,
		})
	}

	sort.Slice(sortedScores, func(i, j int) bool {
		return sortedScores[i].Score > sortedScores[j].Score
	})

	// Extract metric names for retrieving dashboard information
	var metricNames []string
	for _, ms := range sortedScores {
		metricNames = append(metricNames, ms.Name)
	}

	dashboardsInfo, err := dashboards.GetDashboardsWithMetricNames(ctx, metricNames)
	if err != nil {
		return nil, &model.ApiError{Typ: "Error", Err: err}
	}

	// Build the final response using the sorted order
	for _, ms := range sortedScores {
		var dashboardsList []metrics_explorer.Dashboard

		if dashEntries, ok := dashboardsInfo[ms.Name]; ok {
			for _, dashInfo := range dashEntries {
				dashboardsList = append(dashboardsList, metrics_explorer.Dashboard{
					DashboardName: dashInfo["dashboard_title"],
					DashboardID:   dashInfo["dashboard_id"],
					WidgetID:      dashInfo["widget_id"],
					WidgetName:    dashInfo["widget_title"],
				})
			}
		}

		relatedMetric := metrics_explorer.RelatedMetrics{
			Name:       ms.Name,
			Dashboards: dashboardsList,
			Query:      GetQueryRangeForRelateMetricsList(ms.Name, relatedMetricsMap[ms.Name]),
		}

		relatedMetricsResponse.RelatedMetrics = append(relatedMetricsResponse.RelatedMetrics, relatedMetric)
	}

	return &relatedMetricsResponse, nil
}

func GetQueryRangeForRelateMetricsList(metricName string, scores metrics_explorer.RelatedMetricsScore) *v3.BuilderQuery {
	var filterItems []v3.FilterItem
	for _, pair := range scores.Filters {
		if len(pair) < 2 {
			continue // Skip invalid filter pairs.
		}
		filterItem := v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      pair[0], // Default type, or you can use v3.AttributeKeyTypeUnspecified.
				IsColumn: false,
				IsJSON:   false,
			},
			Value:    pair[1],
			Operator: v3.FilterOperatorEqual, // Using "=" as the operator.
		}
		filterItems = append(filterItems, filterItem)
	}

	// If there are any filters, combine them with an "AND" operator.
	var filters *v3.FilterSet
	if len(filterItems) > 0 {
		filters = &v3.FilterSet{
			Operator: "AND",
			Items:    filterItems,
		}
	}

	// Create the BuilderQuery. Here we set the QueryName to the metric name.
	query := v3.BuilderQuery{
		QueryName:  metricName,
		DataSource: v3.DataSourceMetrics, // Assuming the data source is metrics.
		Expression: metricName,           // Using metric name as expression (can be adjusted as needed).
		Filters:    filters,
	}

	if strings.EqualFold(scores.MetricType, "Gauge") {
		query.TimeAggregation = v3.TimeAggregationAvg
		query.SpaceAggregation = v3.SpaceAggregationAvg
	} else if strings.EqualFold(scores.MetricType, "Sum") {
		query.TimeAggregation = v3.TimeAggregationRate
		query.SpaceAggregation = v3.SpaceAggregationSum
	}

	query.AggregateAttribute = v3.AttributeKey{
		Key:  metricName,                             // Use the metric name as the attribute key. // Assuming a numeric value.
		Type: v3.AttributeKeyType(scores.MetricType), // "Gauge" or "Sum" as provided.
	}

	query.StepInterval = 60

	return &query
}

func (receiver *SummaryService) GetInspectMetrics(ctx context.Context, params *metrics_explorer.InspectMetricsRequest) (*metrics_explorer.InspectMetricsResponse, *model.ApiError) {
	return receiver.reader.GetInspectMetrics(ctx, params)
}
