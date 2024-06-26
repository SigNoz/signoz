package postprocess

import (
	"bytes"
	"encoding/json"
	"reflect"
	"testing"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestSortRows(t *testing.T) {
	tests := []struct {
		name           string
		rows           []*v3.TableRow
		columns        []*v3.TableColumn
		builderQueries map[string]*v3.BuilderQuery
		queryNames     []string
		expected       []*v3.TableRow
	}{
		{
			name: "Sort by single numeric query, ascending order",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service2", "A": 20.0}},
				{Data: map[string]interface{}{"service": "service1", "A": 10.0}},
				{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "asc"}}},
			},
			queryNames: []string{"A"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": 10.0}},
				{Data: map[string]interface{}{"service": "service2", "A": 20.0}},
				{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
			},
		},
		{
			name: "Sort by single numeric query, descending order",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service2", "A": 20.0}},
				{Data: map[string]interface{}{"service": "service1", "A": 10.0}},
				{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "desc"}}},
			},
			queryNames: []string{"A"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
				{Data: map[string]interface{}{"service": "service2", "A": 20.0}},
				{Data: map[string]interface{}{"service": "service1", "A": 10.0}},
			},
		},
		{
			name: "Sort by single string query, ascending order",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service2", "A": "b"}},
				{Data: map[string]interface{}{"service": "service1", "A": "c"}},
				{Data: map[string]interface{}{"service": "service3", "A": "a"}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: "A", Order: "asc"}}},
			},
			queryNames: []string{"A"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service3", "A": "a"}},
				{Data: map[string]interface{}{"service": "service2", "A": "b"}},
				{Data: map[string]interface{}{"service": "service1", "A": "c"}},
			},
		},
		{
			name: "Sort with n/a values",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": 10.0}},
				{Data: map[string]interface{}{"service": "service2", "B": 15.0}},
				{Data: map[string]interface{}{"service": "service3", "A": 30.0, "B": 25.0}},
				{Data: map[string]interface{}{"service": "service4"}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
				{Name: "B"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "asc"}}},
				"B": {OrderBy: []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "desc"}}},
			},
			queryNames: []string{"A", "B"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": 10.0}},
				{Data: map[string]interface{}{"service": "service3", "A": 30.0, "B": 25.0}},
				{Data: map[string]interface{}{"service": "service2", "B": 15.0}},
				{Data: map[string]interface{}{"service": "service4"}},
			},
		},
		{
			name: "Sort with SigNozOrderByValue",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": 20.0}},
				{Data: map[string]interface{}{"service": "service2", "A": 10.0}},
				{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "desc"}}},
			},
			queryNames: []string{"A"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
				{Data: map[string]interface{}{"service": "service1", "A": 20.0}},
				{Data: map[string]interface{}{"service": "service2", "A": 10.0}},
			},
		},
		{
			name: "Sort with all n/a values",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": "n/a", "B": "n/a"}},
				{Data: map[string]interface{}{"service": "service2", "A": "n/a", "B": "n/a"}},
				{Data: map[string]interface{}{"service": "service3", "A": "n/a", "B": "n/a"}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
				{Name: "B"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: "A", Order: "asc"}}},
				"B": {OrderBy: []v3.OrderBy{{ColumnName: "B", Order: "desc"}}},
			},
			queryNames: []string{"A", "B"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": "n/a", "B": "n/a"}},
				{Data: map[string]interface{}{"service": "service2", "A": "n/a", "B": "n/a"}},
				{Data: map[string]interface{}{"service": "service3", "A": "n/a", "B": "n/a"}},
			},
		},
		{
			name: "Sort with negative numbers",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": -10.0}},
				{Data: map[string]interface{}{"service": "service2", "A": 20.0}},
				{Data: map[string]interface{}{"service": "service3", "A": -30.0}},
				{Data: map[string]interface{}{"service": "service4", "A": 0.0}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: "A", Order: "asc"}}},
			},
			queryNames: []string{"A"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service3", "A": -30.0}},
				{Data: map[string]interface{}{"service": "service1", "A": -10.0}},
				{Data: map[string]interface{}{"service": "service4", "A": 0.0}},
				{Data: map[string]interface{}{"service": "service2", "A": 20.0}},
			},
		},
		{
			name: "Sort with mixed case strings",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": "Apple"}},
				{Data: map[string]interface{}{"service": "service2", "A": "banana"}},
				{Data: map[string]interface{}{"service": "service3", "A": "Cherry"}},
				{Data: map[string]interface{}{"service": "service4", "A": "date"}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: "A", Order: "asc"}}},
			},
			queryNames: []string{"A"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": "Apple"}},
				{Data: map[string]interface{}{"service": "service3", "A": "Cherry"}},
				{Data: map[string]interface{}{"service": "service2", "A": "banana"}},
				{Data: map[string]interface{}{"service": "service4", "A": "date"}},
			},
		},
		{
			name: "Sort with empty strings",
			rows: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": ""}},
				{Data: map[string]interface{}{"service": "service2", "A": "b"}},
				{Data: map[string]interface{}{"service": "service3", "A": ""}},
				{Data: map[string]interface{}{"service": "service4", "A": "a"}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: "A", Order: "asc"}}},
			},
			queryNames: []string{"A"},
			expected: []*v3.TableRow{
				{Data: map[string]interface{}{"service": "service1", "A": ""}},
				{Data: map[string]interface{}{"service": "service3", "A": ""}},
				{Data: map[string]interface{}{"service": "service4", "A": "a"}},
				{Data: map[string]interface{}{"service": "service2", "A": "b"}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sortRows(tt.rows, tt.builderQueries, tt.queryNames)
			if !reflect.DeepEqual(tt.rows, tt.expected) {
				exp, _ := json.Marshal(tt.expected)
				got, _ := json.Marshal(tt.rows)
				t.Errorf("sortRows() = %v, want %v", string(got), string(exp))
			}
		})
	}
}

