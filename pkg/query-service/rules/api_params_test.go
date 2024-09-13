package rules

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestIsAllQueriesDisabled(t *testing.T) {
	// Test case for all queries disabled
	compositeQuery := &v3.CompositeQuery{
		BuilderQueries: map[string]*v3.BuilderQuery{
			"query1": {
				Disabled: true,
			},
			"query2": {
				Disabled: true,
			},
		},
		PromQueries: map[string]*v3.PromQuery{
			"query3": {
				Disabled: true,
			},
			"query4": {
				Disabled: true,
			},
		},
		ClickHouseQueries: map[string]*v3.ClickHouseQuery{
			"query5": {
				Disabled: true,
			},
			"query6": {
				Disabled: true,
			},
		},
	}

	testCases := []*v3.CompositeQuery{
		compositeQuery,
		nil,
		&v3.CompositeQuery{},
		&v3.CompositeQuery{
			BuilderQueries: map[string]*v3.BuilderQuery{
				"query1": {
					Disabled: true,
				},
				"query2": {
					Disabled: false,
				},
			},
		},
		&v3.CompositeQuery{
			PromQueries: map[string]*v3.PromQuery{
				"query3": {
					Disabled: false,
				},
			},
		},
	}

	expectedResult := []bool{true, false, false, false, false}

	for index, compositeQuery := range testCases {
		expected := expectedResult[index]
		actual := isAllQueriesDisabled(compositeQuery)
		if actual != expected {
			t.Errorf("Expected %v, but got %v", expected, actual)
		}
	}
}
