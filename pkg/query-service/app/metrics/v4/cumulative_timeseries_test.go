package v4

import (
	"testing"

	"github.com/stretchr/testify/require"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestBuildQueryWithFilters(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:           "A",
						StepInterval:        60,
						AggregateAttribute:  v3.AttributeKey{Key: "signoz_calls_total"},
						Filters:             &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
						TemporalAggregation: v3.TemporalAggregationAvg,
						Expression:          "A",
						GroupBy: []v3.AttributeKey{
							{Key: "service_name"},
						},
					},
				},
			},
		}
		query, err := buildTemporalAggregationSubQuery(q.Start, q.End, 60, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Contains(t, query, "hello")
	})
}

func TestBuildQueryWithFiltersNew(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1701272907000,
			End:   1701274707000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:           "A",
						StepInterval:        60,
						AggregateAttribute:  v3.AttributeKey{Key: "signoz_calls_total"},
						Filters:             &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
						TemporalAggregation: v3.TemporalAggregationIncrease,
						SpatialAggregation:  v3.SpatialAggregationSum,
						Expression:          "A",
						GroupBy: []v3.AttributeKey{
							{Key: "service_name"},
						},
					},
				},
			},
		}
		query, err := buildMetricQuery(q.Start, q.End, 60, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Contains(t, query, "hello")
	})
}

func TestBuildQueryWithFiltersSumRate(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1701272907000,
			End:   1701274707000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:           "A",
						StepInterval:        60,
						AggregateAttribute:  v3.AttributeKey{Key: "signoz_calls_total"},
						Filters:             &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
						TemporalAggregation: v3.TemporalAggregationIncrease,
						SpatialAggregation:  v3.SpatialAggregationSum,
						Expression:          "A",
					},
				},
			},
		}
		query, err := buildMetricQuery(q.Start, q.End, 60, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Contains(t, query, "hello")
	})
}
