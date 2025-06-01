package metricsexplorer

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/model/metrics_explorer"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/errgroup"
)

type SummaryService struct {
	reader       interfaces.Reader
	rulesManager *rules.Manager
	dashboard    dashboard.Module
}

func NewSummaryService(reader interfaces.Reader, alertManager *rules.Manager, dashboard dashboard.Module) *SummaryService {
	return &SummaryService{reader: reader, rulesManager: alertManager, dashboard: dashboard}
}

func (receiver *SummaryService) FilterKeys(ctx context.Context, params *metrics_explorer.FilterKeyRequest) (*metrics_explorer.FilterKeyResponse, *model.ApiError) {
	var response metrics_explorer.FilterKeyResponse
	keys, apiError := receiver.reader.GetAllMetricFilterAttributeKeys(ctx, params)
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

func (receiver *SummaryService) FilterValues(ctx context.Context, orgID valuer.UUID, params *metrics_explorer.FilterValueRequest) (*metrics_explorer.FilterValueResponse, *model.ApiError) {
	var response metrics_explorer.FilterValueResponse
	switch params.FilterKey {
	case "metric_name":
		var filterValues []string
		request := v3.AggregateAttributeRequest{DataSource: v3.DataSourceMetrics, SearchText: params.SearchText, Limit: params.Limit}
		attributes, err := receiver.reader.GetMetricAggregateAttributes(ctx, orgID, &request, true)
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

func (receiver *SummaryService) GetMetricsSummary(ctx context.Context, orgID valuer.UUID, metricName string) (metrics_explorer.MetricDetailsDTO, *model.ApiError) {
	var metricDetailsDTO metrics_explorer.MetricDetailsDTO
	g, ctx := errgroup.WithContext(ctx)

	// Call 1: GetMetricMetadata
	g.Go(func() error {
		metadata, err := receiver.reader.GetMetricMetadata(ctx, orgID, metricName, metricName)
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
		metricDetailsDTO.Metadata.Temporality = metadata.Temporality
		metricDetailsDTO.Metadata.Monotonic = metadata.IsMonotonic
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
		attributes, err := receiver.reader.GetAttributesForMetricName(ctx, metricName, nil, nil, nil)
		if err != nil {
			return err
		}
		if attributes != nil {
			metricDetailsDTO.Attributes = *attributes
		}
		return nil
	})

	g.Go(func() error {
		var metricNames []string
		metricNames = append(metricNames, metricName)
		claims, errv2 := authtypes.ClaimsFromContext(ctx)
		if errv2 != nil {
			return &model.ApiError{Typ: model.ErrorInternal, Err: errv2}
		}

		orgID, err := valuer.NewUUID(claims.OrgID)
		if err != nil {
			return &model.ApiError{Typ: model.ErrorBadData, Err: err}
		}
		data, err := receiver.dashboard.GetByMetricNames(ctx, orgID, metricNames)
		if err != nil {
			return err
		}
		if data != nil {
			jsonData, err := json.Marshal(data)
			if err != nil {
				zap.L().Error("Error marshalling data:", zap.Error(err))
				return &model.ApiError{Typ: "MarshallingErr", Err: err}
			}

			var dashboards map[string][]metrics_explorer.Dashboard
			err = json.Unmarshal(jsonData, &dashboards)
			if err != nil {
				zap.L().Error("Error unmarshalling data:", zap.Error(err))
				return &model.ApiError{Typ: "UnMarshallingErr", Err: err}
			}
			if _, ok := dashboards[metricName]; ok {
				metricDetailsDTO.Dashboards = dashboards[metricName]
			}
		}
		return nil
	})

	g.Go(func() error {
		var metrics []string
		var metricsAlerts []metrics_explorer.Alert
		metrics = append(metrics, metricName)
		data, err := receiver.rulesManager.GetAlertDetailsForMetricNames(ctx, metrics)
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

func (receiver *SummaryService) ListMetricsWithSummary(ctx context.Context, orgID valuer.UUID, params *metrics_explorer.SummaryListMetricsRequest) (*metrics_explorer.SummaryListMetricsResponse, *model.ApiError) {
	return receiver.reader.ListSummaryMetrics(ctx, orgID, params)
}

func (receiver *SummaryService) GetMetricsTreemap(ctx context.Context, params *metrics_explorer.TreeMapMetricsRequest) (*metrics_explorer.TreeMap, *model.ApiError) {
	var response metrics_explorer.TreeMap
	switch params.Treemap {
	case metrics_explorer.TimeSeriesTeeMap:
		ts, apiError := receiver.reader.GetMetricsTimeSeriesPercentage(ctx, params)
		if apiError != nil {
			return nil, apiError
		}
		if ts != nil {
			response.TimeSeries = *ts
		}
		return &response, nil
	case metrics_explorer.SamplesTreeMap:
		samples, apiError := receiver.reader.GetMetricsSamplesPercentage(ctx, params)
		if apiError != nil {
			return nil, apiError
		}
		if samples != nil {
			response.Samples = *samples
		}
		return &response, nil
	default:
		return nil, nil
	}
}

func (receiver *SummaryService) GetRelatedMetrics(ctx context.Context, params *metrics_explorer.RelatedMetricsRequest) (*metrics_explorer.RelatedMetricsResponse, *model.ApiError) {
	// Get name similarity scores
	nameSimilarityScores, err := receiver.reader.GetNameSimilarity(ctx, params)
	if err != nil {
		return nil, err
	}

	attrCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	attrSimilarityScores, err := receiver.reader.GetAttributeSimilarity(attrCtx, params)
	if err != nil {
		// If we hit a deadline exceeded error, proceed with only name similarity
		if errors.Is(err.Err, context.DeadlineExceeded) {
			zap.L().Warn("Attribute similarity calculation timed out, proceeding with name similarity only")
			attrSimilarityScores = make(map[string]metrics_explorer.RelatedMetricsScore)
		} else {
			return nil, err
		}
	}

	// Combine scores and compute final scores
	finalScores := make(map[string]float64)
	relatedMetricsMap := make(map[string]metrics_explorer.RelatedMetricsScore)

	// Merge name and attribute similarity scores
	for metric, nameScore := range nameSimilarityScores {
		attrScore, exists := attrSimilarityScores[metric]
		if exists {
			relatedMetricsMap[metric] = metrics_explorer.RelatedMetricsScore{
				NameSimilarity:      nameScore.NameSimilarity,
				AttributeSimilarity: attrScore.AttributeSimilarity,
				Filters:             attrScore.Filters,
				MetricType:          attrScore.MetricType,
				Temporality:         attrScore.Temporality,
				IsMonotonic:         attrScore.IsMonotonic,
			}
		} else {
			relatedMetricsMap[metric] = nameScore
		}
		finalScores[metric] = nameScore.NameSimilarity*0.7 + relatedMetricsMap[metric].AttributeSimilarity*0.3
	}

	// Handle metrics that are only present in attribute similarity scores
	for metric, attrScore := range attrSimilarityScores {
		if _, exists := nameSimilarityScores[metric]; !exists {
			relatedMetricsMap[metric] = metrics_explorer.RelatedMetricsScore{
				AttributeSimilarity: attrScore.AttributeSimilarity,
				Filters:             attrScore.Filters,
				MetricType:          attrScore.MetricType,
				Temporality:         attrScore.Temporality,
				IsMonotonic:         attrScore.IsMonotonic,
			}
			finalScores[metric] = attrScore.AttributeSimilarity * 0.3
		}
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

	metricNames := make([]string, len(sortedScores))
	for i, ms := range sortedScores {
		metricNames[i] = ms.Name
	}

	// Fetch dashboards and alerts concurrently
	g, ctx := errgroup.WithContext(ctx)

	dashboardsRelatedData := make(map[string][]metrics_explorer.Dashboard)
	alertsRelatedData := make(map[string][]metrics_explorer.Alert)

	g.Go(func() error {
		claims, errv2 := authtypes.ClaimsFromContext(ctx)
		if errv2 != nil {
			return &model.ApiError{Typ: model.ErrorInternal, Err: errv2}
		}
		orgID, err := valuer.NewUUID(claims.OrgID)
		if err != nil {
			return &model.ApiError{Typ: model.ErrorBadData, Err: err}
		}
		names, err := receiver.dashboard.GetByMetricNames(ctx, orgID, metricNames)
		if err != nil {
			return err
		}
		if names != nil {
			jsonData, err := json.Marshal(names)
			if err != nil {
				zap.L().Error("Error marshalling dashboard data", zap.Error(err))
				return &model.ApiError{Typ: "MarshallingErr", Err: err}
			}
			err = json.Unmarshal(jsonData, &dashboardsRelatedData)
			if err != nil {
				zap.L().Error("Error unmarshalling dashboard data", zap.Error(err))
				return &model.ApiError{Typ: "UnMarshallingErr", Err: err}
			}
		}
		return nil
	})

	g.Go(func() error {
		rulesData, apiError := receiver.rulesManager.GetAlertDetailsForMetricNames(ctx, metricNames)
		if apiError != nil {
			return apiError
		}
		for s, gettableRules := range rulesData {
			var metricsRules []metrics_explorer.Alert
			for _, rule := range gettableRules {
				metricsRules = append(metricsRules, metrics_explorer.Alert{AlertID: rule.Id, AlertName: rule.AlertName})
			}
			alertsRelatedData[s] = metricsRules
		}
		return nil
	})

	// Check for context cancellation before waiting
	if ctx.Err() != nil {
		return nil, &model.ApiError{Typ: "ContextCanceled", Err: ctx.Err()}
	}

	if err := g.Wait(); err != nil {
		var apiErr *model.ApiError
		if errors.As(err, &apiErr) {
			return nil, apiErr
		}
		return nil, &model.ApiError{Typ: "InternalError", Err: err}
	}

	// Build response
	var response metrics_explorer.RelatedMetricsResponse
	for _, ms := range sortedScores {
		relatedMetric := metrics_explorer.RelatedMetrics{
			Name:  ms.Name,
			Query: getQueryRangeForRelateMetricsList(ms.Name, relatedMetricsMap[ms.Name]),
		}
		if dashboardsDetails, ok := dashboardsRelatedData[ms.Name]; ok {
			relatedMetric.Dashboards = dashboardsDetails
		}
		if alerts, ok := alertsRelatedData[ms.Name]; ok {
			relatedMetric.Alerts = alerts
		}
		response.RelatedMetrics = append(response.RelatedMetrics, relatedMetric)
	}

	return &response, nil
}

func getQueryRangeForRelateMetricsList(metricName string, scores metrics_explorer.RelatedMetricsScore) *v3.BuilderQuery {
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
		DataSource: v3.DataSourceMetrics,
		Expression: metricName, // Using metric name as expression
		Filters:    filters,
	}

	if scores.MetricType == v3.MetricTypeSum && !scores.IsMonotonic && scores.Temporality == v3.Cumulative {
		scores.MetricType = v3.MetricTypeGauge
	}

	switch scores.MetricType {
	case v3.MetricTypeGauge:
		query.TimeAggregation = v3.TimeAggregationAvg
		query.SpaceAggregation = v3.SpaceAggregationAvg
	case v3.MetricTypeSum:
		query.TimeAggregation = v3.TimeAggregationRate
		query.SpaceAggregation = v3.SpaceAggregationSum
	case v3.MetricTypeHistogram:
		query.SpaceAggregation = v3.SpaceAggregationPercentile95
	}

	query.AggregateAttribute = v3.AttributeKey{
		Key:  metricName,
		Type: v3.AttributeKeyType(scores.MetricType),
	}

	query.StepInterval = 60

	return &query
}

func (receiver *SummaryService) GetInspectMetrics(ctx context.Context, params *metrics_explorer.InspectMetricsRequest) (*metrics_explorer.InspectMetricsResponse, *model.ApiError) {
	// Capture the original context.
	parentCtx := ctx

	// Create an errgroup using the original context.
	g, egCtx := errgroup.WithContext(ctx)

	var attributes []metrics_explorer.Attribute
	var resourceAttrs map[string]uint64

	// Run the two queries concurrently using the derived context.
	g.Go(func() error {
		attrs, apiErr := receiver.reader.GetAttributesForMetricName(egCtx, params.MetricName, &params.Start, &params.End, &params.Filters)
		if apiErr != nil {
			return apiErr
		}
		if attrs != nil {
			attributes = *attrs
		}
		return nil
	})

	g.Go(func() error {
		resAttrs, apiErr := receiver.reader.GetMetricsAllResourceAttributes(egCtx, params.Start, params.End)
		if apiErr != nil {
			return apiErr
		}
		if resAttrs != nil {
			resourceAttrs = resAttrs
		}
		return nil
	})

	// Wait for the concurrent operations to complete.
	if err := g.Wait(); err != nil {
		return nil, &model.ApiError{Typ: "InternalError", Err: err}
	}

	// Use the parentCtx (or create a new context from it) for the rest of the calls.
	if parentCtx.Err() != nil {
		return nil, &model.ApiError{Typ: "ContextCanceled", Err: parentCtx.Err()}
	}

	// Build a set of attribute keys for O(1) lookup.
	attributeKeys := make(map[string]struct{})
	for _, attr := range attributes {
		attributeKeys[attr.Key] = struct{}{}
	}

	// Filter resource attributes that are present in attributes.
	var validAttrs []string
	for attrName := range resourceAttrs {
		normalizedAttrName := strings.ReplaceAll(attrName, ".", "_")
		if _, ok := attributeKeys[normalizedAttrName]; ok {
			validAttrs = append(validAttrs, normalizedAttrName)
		}
	}

	// Get top 3 resource attributes (or use top attributes by valueCount if none match).
	if len(validAttrs) > 3 {
		validAttrs = validAttrs[:3]
	} else if len(validAttrs) == 0 {
		sort.Slice(attributes, func(i, j int) bool {
			return attributes[i].ValueCount > attributes[j].ValueCount
		})
		for i := 0; i < len(attributes) && i < 3; i++ {
			validAttrs = append(validAttrs, attributes[i].Key)
		}
	}
	fingerprints, apiError := receiver.reader.GetInspectMetricsFingerprints(parentCtx, validAttrs, params)
	if apiError != nil {
		return nil, apiError
	}

	baseResponse, apiErr := receiver.reader.GetInspectMetrics(parentCtx, params, fingerprints)
	if apiErr != nil {
		return nil, apiErr
	}

	return baseResponse, nil
}

func (receiver *SummaryService) UpdateMetricsMetadata(ctx context.Context, orgID valuer.UUID, params *metrics_explorer.UpdateMetricsMetadataRequest) *model.ApiError {
	if params.MetricType == v3.MetricTypeSum && !params.IsMonotonic && params.Temporality == v3.Cumulative {
		params.MetricType = v3.MetricTypeGauge
	}
	metadata := model.UpdateMetricsMetadata{
		MetricName:  params.MetricName,
		MetricType:  params.MetricType,
		Temporality: params.Temporality,
		Unit:        params.Unit,
		Description: params.Description,
		IsMonotonic: params.IsMonotonic,
		CreatedAt:   time.Now(),
	}
	apiError := receiver.reader.UpdateMetricsMetadata(ctx, orgID, &metadata)
	if apiError != nil {
		return apiError
	}
	return nil
}
