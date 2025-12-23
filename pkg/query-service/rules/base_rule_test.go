package rules

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

func TestBaseRule_RequireMinPoints(t *testing.T) {
	threshold := 1.0
	tests := []struct {
		name        string
		rule        *BaseRule
		shouldAlert bool
		series      *v3.Series
	}{
		{
			name: "test should skip if less than min points",
			rule: &BaseRule{
				ruleCondition: &ruletypes.RuleCondition{
					RequireMinPoints:  true,
					RequiredNumPoints: 4,
				},

				Threshold: ruletypes.BasicRuleThresholds{
					{
						Name:        "test-threshold",
						TargetValue: &threshold,
						CompareOp:   ruletypes.ValueIsAbove,
						MatchType:   ruletypes.AtleastOnce,
					},
				},
			},
			series: &v3.Series{
				Points: []v3.Point{
					{Value: 1},
					{Value: 2},
				},
			},
			shouldAlert: false,
		},
		{
			name: "test should alert if more than min points",
			rule: &BaseRule{
				ruleCondition: &ruletypes.RuleCondition{
					RequireMinPoints:  true,
					RequiredNumPoints: 4,
					CompareOp:         ruletypes.ValueIsAbove,
					MatchType:         ruletypes.AtleastOnce,
					Target:            &threshold,
				},
				Threshold: ruletypes.BasicRuleThresholds{
					{
						Name:        "test-threshold",
						TargetValue: &threshold,
						CompareOp:   ruletypes.ValueIsAbove,
						MatchType:   ruletypes.AtleastOnce,
					},
				},
			},
			series: &v3.Series{
				Points: []v3.Point{
					{Value: 1},
					{Value: 2},
					{Value: 3},
					{Value: 4},
				},
			},
			shouldAlert: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := test.rule.Threshold.Eval(*test.series, "", ruletypes.EvalData{})
			require.NoError(t, err)
			require.Equal(t, len(test.series.Points) >= test.rule.ruleCondition.RequiredNumPoints, test.shouldAlert)
		})
	}
}

// createTestSeries creates a v3.Series with the given labels and optional points
// so we don't exactly need the points in the series because the labels are used to determine if the series is new or old
// we use the labels to create a lookup key for the series and then check the first_seen timestamp for the series in the metadata table
func createTestSeries(labels map[string]string, points []v3.Point) v3.Series {
	if points == nil {
		points = []v3.Point{}
	}
	return v3.Series{
		Labels: labels,
		Points: points,
	}
}

// calculateFirstSeen calculates first_seen timestamp based on evalTime, delay, and isOld flag
func calculateFirstSeen(evalTime time.Time, delay time.Duration, isOld bool) int64 {
	if isOld {
		// Old: evalTime - (2 * delay)
		return evalTime.Add(-2 * delay).UnixMilli()
	}
	// New: evalTime - (delay / 2)
	return evalTime.Add(-delay / 2).UnixMilli()
}

// createFirstSeenMap creates a first_seen map for a series with given attributes
// metricName: the metric name
// groupByFields: list of groupBy field names
// evalTime: evaluation time
// delay: newGroupEvalDelay
// isOld: whether the series is old (true) or new (false)
// attributeValues: values for each groupBy field in order
func createFirstSeenMap(metricName string, groupByFields []string, evalTime time.Time, delay time.Duration, isOld bool, attributeValues ...string) map[model.MetricMetadataLookupKey]int64 {
	result := make(map[model.MetricMetadataLookupKey]int64)
	firstSeen := calculateFirstSeen(evalTime, delay, isOld)

	for i, field := range groupByFields {
		if i < len(attributeValues) {
			key := model.MetricMetadataLookupKey{
				MetricName:     metricName,
				AttributeName:  field,
				AttributeValue: attributeValues[i],
			}
			result[key] = firstSeen
		}
	}

	return result
}

