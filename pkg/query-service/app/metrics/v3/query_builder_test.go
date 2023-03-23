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
		query, err := PrepareMetricQuery(q.Start, q.End, q.Step, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
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
							{Key: v3.AttributeKey{Key: "a"}, Value: "b", Operator: "neq"},
							{Key: v3.AttributeKey{Key: "code"}, Value: "ERROR_*", Operator: "nmatch"},
						}},
						AggregateOperator: v3.AggregateOperatorRateMax,
						Expression:        "A",
					},
				},
			},
		}
		query, err := PrepareMetricQuery(q.Start, q.End, q.Step, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
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
							{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: "in"},
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

		query, err := PrepareMetricQuery(q.Start, q.End, q.Step, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Contains(t, query, "WHERE metric_name = 'name' AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		require.Contains(t, query, rateWithoutNegative)
	})
}
