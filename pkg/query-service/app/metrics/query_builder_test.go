package metrics

import (
	"strings"
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func TestBuildQuery(t *testing.T) {
	Convey("TestSimpleQueryWithName", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuilderQueries: map[string]*model.MetricQuery{
					"A": {
						QueryName:         "A",
						MetricName:        "name",
						AggregateOperator: model.RATE_MAX,
						Expression:        "A",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 1)
		So(queries["A"], ShouldContainSubstring, "WHERE metric_name = 'name'")
		So(queries["A"], ShouldContainSubstring, rateWithoutNegative)
	})

	Convey("TestSimpleQueryWithHistQuantile", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuilderQueries: map[string]*model.MetricQuery{
					"A": {
						QueryName:         "A",
						MetricName:        "name",
						AggregateOperator: model.HIST_QUANTILE_99,
						Expression:        "A",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 1)
		So(queries["A"], ShouldContainSubstring, "WHERE metric_name = 'name'")
		So(queries["A"], ShouldContainSubstring, rateWithoutNegative)
		So(queries["A"], ShouldContainSubstring, "HAVING isNaN(value) = 0")
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
					"A": {
						QueryName:  "A",
						MetricName: "name",
						TagFilters: &model.FilterSet{Operator: "AND", Items: []model.FilterItem{
							{Key: "a", Value: "b", Operator: "neq"},
							{Key: "code", Value: "ERROR_*", Operator: "nmatch"},
						}},
						AggregateOperator: model.RATE_MAX,
						Expression:        "A",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 1)

		So(queries["A"], ShouldContainSubstring, "WHERE metric_name = 'name' AND JSONExtractString(labels, 'a') != 'b'")
		So(queries["A"], ShouldContainSubstring, rateWithoutNegative)
		So(queries["A"], ShouldContainSubstring, "not match(JSONExtractString(labels, 'code'), 'ERROR_*')")
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
					"A": {
						QueryName:  "A",
						MetricName: "name",
						TagFilters: &model.FilterSet{Operator: "AND", Items: []model.FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operator: "in"},
						}},
						AggregateOperator: model.RATE_AVG,
						Expression:        "A",
					},
					"B": {
						QueryName:         "B",
						MetricName:        "name2",
						AggregateOperator: model.RATE_MAX,
						Expression:        "B",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 2)
		So(queries["A"], ShouldContainSubstring, "WHERE metric_name = 'name' AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		So(queries["A"], ShouldContainSubstring, rateWithoutNegative)
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
					"A": {
						QueryName:  "A",
						MetricName: "name",
						TagFilters: &model.FilterSet{Operator: "AND", Items: []model.FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operator: "in"},
						}},
						AggregateOperator: model.RATE_MAX,
						Expression:        "A",
					},
					"B": {
						MetricName:        "name2",
						AggregateOperator: model.RATE_AVG,
						Expression:        "B",
					},
					"C": {
						QueryName:  "C",
						Expression: "A/B",
					},
				},
			},
		}
		queries := PrepareBuilderMetricQueries(q, "table").Queries
		So(len(queries), ShouldEqual, 3)
		So(queries["C"], ShouldContainSubstring, "SELECT A.ts as ts, A.value / B.value")
		So(queries["C"], ShouldContainSubstring, "WHERE metric_name = 'name' AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		So(queries["C"], ShouldContainSubstring, rateWithoutNegative)
	})
}

func TestBuildQueryWithIncorrectQueryRef(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuilderQueries: map[string]*model.MetricQuery{
					"A": {
						QueryName:  "A",
						MetricName: "name",
						TagFilters: &model.FilterSet{Operator: "AND", Items: []model.FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operator: "in"},
						}},
						AggregateOperator: model.RATE_MAX,
						Expression:        "A",
					},
					"C": {
						QueryName:  "C",
						Expression: "D*2",
					},
				},
			},
		}
		res := PrepareBuilderMetricQueries(q, "table")
		So(res.Err, ShouldNotBeNil)
		So(res.Err.Error(), ShouldContainSubstring, "variable D not found in builder queries")
	})
}

func TestBuildQueryWithThreeOrMoreQueriesRefAndFormula(t *testing.T) {
	Convey("TestBuildQueryWithFilters", t, func() {
		q := &model.QueryRangeParamsV2{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				BuilderQueries: map[string]*model.MetricQuery{
					"A": {
						QueryName:  "A",
						MetricName: "name",
						TagFilters: &model.FilterSet{Operator: "AND", Items: []model.FilterItem{
							{Key: "in", Value: []interface{}{"a", "b", "c"}, Operator: "in"},
						}},
						AggregateOperator: model.RATE_MAX,
						Expression:        "A",
						Disabled:          true,
					},
					"B": {
						MetricName:        "name2",
						AggregateOperator: model.RATE_AVG,
						Expression:        "B",
						Disabled:          true,
					},
					"C": {
						MetricName:        "name3",
						AggregateOperator: model.SUM_RATE,
						Expression:        "C",
						Disabled:          true,
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A/B",
					},
					"F2": {
						QueryName:  "F2",
						Expression: "A/(B+C)",
					},
					"F3": {
						QueryName:  "F3",
						Expression: "A*A",
					},
					"F4": {
						QueryName:  "F4",
						Expression: "A*B*C",
					},
					"F5": {
						QueryName:  "F5",
						Expression: "((A - B) / B) * 100",
					},
				},
			},
		}
		res := PrepareBuilderMetricQueries(q, "table")
		So(res.Err, ShouldBeNil)
		queries := res.Queries
		So(len(queries), ShouldEqual, 5)
		So(queries["F1"], ShouldContainSubstring, "SELECT A.ts as ts, A.value / B.value")
		So(strings.Count(queries["F1"], " ON "), ShouldEqual, 1)

		So(queries["F2"], ShouldContainSubstring, "SELECT A.ts as ts, A.value / (B.value + C.value)")
		So(strings.Count(queries["F2"], " ON "), ShouldEqual, 2)

		// Working with same query multiple times should not join on itself
		So(queries["F3"], ShouldNotContainSubstring, " ON ")

		So(queries["F4"], ShouldContainSubstring, "SELECT A.ts as ts, A.value * B.value * C.value")
		// Number of times JOIN ON appears is N-1 where N is number of unique queries
		So(strings.Count(queries["F4"], " ON "), ShouldEqual, 2)

		So(queries["F5"], ShouldContainSubstring, "SELECT A.ts as ts, ((A.value - B.value) / B.value) * 100")
		So(strings.Count(queries["F5"], " ON "), ShouldEqual, 1)
	})
}
