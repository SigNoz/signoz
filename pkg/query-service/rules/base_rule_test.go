package rules

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
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

// createTestSeries creates a *v3.Series with the given labels and optional points
// so we don't exactly need the points in the series because the labels are used to determine if the series is new or old
// we use the labels to create a lookup key for the series and then check the first_seen timestamp for the series in the metadata table
func createTestSeries(labels map[string]string, points []v3.Point) *v3.Series {
	if points == nil {
		points = []v3.Point{}
	}
	return &v3.Series{
		Labels: labels,
		Points: points,
	}
}

// seriesEqual compares two v3.Series by their labels
// Returns true if the series have the same labels (order doesn't matter)
func seriesEqual(s1, s2 *v3.Series) bool {
	if s1 == nil && s2 == nil {
		return true
	}
	if s1 == nil || s2 == nil {
		return false
	}
	if len(s1.Labels) != len(s2.Labels) {
		return false
	}
	for k, v := range s1.Labels {
		if s2.Labels[k] != v {
			return false
		}
	}
	return true
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
func createFirstSeenMap(metricName string, groupByFields []string, evalTime time.Time, delay time.Duration, isOld bool, attributeValues ...string) map[telemetrytypes.MetricMetadataLookupKey]int64 {
	result := make(map[telemetrytypes.MetricMetadataLookupKey]int64)
	firstSeen := calculateFirstSeen(evalTime, delay, isOld)

	for i, field := range groupByFields {
		if i < len(attributeValues) {
			key := telemetrytypes.MetricMetadataLookupKey{
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
func mergeFirstSeenMaps(maps ...map[telemetrytypes.MetricMetadataLookupKey]int64) map[telemetrytypes.MetricMetadataLookupKey]int64 {
	result := make(map[telemetrytypes.MetricMetadataLookupKey]int64)
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

// filterNewSeriesTestCase represents a test case for FilterNewSeries
type filterNewSeriesTestCase struct {
	name              string
	compositeQuery    *v3.CompositeQuery
	series            []*v3.Series
	firstSeenMap      map[telemetrytypes.MetricMetadataLookupKey]int64
	newGroupEvalDelay *time.Duration
	evalTime          time.Time
	expectedFiltered  []*v3.Series // series that should be in the final filtered result (old enough)
	expectError       bool
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-new", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-missing", "env": "stage"}, nil),
			},
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc-old", "prod"),
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, false, "svc-new", "prod"),
				// svc-missing has no metadata, so it will be included
			),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-missing", "env": "stage"}, nil),
			}, // svc-old and svc-missing should be included; svc-new is filtered out
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-new1", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-new2", "env": "stage"}, nil),
			},
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, false, "svc-new1", "prod"),
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, false, "svc-new2", "stage"),
			),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered:  []*v3.Series{}, // all should be filtered out (new series)
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old1", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-old2", "env": "stage"}, nil),
			},
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc-old1", "prod"),
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc-old2", "stage"),
			),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old1", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-old2", "env": "stage"}, nil),
			}, // all should be included (old series)
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			firstSeenMap:      make(map[telemetrytypes.MetricMetadataLookupKey]int64),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			}, // early return, no filtering - all series included
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			firstSeenMap:      make(map[telemetrytypes.MetricMetadataLookupKey]int64),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			}, // early return, no filtering - all series included
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"status": "200"}, nil), // no service_name or env
			},
			firstSeenMap:      make(map[telemetrytypes.MetricMetadataLookupKey]int64),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"status": "200"}, nil),
			}, // series included as we can't decide if it's new or old
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-no-metadata", "env": "prod"}, nil),
			},
			firstSeenMap: createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc-old", "prod"),
			// svc-no-metadata has no entry in firstSeenMap
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-old", "env": "prod"}, nil),
				createTestSeries(map[string]string{"service_name": "svc-no-metadata", "env": "prod"}, nil),
			}, // both should be included - svc-old is old, svc-no-metadata can't be decided
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-partial", "env": "prod"}, nil),
			},
			// Only provide metadata for service_name, not env
			firstSeenMap: map[telemetrytypes.MetricMetadataLookupKey]int64{
				{MetricName: "request_total", AttributeName: "service_name", AttributeValue: "svc-partial"}: calculateFirstSeen(defaultEvalTime, defaultDelay, true),
				// env metadata is missing
			},
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc-partial", "env": "prod"}, nil),
			}, // has some metadata, uses max first_seen which is old
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
			series:            []*v3.Series{},
			firstSeenMap:      make(map[telemetrytypes.MetricMetadataLookupKey]int64),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered:  []*v3.Series{},
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			firstSeenMap:      createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc1", "prod"),
			newGroupEvalDelay: func() *time.Duration { d := time.Duration(0); return &d }(), // zero delay
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			}, // with zero delay, all series pass
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc1", "prod"),
				createFirstSeenMap("error_total", defaultGroupByFields, defaultEvalTime, defaultDelay, true, "svc1", "prod"),
			),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1", "env": "prod"}, nil),
			},
			// service_name is old, env is new - should use max (new)
			firstSeenMap: mergeFirstSeenMaps(
				createFirstSeenMap("request_total", []string{"service_name"}, defaultEvalTime, defaultDelay, true, "svc1"),
				createFirstSeenMap("request_total", []string{"env"}, defaultEvalTime, defaultDelay, false, "prod"),
			),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered:  []*v3.Series{}, // max first_seen is new, so should be filtered out
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1"}, nil),
				createTestSeries(map[string]string{"service_name": "svc2"}, nil),
			},
			firstSeenMap:      make(map[telemetrytypes.MetricMetadataLookupKey]int64),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1"}, nil),
				createTestSeries(map[string]string{"service_name": "svc2"}, nil),
			}, // Logs queries should return early, no filtering - all included
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
			series: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1"}, nil),
				createTestSeries(map[string]string{"service_name": "svc2"}, nil),
			},
			firstSeenMap:      make(map[telemetrytypes.MetricMetadataLookupKey]int64),
			newGroupEvalDelay: &defaultDelay,
			evalTime:          defaultEvalTime,
			expectedFiltered: []*v3.Series{
				createTestSeries(map[string]string{"service_name": "svc1"}, nil),
				createTestSeries(map[string]string{"service_name": "svc2"}, nil),
			}, // Traces queries should return early, no filtering - all included
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create postableRule from compositeQuery
			postableRule := createPostableRule(tt.compositeQuery)

			// Setup telemetry store mock
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

			// Setup mock metadata store
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()

			// Create query parser
			queryParser := queryparser.New(settings)

			// Use query parser to extract metric names and groupBy fields
			analyzeResults, err := queryParser.AnalyzeQueryEnvelopes(context.Background(), tt.compositeQuery.Queries)
			require.NoError(t, err)

			// Aggregate results from all queries
			metricNames := []string{}
			groupedFields := []string{}
			for _, result := range analyzeResults {
				metricNames = append(metricNames, result.MetricNames...)
				for _, col := range result.GroupByColumns {
					groupedFields = append(groupedFields, col.OriginField)
				}
			}

			// Setup metadata query mock
			mockMetadataStore.SetFirstSeenFromMetricMetadata(tt.firstSeenMap)

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
			rule, err := NewBaseRule("test-rule", valuer.GenerateUUID(), &postableRule, reader, WithQueryParser(queryParser), WithLogger(logger), WithMetadataStore(mockMetadataStore))
			require.NoError(t, err)

			filteredSeries, err := rule.FilterNewSeries(context.Background(), tt.evalTime, tt.series)

			if tt.expectError {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)

			// Build a map to count occurrences of each unique label combination in expected series
			expectedCounts := make(map[string]int)
			for _, expected := range tt.expectedFiltered {
				key := labelsKey(expected.Labels)
				expectedCounts[key]++
			}

			// Build a map to count occurrences of each unique label combination in filtered series
			actualCounts := make(map[string]int)
			for _, filtered := range filteredSeries {
				key := labelsKey(filtered.Labels)
				actualCounts[key]++
			}

			// Verify counts match for all expected label combinations
			for key, expectedCount := range expectedCounts {
				actualCount := actualCounts[key]
				require.Equal(t, expectedCount, actualCount, "series with labels %s should appear %d times, but found %d times", key, expectedCount, actualCount)
			}

			// Verify no unexpected series were found (all actual series should be in expected)
			require.Equal(t, len(tt.expectedFiltered), len(filteredSeries), "filtered series count should match expected")
			for key := range actualCounts {
				_, exists := expectedCounts[key]
				require.True(t, exists, "unexpected series found with labels: %s", key)
			}
		})
	}
}

// labelsKey creates a deterministic string key from a labels map
// This is used to group series by their unique label combinations
func labelsKey(lbls map[string]string) string {
	if len(lbls) == 0 {
		return ""
	}
	return labels.FromMap(lbls).String()
}
