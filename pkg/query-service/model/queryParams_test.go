package model

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
)

func TestBuildQuery(t *testing.T) {
	Convey("TestSimpleQueryWithName", t, func() {
		q := &QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  "1 HOUR",
			CompositeMetricQuery: &CompositeMetricQuery{
				BuildMetricQueries: []*MetricQuery{
					{
						MetricName:        "name",
						AggregateOperator: "rate",
					},
				},
			},
		}
		queries, _, _ := q.BuildQuery("table")
		So(len(queries), ShouldEqual, 1)
		So(queries[0], ShouldContainSubstring, "WHERE JSONExtractString(table.labels,'__name__') = 'name' AND date >= fromUnixTimestamp64Milli(toInt64(1650991982000)) AND date <= fromUnixTimestamp64Milli(toInt64(1651078382000))")
		So(queries[0], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithFilters(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  "1 HOUR",
			CompositeMetricQuery: &CompositeMetricQuery{
				BuildMetricQueries: []*MetricQuery{
					{
						MetricName: "name",
						TagFilters: &FilterSet{Operation: "AND", Items: []FilterItem{
							{Key: "a", Value: "b", Operation: "neq"},
						}},
						AggregateOperator: "rate",
					},
				},
			},
		}
		queries, _, _ := q.BuildQuery("table")
		So(len(queries), ShouldEqual, 1)

		So(queries[0], ShouldContainSubstring, "WHERE JSONExtractString(table.labels,'a') != 'b'")
		So(queries[0], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithMultipleQueries(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  "1 HOUR",
			CompositeMetricQuery: &CompositeMetricQuery{
				BuildMetricQueries: []*MetricQuery{
					{
						MetricName: "name",
						TagFilters: &FilterSet{Operation: "AND", Items: []FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operation: "in"},
						}},
						AggregateOperator: "rate",
					},
					{
						MetricName:        "name2",
						AggregateOperator: "rate",
					},
				},
			},
		}
		queries, _, _ := q.BuildQuery("table")
		So(len(queries), ShouldEqual, 2)
		So(queries[0], ShouldContainSubstring, "WHERE JSONExtractString(table.labels,'in') IN ['a','b','c']")
		So(queries[0], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithMultipleQueriesAndFormula(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  "1 HOUR",
			CompositeMetricQuery: &CompositeMetricQuery{
				BuildMetricQueries: []*MetricQuery{
					{
						MetricName: "name",
						TagFilters: &FilterSet{Operation: "AND", Items: []FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operation: "in"},
						}},
						AggregateOperator: "rate",
					},
					{
						MetricName:        "name2",
						AggregateOperator: "rate",
					},
				},
				Formulas: []string{"a/b"},
			},
		}
		queries, _, _ := q.BuildQuery("table")
		So(queries[0], ShouldContainSubstring, "WHERE JSONExtractString(table.labels,'in') IN ['a','b','c']")
		So(queries[0], ShouldContainSubstring, "runningDifference(value)/runningDifference(ts)")
	})
}
