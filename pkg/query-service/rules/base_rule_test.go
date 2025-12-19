package rules

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
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

// func TestBaseRule_FilterNewSeries(t *testing.T) {
// 	logger := instrumentationtest.New().Logger()
// 	ctx := context.Background()
// 	delay := 30 * time.Minute
// 	evalTime := time.Unix(1_700_000_000, 0)

// 	builderSpec := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
// 		Name:   "A",
// 		Signal: telemetrytypes.SignalMetrics,
// 		GroupBy: []qbtypes.GroupByKey{
// 			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service_name"}},
// 			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
// 		},
// 		Aggregations: []qbtypes.MetricAggregation{
// 			{MetricName: "request_total"},
// 		},
// 	}

// 	firstSeen := map[model.MetricMetadataLookupKey]int64{
// 		{MetricName: "request_total", AttributeName: "service_name", AttributeValue: "svc-old"}: evalTime.Add(-2 * delay).UnixMilli(),
// 		{MetricName: "request_total", AttributeName: "env", AttributeValue: "prod"}:             evalTime.Add(-2 * delay).UnixMilli(),
// 		{MetricName: "request_total", AttributeName: "service_name", AttributeValue: "svc-new"}: evalTime.Add(-5 * time.Minute).UnixMilli(),
// 	}

// 	qp := queryparser.New(factory.ProviderSettings{})

// 	reader := &mockReader{response: firstSeen}
// 	baseRule := &BaseRule{
// 		ruleCondition: &ruletypes.RuleCondition{
// 			CompositeQuery: &v3.CompositeQuery{
// 				QueryType: v3.QueryTypeBuilder,
// 				Queries: []qbtypes.QueryEnvelope{{
// 					Type: qbtypes.QueryTypeBuilder,
// 					Spec: builderSpec,
// 				}},
// 			},
// 		},
// 		queryParser:       qp,
// 		newGroupEvalDelay: &delay,
// 		reader:            reader,
// 		logger:            logger,
// 	}

// 	vector := ruletypes.Vector{
// 		{Metric: labels.Labels{{Name: labels.MetricNameLabel, Value: "request_total"}, {Name: "service_name", Value: "svc-old"}, {Name: "env", Value: "prod"}}},
// 		{Metric: labels.Labels{{Name: labels.MetricNameLabel, Value: "request_total"}, {Name: "service_name", Value: "svc-new"}, {Name: "env", Value: "prod"}}},
// 		{Metric: labels.Labels{{Name: labels.MetricNameLabel, Value: "request_total"}, {Name: "service_name", Value: "svc-missing"}, {Name: "env", Value: "stage"}}},
// 		{Metric: labels.Labels{{Name: labels.MetricNameLabel, Value: "request_total"}, {Name: "status", Value: "200"}}},
// 	}

// 	collection := ruletypes.NewVectorLabelledCollection(vector)
// 	filtered, skipped, err := baseRule.FilterNewSeries(ctx, evalTime, collection)
// 	require.NoError(t, err)
// 	require.Equal(t, 2, skipped)

// 	filteredVector := filtered.(*ruletypes.VectorLabelledCollection).Vector()
// 	require.Len(t, filteredVector, 2)
// 	services := make([]string, 0, len(filteredVector))
// 	for _, sample := range filteredVector {
// 		services = append(services, sample.Metric.Get("service_name"))
// 	}
// 	require.ElementsMatch(t, []string{"svc-old", ""}, services)
// }

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
