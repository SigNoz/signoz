package v3

import (
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

		require.Contains(t, query, "WHERE metric_name = 'name' AND JSONExtractString(labels, 'a') != 'b'")
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

		require.Contains(t, query, "WHERE metric_name = 'name' AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		require.Contains(t, query, rateWithoutNegative)
	})
}

func TestBuildQueryOperators(t *testing.T) {

	operators := []v3.FilterOperator{
		v3.FilterOperatorEqual,
		v3.FilterOperatorNotEqual,
		v3.FilterOperatorRegex,
		v3.FilterOperatorNotRegex,
		v3.FilterOperatorIn,
		v3.FilterOperatorNotIn,
		v3.FilterOperatorExists,
		v3.FilterOperatorNotExists,
		v3.FilterOperatorContains,
		v3.FilterOperatorNotContains,
		v3.FilterOperatorLike,
		v3.FilterOperatorNotLike,
	}

	filterSets := []v3.FilterSet{
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "service_name"}, Value: "route", Operator: v3.FilterOperatorEqual},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "service_name"}, Value: "route", Operator: v3.FilterOperatorNotEqual},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "service_name"}, Value: "out", Operator: v3.FilterOperatorRegex},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "service_name"}, Value: "out", Operator: v3.FilterOperatorNotRegex},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "service_name"}, Value: []interface{}{"route", "driver"}, Operator: v3.FilterOperatorIn},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "service_name"}, Value: []interface{}{"route", "driver"}, Operator: v3.FilterOperatorNotIn},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "horn"}, Operator: v3.FilterOperatorExists},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "horn"}, Operator: v3.FilterOperatorNotExists},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "service_name"}, Operator: v3.FilterOperatorContains, Value: "out"},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "serice_name"}, Operator: v3.FilterOperatorNotContains, Value: "out"},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "service_name"}, Operator: v3.FilterOperatorLike, Value: "dri"},
		}},
		{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "a"}, Operator: v3.FilterOperatorNotLike, Value: "dri"},
		}},
	}

	expectedTimeSeriesQueriesWhereClause := []string{
		"JSONExtractString(labels, 'service_name') = 'route'",
		"JSONExtractString(labels, 'service_name') != 'route'",
		"match(JSONExtractString(labels, 'service_name'), 'out')",
		"not match(JSONExtractString(labels, 'service_name'), 'out')",
		"JSONExtractString(labels, 'service_name') IN ['route','driver']",
		"JSONExtractString(labels, 'service_name') NOT IN ['route','driver']",
		"has(JSONExtractKeys(labels), 'horn')",
		"not has(JSONExtractKeys(labels), 'horn')",
		"like(JSONExtractString(labels, 'service_name'), '%out%')",
		"notLike(JSONExtractString(labels, 'serice_name'), '%out%')",
		"like(JSONExtractString(labels, 'service_name'), 'dri')",
		"notLike(JSONExtractString(labels, 'a'), 'dri')",
	}

	for i, operator := range operators {
		t.Run(string(operator), func(t *testing.T) {
			filterSet := filterSets[i]
			query, err := buildMetricsTimeSeriesFilterQuery(&filterSet, []v3.AttributeKey{}, "signoz_calls_total", "sum")
			require.NoError(t, err)
			require.Contains(t, query, expectedTimeSeriesQueriesWhereClause[i])
		})
	}
}