func TestSortRowsWithEmptyQueries(t *testing.T) {
	rows := []*v3.TableRow{
		{Data: map[string]interface{}{"service": "service1", "A": 20.0}},
		{Data: map[string]interface{}{"service": "service2", "A": 10.0}},
		{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
	}
	builderQueries := map[string]*v3.BuilderQuery{}
	queryNames := []string{}

	sortRows(rows, builderQueries, queryNames)

	// Expect the original order to be maintained
	expected := []*v3.TableRow{
		{Data: map[string]interface{}{"service": "service1", "A": 20.0}},
		{Data: map[string]interface{}{"service": "service2", "A": 10.0}},
		{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
	}

	if !reflect.DeepEqual(rows, expected) {
		t.Errorf("sortRows() with empty queries = %v, want %v", rows, expected)
	}
}

func TestSortRowsWithInvalidColumnName(t *testing.T) {
	rows := []*v3.TableRow{
		{Data: map[string]interface{}{"service": "service1", "A": 20.0}},
		{Data: map[string]interface{}{"service": "service2", "A": 10.0}},
		{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
	}
	builderQueries := map[string]*v3.BuilderQuery{
		"A": {OrderBy: []v3.OrderBy{{ColumnName: "InvalidColumn", Order: "asc"}}},
	}
	queryNames := []string{"A"}

	sortRows(rows, builderQueries, queryNames)

	// Expect the original order to be maintained
	expected := []*v3.TableRow{
		{Data: map[string]interface{}{"service": "service1", "A": 20.0}},
		{Data: map[string]interface{}{"service": "service2", "A": 10.0}},
		{Data: map[string]interface{}{"service": "service3", "A": 30.0}},
	}

	if !reflect.DeepEqual(rows, expected) {
		t.Errorf("sortRows() with invalid column name = %v, want %v", rows, expected)
	}
}

func TestSortRowsStability(t *testing.T) {
	rows := []*v3.TableRow{
		{Data: map[string]interface{}{"service": "service1", "A": 10.0, "B": "a"}},
		{Data: map[string]interface{}{"service": "service2", "A": 10.0, "B": "b"}},
		{Data: map[string]interface{}{"service": "service3", "A": 10.0, "B": "c"}},
	}
	builderQueries := map[string]*v3.BuilderQuery{
		"A": {OrderBy: []v3.OrderBy{{ColumnName: "A", Order: "asc"}}},
	}
	queryNames := []string{"A"}

	sortRows(rows, builderQueries, queryNames)

	// Expect the original order to be maintained for equal values
	expected := []*v3.TableRow{
		{Data: map[string]interface{}{"service": "service1", "A": 10.0, "B": "a"}},
		{Data: map[string]interface{}{"service": "service2", "A": 10.0, "B": "b"}},
		{Data: map[string]interface{}{"service": "service3", "A": 10.0, "B": "c"}},
	}

	if !reflect.DeepEqual(rows, expected) {
		t.Errorf("sortRows() stability test failed = %v, want %v", rows, expected)
	}
}

func TestTransformToTableForClickHouseQueries(t *testing.T) {
	tests := []struct {
		name     string
		input    []*v3.Result
		expected []*v3.Result
	}{
		{
			name:     "Empty input",
			input:    []*v3.Result{},
			expected: []*v3.Result{},
		},
		{
			name: "Single result with one series",
			input: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							LabelsArray: []map[string]string{
								{"service": "frontend"},
							},
							Points: []v3.Point{
								{Value: 10.0},
							},
						},
					},
				},
			},
			expected: []*v3.Result{
				{
					Table: &v3.Table{
						Columns: []*v3.TableColumn{
							{Name: "service"},
							{Name: "A", QueryName: "A", IsValueColumn: true},
						},
						Rows: []*v3.TableRow{
							{Data: map[string]interface{}{"service": "frontend", "A": 10.0}},
						},
					},
				},
			},
		},
		{
			name: "Multiple results with multiple series",
			input: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							LabelsArray: []map[string]string{
								{"service": "frontend"},
								{"env": "prod"},
							},
							Points: []v3.Point{
								{Value: 10.0},
							},
						},
						{
							LabelsArray: []map[string]string{
								{"service": "backend"},
								{"env": "prod"},
							},
							Points: []v3.Point{
								{Value: 20.0},
							},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							LabelsArray: []map[string]string{
								{"service": "frontend"},
								{"env": "prod"},
							},
							Points: []v3.Point{
								{Value: 15.0},
							},
						},
						{
							LabelsArray: []map[string]string{
								{"service": "backend"},
								{"env": "prod"},
							},
							Points: []v3.Point{
								{Value: 25.0},
							},
						},
					},
				},
			},
			expected: []*v3.Result{
				{
					Table: &v3.Table{
						Columns: []*v3.TableColumn{
							{Name: "service"},
							{Name: "env"},
							{Name: "A", QueryName: "A", IsValueColumn: true},
							{Name: "B", QueryName: "B", IsValueColumn: true},
						},
						Rows: []*v3.TableRow{
							{Data: map[string]interface{}{"service": "frontend", "env": "prod", "A": 10.0, "B": "n/a"}},
							{Data: map[string]interface{}{"service": "backend", "env": "prod", "A": 20.0, "B": "n/a"}},
							{Data: map[string]interface{}{"service": "frontend", "env": "prod", "A": "n/a", "B": 15.0}},
							{Data: map[string]interface{}{"service": "backend", "env": "prod", "A": "n/a", "B": 25.0}},
						},
					},
				},
			},
		},
		{
			name: "Results with missing labels",
			input: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							LabelsArray: []map[string]string{
								{"service": "frontend"},
							},
							Points: []v3.Point{
								{Value: 10.0},
							},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							LabelsArray: []map[string]string{
								{"env": "prod"},
							},
							Points: []v3.Point{
								{Value: 20.0},
							},
						},
					},
				},
			},
			expected: []*v3.Result{
				{
					Table: &v3.Table{
						Columns: []*v3.TableColumn{
							{Name: "service"},
							{Name: "env"},
							{Name: "A", QueryName: "A", IsValueColumn: true},
							{Name: "B", QueryName: "B", IsValueColumn: true},
						},
						Rows: []*v3.TableRow{
							{Data: map[string]interface{}{"service": "frontend", "env": "n/a", "A": 10.0, "B": "n/a"}},
							{Data: map[string]interface{}{"service": "n/a", "env": "prod", "A": "n/a", "B": 20.0}},
						},
					},
				},
			},
		},
		{
			name: "Results with empty series",
			input: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							LabelsArray: []map[string]string{
								{"service": "frontend"},
							},
							Points: []v3.Point{
								{Value: 10.0},
							},
						},
					},
				},
				{
					QueryName: "B",
					Series:    []*v3.Series{},
				},
			},
			expected: []*v3.Result{
				{
					Table: &v3.Table{
						Columns: []*v3.TableColumn{
							{Name: "service"},
							{Name: "A", QueryName: "A", IsValueColumn: true},
						},
						Rows: []*v3.TableRow{
							{Data: map[string]interface{}{"service": "frontend", "A": 10.0}},
						},
					},
				},
			},
		},
		{
			name: "Results with empty points",
			input: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							LabelsArray: []map[string]string{
								{"service": "frontend"},
							},
							Points: []v3.Point{},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							LabelsArray: []map[string]string{
								{"service": "backend"},
							},
							Points: []v3.Point{
								{Value: 20.0},
							},
						},
					},
				},
			},
			expected: []*v3.Result{
				{
					Table: &v3.Table{
						Columns: []*v3.TableColumn{
							{Name: "service"},
							{Name: "B", QueryName: "B", IsValueColumn: true},
						},
						Rows: []*v3.TableRow{
							{Data: map[string]interface{}{"service": "frontend", "B": "n/a"}},
							{Data: map[string]interface{}{"service": "backend", "B": 20.0}},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := TransformToTableForClickHouseQueries(tt.input)
			exp, _ := json.Marshal(tt.expected)
			got, _ := json.Marshal(result)
			if !bytes.Equal(got, exp) {
				t.Errorf("TransformToTableForClickHouseQueries() = %v, want %v", string(got), string(exp))
			}
		})
	}
}

