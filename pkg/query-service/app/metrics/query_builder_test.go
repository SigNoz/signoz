package metrics

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/query-service/model"
)

func TestBuildQuery(t *testing.T) {
	Convey("TestSimpleQueryWithName", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuildMetricQueries: map[string]*model.MetricQuery{
					"a": {
						MetricName:        "name",
						AggregateOperator: model.RATE_MAX,
					},
				},
			},
		}
		queries := BuildQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 1)
		So(queries[0], ShouldContainSubstring, "WHERE JSONExtractString(table.labels,'__name__') = 'name' AND date >= fromUnixTimestamp64Milli(toInt64(1650991982000)) AND date <= fromUnixTimestamp64Milli(toInt64(1651078382000))")
		So(queries[0], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithFilters(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuildMetricQueries: map[string]*model.MetricQuery{
					"a": {
						MetricName: "name",
						TagFilters: &model.FilterSet{Operation: "AND", Items: []model.FilterItem{
							{Key: "a", Value: "b", Operation: "neq"},
						}},
						AggregateOperator: model.RATE_MAX,
					},
				},
			},
		}
		queries := BuildQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 1)

		So(queries[0], ShouldContainSubstring, "WHERE JSONExtractString(table.labels,'a') != 'b'")
		So(queries[0], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithMultipleQueries(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuildMetricQueries: map[string]*model.MetricQuery{
					"a": {
						MetricName: "name",
						TagFilters: &model.FilterSet{Operation: "AND", Items: []model.FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operation: "in"},
						}},
						AggregateOperator: model.RATE_AVG,
					},
					"b": {
						MetricName:        "name2",
						AggregateOperator: model.RATE_MAX,
					},
				},
			},
		}
		queries := BuildQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 2)
		So(queries[0], ShouldContainSubstring, "WHERE JSONExtractString(table.labels,'in') IN ['a','b','c']")
		So(queries[0], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithMultipleQueriesAndFormula(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuildMetricQueries: map[string]*model.MetricQuery{
					"a": {
						MetricName: "name",
						TagFilters: &model.FilterSet{Operation: "AND", Items: []model.FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operation: "in"},
						}},
						AggregateOperator: model.RATE_MAX,
					},
					"b": {
						MetricName:        "name2",
						AggregateOperator: model.RATE_AVG,
					},
				},
				Formulas: []string{"a/b"},
			},
		}
		queries := BuildQueries(q, "table").Queries
		So(queries[0], ShouldContainSubstring, "WHERE JSONExtractString(table.labels,'in') IN ['a','b','c']")
		So(queries[0], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}
