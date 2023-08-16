package v3

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestBuildQuery(t *testing.T) {
	t.Run("TestSimpleQueryWithName", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						AggregateOperator:  v3.AggregateOperatorRateMax,
						Expression:         "A",
					},
				},
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
			},
		}
		query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)
		require.Contains(t, query, "WHERE metric_name = 'name'")
	})
}

func TestBuildQueryWithFilters(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "a"}, Value: "b", Operator: v3.FilterOperatorNotEqual},
							{Key: v3.AttributeKey{Key: "code"}, Value: "ERROR_*", Operator: v3.FilterOperatorNotRegex},
						}},
						AggregateOperator: v3.AggregateOperatorRateMax,
						Expression:        "A",
					},
				},
			},
		}
		query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Contains(t, query, "WHERE metric_name = 'name' AND temporality IN ['Cumulative', 'Unspecified'] AND JSONExtractString(labels, 'a') != 'b'")
		require.Contains(t, query, rateWithoutNegative)
		require.Contains(t, query, "not match(JSONExtractString(labels, 'code'), 'ERROR_*')")
	})
}

func TestBuildQueryWithMultipleQueries(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
						}},
						AggregateOperator: v3.AggregateOperatorRateAvg,
						Expression:        "A",
					},
					"B": {
						QueryName:          "B",
						AggregateAttribute: v3.AttributeKey{Key: "name2"},
						AggregateOperator:  v3.AggregateOperatorRateMax,
						Expression:         "B",
					},
				},
			},
		}

		query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Contains(t, query, "WHERE metric_name = 'name' AND temporality IN ['Cumulative', 'Unspecified'] AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		require.Contains(t, query, rateWithoutNegative)
	})
}

func TestBuildQueryOperators(t *testing.T) {
	testCases := []struct {
		operator            v3.FilterOperator
		filterSet           v3.FilterSet
		expectedWhereClause string
	}{
		{
			operator: v3.FilterOperatorEqual,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "service_name"}, Value: "route", Operator: v3.FilterOperatorEqual},
				},
			},
			expectedWhereClause: "JSONExtractString(labels, 'service_name') = 'route'",
		},
		{
			operator: v3.FilterOperatorNotEqual,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "service_name"}, Value: "route", Operator: v3.FilterOperatorNotEqual},
				},
			},
			expectedWhereClause: "JSONExtractString(labels, 'service_name') != 'route'",
		},
		{
			operator: v3.FilterOperatorRegex,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "service_name"}, Value: "out", Operator: v3.FilterOperatorRegex},
				},
			},
			expectedWhereClause: "match(JSONExtractString(labels, 'service_name'), 'out')",
		},
		{
			operator: v3.FilterOperatorNotRegex,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "service_name"}, Value: "out", Operator: v3.FilterOperatorNotRegex},
				},
			},
			expectedWhereClause: "not match(JSONExtractString(labels, 'service_name'), 'out')",
		},
		{
			operator: v3.FilterOperatorIn,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "service_name"}, Value: []interface{}{"route", "driver"}, Operator: v3.FilterOperatorIn},
				},
			},
			expectedWhereClause: "JSONExtractString(labels, 'service_name') IN ['route','driver']",
		},
		{
			operator: v3.FilterOperatorNotIn,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "service_name"}, Value: []interface{}{"route", "driver"}, Operator: v3.FilterOperatorNotIn},
				},
			},
			expectedWhereClause: "JSONExtractString(labels, 'service_name') NOT IN ['route','driver']",
		},
		{
			operator: v3.FilterOperatorExists,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "horn"}, Operator: v3.FilterOperatorExists},
				},
			},
			expectedWhereClause: "has(JSONExtractKeys(labels), 'horn')",
		},
		{
			operator: v3.FilterOperatorNotExists,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "horn"}, Operator: v3.FilterOperatorNotExists},
				},
			},
			expectedWhereClause: "not has(JSONExtractKeys(labels), 'horn')",
		},
		{
			operator: v3.FilterOperatorContains,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "service_name"}, Value: "out", Operator: v3.FilterOperatorContains},
				},
			},
			expectedWhereClause: "like(JSONExtractString(labels, 'service_name'), '%out%')",
		},
		{
			operator: v3.FilterOperatorNotContains,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "serice_name"}, Value: "out", Operator: v3.FilterOperatorNotContains},
				},
			},
			expectedWhereClause: "notLike(JSONExtractString(labels, 'serice_name'), '%out%')",
		},
		{
			operator: v3.FilterOperatorLike,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "service_name"}, Value: "dri", Operator: v3.FilterOperatorLike},
				},
			},
			expectedWhereClause: "like(JSONExtractString(labels, 'service_name'), 'dri')",
		},
		{
			operator: v3.FilterOperatorNotLike,
			filterSet: v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "serice_name"}, Value: "dri", Operator: v3.FilterOperatorNotLike},
				},
			},
			expectedWhereClause: "notLike(JSONExtractString(labels, 'serice_name'), 'dri')",
		},
	}

	for i, tc := range testCases {
		t.Run(fmt.Sprintf("case %d", i), func(t *testing.T) {
			mq := v3.BuilderQuery{
				QueryName:          "A",
				AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
				AggregateOperator:  v3.AggregateOperatorSum,
			}
			whereClause, err := buildMetricsTimeSeriesFilterQuery(&tc.filterSet, []v3.AttributeKey{}, &mq)
			require.NoError(t, err)
			require.Contains(t, whereClause, tc.expectedWhereClause)
		})
	}
}

func TestBuildQueryXRate(t *testing.T) {
	t.Run("TestBuildQueryXRate", func(t *testing.T) {

		tmpl := `SELECT  ts, %s(value) as value FROM (SELECT  ts, if(runningDifference(ts) <= 0, nan, if(runningDifference(value) < 0, (value) / runningDifference(ts), runningDifference(value) / runningDifference(ts))) as value FROM(SELECT fingerprint,  toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 0 SECOND) as ts, max(value) as value FROM signoz_metrics.distributed_samples_v2 INNER JOIN (SELECT  fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'name' AND temporality IN ['Cumulative', 'Unspecified']) as filtered_time_series USING fingerprint WHERE metric_name = 'name' AND timestamp_ms >= 1650991982000 AND timestamp_ms <= 1651078382000 GROUP BY fingerprint, ts ORDER BY fingerprint,  ts) WHERE isNaN(value) = 0) GROUP BY GROUPING SETS ( (ts), () ) ORDER BY  ts`

		cases := []struct {
			aggregateOperator v3.AggregateOperator
			expectedQuery     string
		}{
			{
				aggregateOperator: v3.AggregateOperatorAvgRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorAvgRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorMaxRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorMaxRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorMinRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorMinRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorSumRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorSumRate]),
			},
		}

		for _, c := range cases {

			q := &v3.QueryRangeParamsV3{
				Start: 1650991982000,
				End:   1651078382000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							AggregateOperator:  c.aggregateOperator,
							Expression:         "A",
						},
					},
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
				},
			}
			query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
			require.NoError(t, err)
			require.Equal(t, query, c.expectedQuery)
		}
	})
}