func TestTransformToTableForClickHouseQueriesSorting(t *testing.T) {
	input := []*v3.Result{
		{
			QueryName: "B",
			Series: []*v3.Series{
				{
					LabelsArray: []map[string]string{
						{"service": "frontend"},
					},
					Points: []v3.Point{
						{Value: 10.0},
					},
				},
			},
		},
		{
			QueryName: "A",
			Series: []*v3.Series{
				{
					LabelsArray: []map[string]string{
						{"service": "backend"},
					},
					Points: []v3.Point{
						{Value: 20.0},
					},
				},
			},
		},
	}

	expected := []*v3.Result{
		{
			Table: &v3.Table{
				Columns: []*v3.TableColumn{
					{Name: "service"},
					{Name: "A", QueryName: "A", IsValueColumn: true},
					{Name: "B", QueryName: "B", IsValueColumn: true},
				},
				Rows: []*v3.TableRow{
					{Data: map[string]interface{}{"service": "backend", "A": 20.0, "B": "n/a"}},
					{Data: map[string]interface{}{"service": "frontend", "A": "n/a", "B": 10.0}},
				},
			},
		},
	}

	result := TransformToTableForClickHouseQueries(input)
	exp, _ := json.Marshal(expected)
	got, _ := json.Marshal(result)
	if !bytes.Equal(got, exp) {
		t.Errorf("TransformToTableForClickHouseQueries() sorting test failed. Got %v, want %v", string(got), string(exp))
	}
}
