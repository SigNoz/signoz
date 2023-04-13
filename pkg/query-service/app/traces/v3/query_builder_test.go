package traces

import (
	"fmt"
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"github.com/stretchr/testify/require"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestBuildQuery(t *testing.T) {
	t.Run("TestSimpleQueryWithName", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1680066360726210000,
			End:   1780066458000000000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						AggregateAttribute: v3.AttributeKey{Key: "durationNano", IsColumn: true},
						AggregateOperator:  v3.AggregateOperatorP20,
						Expression:         "A",
					},
				},
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
			},
		}
		query, err := PrepareTracesQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)
		fmt.Println(query)
		// require.Contains(t, query, "WHERE name")
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
		query, err := PrepareTracesQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Contains(t, query, "WHERE metric_name = 'name' AND JSONExtractString(labels, 'a') != 'b'")
		// require.Contains(t, query, rateWithoutNegative)
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

		query, err := PrepareTracesQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Contains(t, query, "WHERE metric_name = 'name' AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		// require.Contains(t, query, rateWithoutNegative)
	})
}

var testGetFilter = []struct {
	Name           string
	AttributeKey   v3.AttributeKey
	ExpectedFilter string
}{
	{
		Name:           "resource",
		AttributeKey:   v3.AttributeKey{Key: "collector_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource, IsColumn: false},
		ExpectedFilter: "resourcesTagMap['collector_id']",
	},
	{
		Name:           "stringAttribute",
		AttributeKey:   v3.AttributeKey{Key: "customer_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedFilter: "stringTagMap['customer_id']",
	},
	{
		Name:           "numberAttribute",
		AttributeKey:   v3.AttributeKey{Key: "count", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedFilter: "numberTagMap['count']",
	},
	{
		Name:           "column",
		AttributeKey:   v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		ExpectedFilter: "name",
	},
}

func TestGetFilter(t *testing.T) {
	for _, tt := range testGetFilter {
		Convey("testGetFilter", t, func() {
			Filter := getFilter(tt.AttributeKey)
			So(Filter, ShouldEqual, tt.ExpectedFilter)
		})
	}
}
