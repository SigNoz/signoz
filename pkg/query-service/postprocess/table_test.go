package postprocess

import (
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
				{Data: []interface{}{"service2", 20.0}},
				{Data: []interface{}{"service1", 10.0}},
				{Data: []interface{}{"service3", 30.0}},
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
				{Data: []interface{}{"service1", 10.0}},
				{Data: []interface{}{"service2", 20.0}},
				{Data: []interface{}{"service3", 30.0}},
			},
		},
		{
			name: "Sort by single numeric query, descending order",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service2", 20.0}},
				{Data: []interface{}{"service1", 10.0}},
				{Data: []interface{}{"service3", 30.0}},
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
				{Data: []interface{}{"service3", 30.0}},
				{Data: []interface{}{"service2", 20.0}},
				{Data: []interface{}{"service1", 10.0}},
			},
		},
		{
			name: "Sort by single string query, ascending order",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service2", "b"}},
				{Data: []interface{}{"service1", "c"}},
				{Data: []interface{}{"service3", "a"}},
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
				{Data: []interface{}{"service3", "a"}},
				{Data: []interface{}{"service2", "b"}},
				{Data: []interface{}{"service1", "c"}},
			},
		},
		{
			name: "Sort with n/a values",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service1", 10.0, "n/a"}},
				{Data: []interface{}{"service2", "n/a", 15.0}},
				{Data: []interface{}{"service3", 30.0, 25.0}},
				{Data: []interface{}{"service4", "n/a", "n/a"}},
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
				{Data: []interface{}{"service1", 10.0, "n/a"}},
				{Data: []interface{}{"service3", 30.0, 25.0}},
				{Data: []interface{}{"service4", "n/a", "n/a"}},
				{Data: []interface{}{"service2", "n/a", 15.0}},
			},
		},
		{
			name: "Sort with different data types",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service1", "string", 10.0, true}},
				{Data: []interface{}{"service2", 20.0, "string", false}},
				{Data: []interface{}{"service3", true, 30.0, "string"}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
				{Name: "B"},
				{Name: "C"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "asc"}}},
				"B": {OrderBy: []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "desc"}}},
				"C": {OrderBy: []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "asc"}}},
			},
			queryNames: []string{"A", "B", "C"},
			expected: []*v3.TableRow{
				{Data: []interface{}{"service2", 20.0, "string", false}},
				{Data: []interface{}{"service1", "string", 10.0, true}},
				{Data: []interface{}{"service3", true, 30.0, "string"}},
			},
		},
		{
			name: "Sort with SigNozOrderByValue",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service1", 20.0}},
				{Data: []interface{}{"service2", 10.0}},
				{Data: []interface{}{"service3", 30.0}},
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
				{Data: []interface{}{"service3", 30.0}},
				{Data: []interface{}{"service1", 20.0}},
				{Data: []interface{}{"service2", 10.0}},
			},
		},
		{
			name: "Sort by multiple queries with mixed types",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service1", 10.0, "b", true}},
				{Data: []interface{}{"service2", 20.0, "a", false}},
				{Data: []interface{}{"service3", 10.0, "c", true}},
				{Data: []interface{}{"service4", 20.0, "b", false}},
			},
			columns: []*v3.TableColumn{
				{Name: "service_name"},
				{Name: "A"},
				{Name: "B"},
				{Name: "C"},
			},
			builderQueries: map[string]*v3.BuilderQuery{
				"A": {OrderBy: []v3.OrderBy{{ColumnName: "A", Order: "asc"}}},
				"B": {OrderBy: []v3.OrderBy{{ColumnName: "B", Order: "desc"}}},
				"C": {OrderBy: []v3.OrderBy{{ColumnName: "C", Order: "asc"}}},
			},
			queryNames: []string{"A", "B", "C"},
			expected: []*v3.TableRow{
				{Data: []interface{}{"service3", 10.0, "c", true}},
				{Data: []interface{}{"service1", 10.0, "b", true}},
				{Data: []interface{}{"service4", 20.0, "b", false}},
				{Data: []interface{}{"service2", 20.0, "a", false}},
			},
		},
		{
			name: "Sort with all n/a values",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service1", "n/a", "n/a"}},
				{Data: []interface{}{"service2", "n/a", "n/a"}},
				{Data: []interface{}{"service3", "n/a", "n/a"}},
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
				{Data: []interface{}{"service1", "n/a", "n/a"}},
				{Data: []interface{}{"service2", "n/a", "n/a"}},
				{Data: []interface{}{"service3", "n/a", "n/a"}},
			},
		},
		{
			name: "Sort with negative numbers",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service1", -10.0}},
				{Data: []interface{}{"service2", 20.0}},
				{Data: []interface{}{"service3", -30.0}},
				{Data: []interface{}{"service4", 0.0}},
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
				{Data: []interface{}{"service3", -30.0}},
				{Data: []interface{}{"service1", -10.0}},
				{Data: []interface{}{"service4", 0.0}},
				{Data: []interface{}{"service2", 20.0}},
			},
		},
		{
			name: "Sort with mixed case strings",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service1", "Apple"}},
				{Data: []interface{}{"service2", "banana"}},
				{Data: []interface{}{"service3", "Cherry"}},
				{Data: []interface{}{"service4", "date"}},
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
				{Data: []interface{}{"service1", "Apple"}},
				{Data: []interface{}{"service3", "Cherry"}},
				{Data: []interface{}{"service2", "banana"}},
				{Data: []interface{}{"service4", "date"}},
			},
		},
		{
			name: "Sort with empty strings",
			rows: []*v3.TableRow{
				{Data: []interface{}{"service1", ""}},
				{Data: []interface{}{"service2", "b"}},
				{Data: []interface{}{"service3", ""}},
				{Data: []interface{}{"service4", "a"}},
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
				{Data: []interface{}{"service1", ""}},
				{Data: []interface{}{"service3", ""}},
				{Data: []interface{}{"service4", "a"}},
				{Data: []interface{}{"service2", "b"}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sortRows(tt.rows, tt.columns, tt.builderQueries, tt.queryNames)
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
		{Data: []interface{}{"service1", 20.0}},
		{Data: []interface{}{"service2", 10.0}},
		{Data: []interface{}{"service3", 30.0}},
	}
	columns := []*v3.TableColumn{
		{Name: "service_name"},
		{Name: "A"},
	}
	builderQueries := map[string]*v3.BuilderQuery{}
	queryNames := []string{}

	sortRows(rows, columns, builderQueries, queryNames)

	// Expect the original order to be maintained
	expected := []*v3.TableRow{
		{Data: []interface{}{"service1", 20.0}},
		{Data: []interface{}{"service2", 10.0}},
		{Data: []interface{}{"service3", 30.0}},
	}

	if !reflect.DeepEqual(rows, expected) {
		t.Errorf("sortRows() with empty queries = %v, want %v", rows, expected)
	}
}

func TestSortRowsWithInvalidColumnName(t *testing.T) {
	rows := []*v3.TableRow{
		{Data: []interface{}{"service1", 20.0}},
		{Data: []interface{}{"service2", 10.0}},
		{Data: []interface{}{"service3", 30.0}},
	}
	columns := []*v3.TableColumn{
		{Name: "service_name"},
		{Name: "A"},
	}
	builderQueries := map[string]*v3.BuilderQuery{
		"A": {OrderBy: []v3.OrderBy{{ColumnName: "InvalidColumn", Order: "asc"}}},
	}
	queryNames := []string{"A"}

	sortRows(rows, columns, builderQueries, queryNames)

	// Expect the original order to be maintained
	expected := []*v3.TableRow{
		{Data: []interface{}{"service1", 20.0}},
		{Data: []interface{}{"service2", 10.0}},
		{Data: []interface{}{"service3", 30.0}},
	}

	if !reflect.DeepEqual(rows, expected) {
		t.Errorf("sortRows() with invalid column name = %v, want %v", rows, expected)
	}
}

func TestSortRowsStability(t *testing.T) {
	rows := []*v3.TableRow{
		{Data: []interface{}{"service1", 10.0, "a"}},
		{Data: []interface{}{"service2", 10.0, "b"}},
		{Data: []interface{}{"service3", 10.0, "c"}},
	}
	columns := []*v3.TableColumn{
		{Name: "service_name"},
		{Name: "A"},
		{Name: "B"},
	}
	builderQueries := map[string]*v3.BuilderQuery{
		"A": {OrderBy: []v3.OrderBy{{ColumnName: "A", Order: "asc"}}},
	}
	queryNames := []string{"A"}

	sortRows(rows, columns, builderQueries, queryNames)

	// Expect the original order to be maintained for equal values
	expected := []*v3.TableRow{
		{Data: []interface{}{"service1", 10.0, "a"}},
		{Data: []interface{}{"service2", 10.0, "b"}},
		{Data: []interface{}{"service3", 10.0, "c"}},
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
							{Name: "A"},
						},
						Rows: []*v3.TableRow{
							{Data: []interface{}{"frontend", 10.0}},
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
								{"service": "frontend", "env": "prod"},
							},
							Points: []v3.Point{
								{Value: 10.0},
							},
						},
						{
							LabelsArray: []map[string]string{
								{"service": "backend", "env": "prod"},
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
								{"service": "frontend", "env": "prod"},
							},
							Points: []v3.Point{
								{Value: 15.0},
							},
						},
						{
							LabelsArray: []map[string]string{
								{"service": "backend", "env": "prod"},
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
							{Name: "A"},
							{Name: "B"},
						},
						Rows: []*v3.TableRow{
							{Data: []interface{}{"frontend", "prod", 10.0, nil}},
							{Data: []interface{}{"backend", "prod", 20.0, nil}},
							{Data: []interface{}{"frontend", "prod", nil, 15.0}},
							{Data: []interface{}{"backend", "prod", nil, 25.0}},
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
							{Name: "A"},
							{Name: "B"},
						},
						Rows: []*v3.TableRow{
							{Data: []interface{}{"frontend", "n/a", 10.0, nil}},
							{Data: []interface{}{"n/a", "prod", nil, 20.0}},
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
							{Name: "A"},
						},
						Rows: []*v3.TableRow{
							{Data: []interface{}{"frontend", 10.0}},
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
							{Name: "B"},
						},
						Rows: []*v3.TableRow{
							{Data: []interface{}{"frontend", nil}},
							{Data: []interface{}{"backend", 20.0}},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := TransformToTableForClickHouseQueries(tt.input)
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("TransformToTableForClickHouseQueries() = %v, want %v", result, tt.expected)
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
					{Name: "A"},
					{Name: "B"},
				},
				Rows: []*v3.TableRow{
					{Data: []interface{}{"backend", 20.0, nil}},
					{Data: []interface{}{"frontend", nil, 10.0}},
				},
			},
		},
	}

	result := TransformToTableForClickHouseQueries(input)
	if !reflect.DeepEqual(result, expected) {
		t.Errorf("TransformToTableForClickHouseQueries() sorting test failed. Got %v, want %v", result, expected)
	}
}
