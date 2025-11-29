package rules

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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

func TestBaseRule_ExtractMetricAndGroupBys(t *testing.T) {
	logger := instrumentationtest.New().Logger()
	ctx := context.Background()

	builderQueryWithGrouping := `
{
  "queryType":"builder",
  "panelType":"graph",
  "queries":[
    {
      "type":"builder_query",
      "spec":{
        "name":"A",
        "signal":"metrics",
        "stepInterval":null,
        "disabled":false,
        "filter":{"expression":""},
        "groupBy":[
          {"name":"service_name","fieldDataType":"","fieldContext":""},
          {"name":"env","fieldDataType":"","fieldContext":""}
        ],
        "aggregations":[
          {"metricName":"test_metric_cardinality","timeAggregation":"count","spaceAggregation":"sum"},
          {"metricName":"cpu_usage_total","timeAggregation":"avg","spaceAggregation":"avg"}
        ]
      }
    }
  ]
}
`

	builderQuerySingleGrouping := `
{
  "queryType":"builder",
  "panelType":"graph",
  "queries":[
    {
      "type":"builder_query",
      "spec":{
        "name":"B",
        "signal":"metrics",
        "stepInterval":null,
        "disabled":false,
        "groupBy":[
          {"name":"namespace","fieldDataType":"","fieldContext":""}
        ],
        "aggregations":[
          {"metricName":"latency_p50","timeAggregation":"avg","spaceAggregation":"max"}
        ]
      }
    }
  ]
}
`

	builderQueryNoGrouping := `
{
  "queryType":"builder",
  "panelType":"graph",
  "queries":[
    {
      "type":"builder_query",
      "spec":{
        "name":"C",
        "signal":"metrics",
        "stepInterval":null,
        "disabled":false,
        "groupBy":[],
        "aggregations":[
          {"metricName":"disk_usage_total","timeAggregation":"sum","spaceAggregation":"sum"}
        ]
      }
    }
  ]
}
`

	promQueryWithGrouping := `
{
  "queries":[
    {
      "type":"promql",
      "spec":{
        "name":"P1",
        "query":"sum by (pod,region) (rate(http_requests_total[5m]))",
        "disabled":false,
        "step":0,
        "stats":false
      }
    }
  ],
  "panelType":"graph",
  "queryType":"promql"
}
`

	promQuerySingleGrouping := `
{
  "queries":[
    {
      "type":"promql",
      "spec":{
        "name":"P2",
        "query":"sum by (env)(rate(cpu_usage_seconds_total{job=\"api\"}[5m]))",
        "disabled":false,
        "step":0,
        "stats":false
      }
    }
  ],
  "panelType":"graph",
  "queryType":"promql"
}
`

	promQueryNoGrouping := `
{
  "queries":[
    {
      "type":"promql",
      "spec":{
        "name":"P3",
        "query":"rate(node_cpu_seconds_total[1m])",
        "disabled":false,
        "step":0,
        "stats":false
      }
    }
  ],
  "panelType":"graph",
  "queryType":"promql"
}
`

	clickHouseQueryWithGrouping := `
{
  "queryType":"clickhouse_sql",
  "panelType":"graph",
  "queries":[
    {
      "type":"clickhouse_sql",
      "spec":{
        "name":"CH1",
        "query":"SELECT region as r, zone FROM metrics WHERE metric_name='cpu' GROUP BY region, zone",
        "disabled":false
      }
    }
  ]
}
`

	clickHouseQuerySingleGrouping := `
{
  "queryType":"clickhouse_sql",
  "panelType":"graph",
  "queries":[
    {
      "type":"clickhouse_sql",
      "spec":{
        "name":"CH2",
        "query":"SELECT region as r FROM metrics WHERE metric_name='cpu_usage' GROUP BY region",
        "disabled":false
      }
    }
  ]
}
`

	clickHouseQueryNoGrouping := `
{
  "queryType":"clickhouse_sql",
  "panelType":"graph",
  "queries":[
    {
      "type":"clickhouse_sql",
      "spec":{
        "name":"CH3",
        "query":"SELECT * FROM metrics WHERE metric_name = 'memory_usage'",
        "disabled":false
      }
    }
  ]
}
`

	tests := []struct {
		name        string
		payload     string
		wantMetrics []string
		wantGroupBy []string
	}{
		{
			name:        "builder multiple grouping",
			payload:     builderQueryWithGrouping,
			wantMetrics: []string{"test_metric_cardinality", "cpu_usage_total"},
			wantGroupBy: []string{"service_name", "env"},
		},
		{
			name:        "builder single grouping",
			payload:     builderQuerySingleGrouping,
			wantMetrics: []string{"latency_p50"},
			wantGroupBy: []string{"namespace"},
		},
		{
			name:        "builder no grouping",
			payload:     builderQueryNoGrouping,
			wantMetrics: []string{"disk_usage_total"},
			wantGroupBy: []string{},
		},
		{
			name:        "promql multiple grouping",
			payload:     promQueryWithGrouping,
			wantMetrics: []string{"http_requests_total"},
			wantGroupBy: []string{"pod", "region"},
		},
		{
			name:        "promql single grouping",
			payload:     promQuerySingleGrouping,
			wantMetrics: []string{"cpu_usage_seconds_total"},
			wantGroupBy: []string{"env"},
		},
		{
			name:        "promql no grouping",
			payload:     promQueryNoGrouping,
			wantMetrics: []string{"node_cpu_seconds_total"},
			wantGroupBy: []string{},
		},
		{
			name:        "clickhouse multiple grouping",
			payload:     clickHouseQueryWithGrouping,
			wantMetrics: []string{"cpu"},
			wantGroupBy: []string{"region", "zone"},
		},
		{
			name:        "clickhouse single grouping",
			payload:     clickHouseQuerySingleGrouping,
			wantMetrics: []string{"cpu_usage"},
			wantGroupBy: []string{"region"},
		},
		{
			name:        "clickhouse no grouping",
			payload:     clickHouseQueryNoGrouping,
			wantMetrics: []string{"memory_usage"},
			wantGroupBy: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cq := mustCompositeQuery(t, tt.payload)
			baseRule := &BaseRule{
				ruleCondition: &ruletypes.RuleCondition{CompositeQuery: cq},
				logger:        logger,
			}
			metrics, groupBys, err := baseRule.extractMetricAndGroupBys(ctx)
			require.NoError(t, err)
			require.ElementsMatch(t, tt.wantMetrics, metrics)
			require.ElementsMatch(t, tt.wantGroupBy, groupBys)
		})
	}
}