// mergeFirstSeenMaps merges multiple first_seen maps into one
// When the same key exists in multiple maps, it keeps the lowest value
// which simulatest the behavior of the ClickHouse query
// finding the minimum first_seen timestamp across all groupBy attributes for a single series
func mergeFirstSeenMaps(maps ...map[model.MetricMetadataLookupKey]int64) map[model.MetricMetadataLookupKey]int64 {
	result := make(map[model.MetricMetadataLookupKey]int64)
	for _, m := range maps {
		for k, v := range m {
			if existingValue, exists := result[k]; exists {
				// Keep the lowest value
				if v < existingValue {
					result[k] = v
				}
			} else {
				result[k] = v
			}
		}
	}
	return result
}

// createPostableRule creates a PostableRule with the given CompositeQuery
func createPostableRule(compositeQuery *v3.CompositeQuery) ruletypes.PostableRule {
	return ruletypes.PostableRule{
		AlertName: "Test Rule",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{
			Kind: ruletypes.RollingEvaluation,
			Spec: ruletypes.RollingWindow{
				EvalWindow: ruletypes.Duration(5 * time.Minute),
				Frequency:  ruletypes.Duration(1 * time.Minute),
			},
		},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: compositeQuery,
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{
					{
						Name:        "test-threshold",
						TargetValue: func() *float64 { v := 1.0; return &v }(),
						CompareOp:   ruletypes.ValueIsAbove,
						MatchType:   ruletypes.AtleastOnce,
					},
				},
			},
		},
	}
}

// setupMetadataQueryMock sets up the ClickHouse mock for GetFirstSeenFromMetricMetadata query
func setupMetadataQueryMock(telemetryStore *telemetrystoretest.Provider, metricNames []string, groupedFields []string, series []v3.Series, firstSeenMap map[model.MetricMetadataLookupKey]int64) {
	if len(firstSeenMap) == 0 || len(series) == 0 {
		return
	}

	// Build args from series the same way we build lookup keys in FilterNewSeries
	var args []any
	uniqueArgsMap := make(map[string]struct{})
	for _, s := range series {
		labelMap := s.Labels
		for _, metricName := range metricNames {
			for _, groupByKey := range groupedFields {
				if attrValue, ok := labelMap[groupByKey]; ok {
					argKey := fmt.Sprintf("%s,%s,%s", metricName, groupByKey, attrValue)
					if _, ok := uniqueArgsMap[argKey]; ok {
						continue
					}
					uniqueArgsMap[argKey] = struct{}{}
					args = append(args, metricName, groupByKey, attrValue)
				}
			}
		}
	}

	// Build the query pattern - it uses IN clause with tuples
	// We'll match any query that contains the metadata table pattern
	metadataCols := []cmock.ColumnType{
		{Name: "metric_name", Type: "String"},
		{Name: "attr_name", Type: "String"},
		{Name: "attr_string_value", Type: "String"},
		{Name: "first_seen", Type: "UInt64"},
	}

	var values [][]interface{}
	for key, firstSeen := range firstSeenMap {
		values = append(values, []interface{}{
			key.MetricName,
			key.AttributeName,
			key.AttributeValue,
			uint64(firstSeen),
		})
	}

	rows := cmock.NewRows(metadataCols, values)
	telemetryStore.Mock().
		ExpectQuery("SELECT any").
		WithArgs(args...).
		WillReturnRows(rows)
}

// filterNewSeriesTestCase represents a test case for FilterNewSeries
type filterNewSeriesTestCase struct {
	name                string
	compositeQuery      *v3.CompositeQuery
	series              []v3.Series
	firstSeenMap        map[model.MetricMetadataLookupKey]int64
	newGroupEvalDelay   *time.Duration
	evalTime            time.Time
	expectedSkipIndexes []int
	expectError         bool
}

