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
				BuilderQueries: map[string]*model.MetricQuery{
					"a": {
						QueryName:         "a",
						MetricName:        "name",
						AggregateOperator: model.RATE_MAX,
						Expression:        "a",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 1)
		So(queries["a"], ShouldContainSubstring, "WHERE metric_name = 'name'")
		So(queries["a"], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithFilters(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuilderQueries: map[string]*model.MetricQuery{
					"a": {
						QueryName:  "a",
						MetricName: "name",
						TagFilters: &model.FilterSet{Operation: "AND", Items: []model.FilterItem{
							{Key: "a", Value: "b", Operation: "neq"},
						}},
						AggregateOperator: model.RATE_MAX,
						Expression:        "a",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 1)

		So(queries["a"], ShouldContainSubstring, "WHERE metric_name = 'name' AND labels_object.a != 'b'")
		So(queries["a"], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithMultipleQueries(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuilderQueries: map[string]*model.MetricQuery{
					"a": {
						QueryName:  "a",
						MetricName: "name",
						TagFilters: &model.FilterSet{Operation: "AND", Items: []model.FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operation: "in"},
						}},
						AggregateOperator: model.RATE_AVG,
						Expression:        "a",
					},
					"b": {
						QueryName:         "b",
						MetricName:        "name2",
						AggregateOperator: model.RATE_MAX,
						Expression:        "b",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 2)
		So(queries["a"], ShouldContainSubstring, "WHERE metric_name = 'name' AND labels_object.in IN ['a','b','c']")
		So(queries["a"], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithMultipleQueriesAndFormula(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuilderQueries: map[string]*model.MetricQuery{
					"a": {
						QueryName:  "a",
						MetricName: "name",
						TagFilters: &model.FilterSet{Operation: "AND", Items: []model.FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operation: "in"},
						}},
						AggregateOperator: model.RATE_MAX,
						Expression:        "a",
					},
					"b": {
						MetricName:        "name2",
						AggregateOperator: model.RATE_AVG,
						Expression:        "b",
					},
					"c": {
						QueryName:  "c",
						Expression: "a/b",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 3)
		So(queries["c"], ShouldContainSubstring, "SELECT ts, a.value / b.value")
		So(queries["c"], ShouldContainSubstring, "WHERE metric_name = 'name' AND labels_object.in IN ['a','b','c']")
		So(queries["c"], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}