func TestBaseRule_FilterNewSeries(t *testing.T) {
	logger := instrumentationtest.New().Logger()
	ctx := context.Background()
	delay := 30 * time.Minute
	evalTime := time.Unix(1_700_000_000, 0)

	builderSpec := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		Name:   "A",
		Signal: telemetrytypes.SignalMetrics,
		GroupBy: []qbtypes.GroupByKey{
			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
		},
		Aggregations: []qbtypes.MetricAggregation{
			{MetricName: "request_total"},
		},
	}

	firstSeen := map[model.MetricMetadataLookupKey]int64{
		{MetricName: "request_total", AttributeName: "service_name", AttributeValue: "svc-old"}: evalTime.Add(-2 * delay).UnixMilli(),
		{MetricName: "request_total", AttributeName: "env", AttributeValue: "prod"}:             evalTime.Add(-2 * delay).UnixMilli(),
		{MetricName: "request_total", AttributeName: "service_name", AttributeValue: "svc-new"}: evalTime.Add(-5 * time.Minute).UnixMilli(),
	}

	reader := &mockReader{response: firstSeen}
	baseRule := &BaseRule{
		ruleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: builderSpec,
				}},
			},
		},
		newGroupEvalDelay: &delay,
		reader:            reader,
		logger:            logger,
	}

	vector := ruletypes.Vector{
		{Metric: labels.Labels{{Name: labels.MetricNameLabel, Value: "request_total"}, {Name: "service_name", Value: "svc-old"}, {Name: "env", Value: "prod"}}},
		{Metric: labels.Labels{{Name: labels.MetricNameLabel, Value: "request_total"}, {Name: "service_name", Value: "svc-new"}, {Name: "env", Value: "prod"}}},
		{Metric: labels.Labels{{Name: labels.MetricNameLabel, Value: "request_total"}, {Name: "service_name", Value: "svc-missing"}, {Name: "env", Value: "stage"}}},
		{Metric: labels.Labels{{Name: labels.MetricNameLabel, Value: "request_total"}, {Name: "status", Value: "200"}}},
	}

	collection := ruletypes.NewVectorLabelledCollection(vector)
	filtered, skipped, err := baseRule.FilterNewSeries(ctx, evalTime, collection)
	require.NoError(t, err)
	require.Equal(t, 2, skipped)

	filteredVector := filtered.(*ruletypes.VectorLabelledCollection).Vector()
	require.Len(t, filteredVector, 2)
	services := make([]string, 0, len(filteredVector))
	for _, sample := range filteredVector {
		services = append(services, sample.Metric.Get("service_name"))
	}
	require.ElementsMatch(t, []string{"svc-old", ""}, services)
}

func mustCompositeQuery(t *testing.T, payload string) *v3.CompositeQuery {
	t.Helper()
	var compositeQuery v3.CompositeQuery
	require.NoError(t, json.Unmarshal([]byte(payload), &compositeQuery))
	return &compositeQuery
}

type mockReader struct {
	interfaces.Reader
	response map[model.MetricMetadataLookupKey]int64
	err      error
	calls    [][]model.MetricMetadataLookupKey
}

func (m *mockReader) GetFirstSeenFromMetricMetadata(_ context.Context, lookupKeys []model.MetricMetadataLookupKey) (map[model.MetricMetadataLookupKey]int64, error) {
	keysCopy := append([]model.MetricMetadataLookupKey(nil), lookupKeys...)
	m.calls = append(m.calls, keysCopy)
	if m.err != nil {
		return nil, m.err
	}
	return m.response, nil
}