func TestBaseRule_FilterNewSeries(t *testing.T) {
	defaultEvalTime := time.Unix(1700000000, 0)
	defaultDelay := 2 * time.Minute
	defaultGroupByFields := []string{"service_name", "env"}

	logger := instrumentationtest.New().Logger()
	settings := instrumentationtest.New().ToProviderSettings()

	tests := []filterNewSeriesTestCase{
		{
			name: "mixed old and new series - Builder query",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName:       "request_total",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
							},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-new", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-missing", "env": "stage"}, nil),
			},
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc-old", "prod"),
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, false, "svc-new", "prod"),
				// svc-missing has no metadata, so it will be skipped
			),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{1}, // svc-missing should be skipped as we can't decide if it is new or old series
		},
		{
			name: "all new series - PromQL query",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:     "P1",
							Query:    "sum by (service_name,env) (rate(request_total[5m]))",
							Disabled: false,
							Step:     qbtypes.Step{Duration: 0},
							Stats:    false,
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-new1", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-new2", "env": "stage"}, nil),
			},
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, false, "svc-new1", "prod"),
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, false, "svc-new2", "stage"),
			),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{0, 1}, // all should be skipped
		},
		{
			name: "all old series - ClickHouse query",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeClickHouseSQL,
						Spec: qbtypes.ClickHouseQuery{
							Name:     "CH1",
							Query:    "SELECT service_name, env FROM metrics WHERE metric_name='request_total' GROUP BY service_name, env",
							Disabled: false,
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old1", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-old2", "env": "stage"}, nil),
			},
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc-old1", "prod"),
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc-old2", "stage"),
			),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // none should be skipped
		},
		{
			name: "no grouping in query - Builder",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName:       "request_total",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
							GroupBy: []qbtypes.GroupByKey{},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			firstSeenMap:        make(map[model.MetricMetadataLookupKey]int64),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // early return, no filtering
		},
		{
			name: "no metric names - Builder",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
							},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			firstSeenMap:        make(map[model.MetricMetadataLookupKey]int64),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // early return, no filtering
		},
		{
			name: "series with no matching labels - Builder",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName:       "request_total",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
							},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"status": "200"}, nil), // no service_name or env
			},
			firstSeenMap:        make(map[model.MetricMetadataLookupKey]int64),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // series included as we can't decide if it's new or old
		},
		{
			name: "series with missing metadata - PromQL",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:     "P1",
							Query:    "sum by (service_name,env) (rate(request_total[5m]))",
							Disabled: false,
							Step:     qbtypes.Step{Duration: 0},
							Stats:    false,
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-no-metadata", "env": "prod"}, nil),
			},
			firstSeenMap: createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc-old", "prod"),
			// svc-no-metadata has no entry in firstSeenMap
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // svc-no-metadata should not be skipped as we can't decide if it is new or old series
		},
		{
			name: "series with partial metadata - ClickHouse",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeClickHouseSQL,
						Spec: qbtypes.ClickHouseQuery{
							Name:     "CH1",
							Query:    "SELECT service_name, env FROM metrics WHERE metric_name='request_total' GROUP BY service_name, env",
							Disabled: false,
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-partial", "env": "prod"}, nil),
			},
			// Only provide metadata for service_name, not env
			firstSeenMap: map[model.MetricMetadataLookupKey]int64{
				{MetricName: "request_total", AttributeName: "service_name", AttributeValue: "svc-partial"}: calculateFirstSeen(defaultEvalTime, defaultDelay, true),
				// env metadata is missing
			},
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // has some metadata, uses max first_seen which is old
		},
		{
			name: "empty series array - Builder",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName:       "request_total",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
							},
						},
					},
				},
			},
			series:              []v3.Series{},
			firstSeenMap:        make(map[model.MetricMetadataLookupKey]int64),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{},
		},
		{
			name: "zero delay - Builder",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName:       "request_total",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
							},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			firstSeenMap:        createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc1", "prod"),
			newGroupEvalDelay:   func() *time.Duration { d := time.Duration(0); return &d }(), // zero delay
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // with zero delay, all series pass
		},
		{
			name: "multiple metrics with same groupBy keys - Builder",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName:       "request_total",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
								{
									MetricName:       "error_total",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
							},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc1", "prod"),
				createFirstSeenMap("error_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc1", "prod"),
			),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{},
		},
		{
			name: "series with multiple groupBy attributes where one is new and one is old - Builder",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName:       "request_total",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
							},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			// service_name is old, env is new - should use max (new)
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", []string{"service_name"}, defaultEvalTime, defaultDelay, true, "svc1"),
				createFirstSeenMap("request_total", []string{"env"}, defaultEvalTime, defaultDelay, false, "prod"),
			),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{0}, // max first_seen is new, so should skip
		},
		{
			name: "Logs query - should skip filtering and return empty skip indexes",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalLogs,
							Aggregations: []qbtypes.LogAggregation{
								{
									Expression: "count()",
								},
							},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
							},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1"}, nil),
				createTestSeries(map[string]string{"service_name": "svc2"}, nil),
			},
			firstSeenMap:        make(map[model.MetricMetadataLookupKey]int64),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // Logs queries should return early, no filtering
		},
		{
			name: "Traces query - should skip filtering and return empty skip indexes",
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							Signal:       telemetrytypes.SignalTraces,
							Aggregations: []qbtypes.TraceAggregation{
								{
									Expression: "count()",
								},
							},
							GroupBy: []qbtypes.GroupByKey{
								{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
							},
						},
					},
				},
			},
			series: []v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1"}, nil),
				createTestSeries(map[string]string{"service_name": "svc2"}, nil),
			},
			firstSeenMap:        make(map[model.MetricMetadataLookupKey]int64),
			newGroupEvalDelay:   &defaultDelay,
			evalTime:            defaultEvalTime,
			expectedSkipIndexes: []int{}, // Traces queries should return early, no filtering
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create postableRule from compositeQuery
			postableRule := createPostableRule(tt.compositeQuery)

			// Setup telemetry store mock
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

			// Create query parser
			queryParser := queryparser.New(settings)

			// Use query parser to extract metric names and groupBy fields
			analyzeResult, err := queryParser.AnalyzeCompositeQuery(context.Background(), tt.compositeQuery)
			require.NoError(t, err)

			metricNames := analyzeResult.MetricNames
			groupedFields := []string{}
			for _, col := range analyzeResult.GroupByColumns {
				groupedFields = append(groupedFields, col.OriginField)
			}

			// Setup metadata query mock
			setupMetadataQueryMock(telemetryStore, metricNames, groupedFields, tt.series, tt.firstSeenMap)

			// Create reader with mocked telemetry store
			readerCache, err := cachetest.New(
				cache.Config{
					Provider: "memory",
					Memory: cache.Memory{
						NumCounters: 10 * 1000,
						MaxCost:     1 << 26,
					},
				},
			)
			require.NoError(t, err)

			options := clickhouseReader.NewOptions("", "", "archiveNamespace")
			reader := clickhouseReader.NewReader(
				nil,
				telemetryStore,
				prometheustest.New(context.Background(), settings, prometheus.Config{}, telemetryStore),
				"",
				time.Duration(time.Second),
				nil,
				readerCache,
				options,
			)

			// Set newGroupEvalDelay in NotificationSettings if provided
			if tt.newGroupEvalDelay != nil {
				postableRule.NotificationSettings = &ruletypes.NotificationSettings{
					NewGroupEvalDelay: func() *ruletypes.Duration {
						d := ruletypes.Duration(*tt.newGroupEvalDelay)
						return &d
					}(),
				}
			}

			// Create BaseRule using NewBaseRule
			rule, err := NewBaseRule("test-rule", valuer.GenerateUUID(), &postableRule, reader, WithQueryParser(queryParser), WithLogger(logger))
			require.NoError(t, err)

			skipIndexes, err := rule.FilterNewSeries(context.Background(), tt.evalTime, tt.series)

			if tt.expectError {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			require.ElementsMatch(t, tt.expectedSkipIndexes, skipIndexes, "skip indexes should match")
		})
	}
}
