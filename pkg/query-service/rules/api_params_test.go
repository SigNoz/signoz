package rules

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestIsAllQueriesDisabled(t *testing.T) {
	testCases := []*v3.CompositeQuery{
		{
			BuilderQueries: map[string]*v3.BuilderQuery{
				"query1": {
					Disabled: true,
				},
				"query2": {
					Disabled: true,
				},
			},
			QueryType: v3.QueryTypeBuilder,
		},
		nil,
		{
			QueryType: v3.QueryTypeBuilder,
		},
		{
			QueryType: v3.QueryTypeBuilder,
			BuilderQueries: map[string]*v3.BuilderQuery{
				"query1": {
					Disabled: true,
				},
				"query2": {
					Disabled: false,
				},
			},
		},
		{
			QueryType: v3.QueryTypePromQL,
		},
		{
			QueryType: v3.QueryTypePromQL,
			PromQueries: map[string]*v3.PromQuery{
				"query3": {
					Disabled: false,
				},
			},
		},
		{
			QueryType: v3.QueryTypePromQL,
			PromQueries: map[string]*v3.PromQuery{
				"query3": {
					Disabled: true,
				},
			},
		},
		{
			QueryType: v3.QueryTypeClickHouseSQL,
		},
		{
			QueryType: v3.QueryTypeClickHouseSQL,
			ClickHouseQueries: map[string]*v3.ClickHouseQuery{
				"query4": {
					Disabled: false,
				},
			},
		},
		{
			QueryType: v3.QueryTypeClickHouseSQL,
			ClickHouseQueries: map[string]*v3.ClickHouseQuery{
				"query4": {
					Disabled: true,
				},
			},
		},
	}

	expectedResult := []bool{true, false, false, false, false, false, true, false, false, true}

	for index, compositeQuery := range testCases {
		expected := expectedResult[index]
		actual := isAllQueriesDisabled(compositeQuery)
		if actual != expected {
			t.Errorf("Expected %v, but got %v", expected, actual)
		}
	}
}
