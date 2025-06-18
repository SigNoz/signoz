package querier

import (
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func TestPrepareFillZeroArgsWithStep(t *testing.T) {
	q := &querier{}

	req := &qbtypes.QueryRangeRequest{
		Start: 1000000,
		End:   2000000,
	}

	tests := []struct {
		name      string
		functions []qbtypes.Function
		step      int64
		checkArgs bool
	}{
		{
			name: "fillZero without args",
			functions: []qbtypes.Function{
				{
					Name: qbtypes.FunctionNameFillZero,
					Args: []qbtypes.FunctionArg{},
				},
			},
			step:      30000, // 30 seconds
			checkArgs: true,
		},
		{
			name: "fillZero with existing args",
			functions: []qbtypes.Function{
				{
					Name: qbtypes.FunctionNameFillZero,
					Args: []qbtypes.FunctionArg{
						{Value: 500000.0},
						{Value: 1500000.0},
						{Value: 15000.0},
					},
				},
			},
			step:      60000,
			checkArgs: false, // Should not modify existing args
		},
		{
			name: "other function should not be modified",
			functions: []qbtypes.Function{
				{
					Name: qbtypes.FunctionNameAbsolute,
					Args: []qbtypes.FunctionArg{},
				},
			},
			step:      60000,
			checkArgs: false,
		},
		{
			name: "no copy when fillZero already has args",
			functions: []qbtypes.Function{
				{
					Name: qbtypes.FunctionNameFillZero,
					Args: []qbtypes.FunctionArg{
						{Value: 1000.0},
						{Value: 2000.0},
						{Value: 500.0},
					},
				},
				{
					Name: qbtypes.FunctionNameAbsolute,
				},
			},
			step:      60000,
			checkArgs: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := q.prepareFillZeroArgsWithStep(tt.functions, req, tt.step)

			if len(result) != len(tt.functions) {
				t.Fatalf("Expected %d functions, got %d", len(tt.functions), len(result))
			}

			// Check if no copy was made when not needed
			if tt.name == "no copy when fillZero already has args" || tt.name == "other function should not be modified" {
				// Verify that the result is the same slice (no copy)
				if &result[0] != &tt.functions[0] {
					t.Errorf("Expected no copy, but a copy was made")
				}
			}

			for _, fn := range result {
				if fn.Name == qbtypes.FunctionNameFillZero && tt.checkArgs {
					if len(fn.Args) != 3 {
						t.Errorf("Expected 3 args for fillZero, got %d", len(fn.Args))
					}
					// Check start
					if start, ok := fn.Args[0].Value.(float64); !ok || start != float64(req.Start) {
						t.Errorf("Expected start %f, got %v", float64(req.Start), fn.Args[0].Value)
					}
					// Check end
					if end, ok := fn.Args[1].Value.(float64); !ok || end != float64(req.End) {
						t.Errorf("Expected end %f, got %v", float64(req.End), fn.Args[1].Value)
					}
					// Check step
					if step, ok := fn.Args[2].Value.(float64); !ok || step != float64(tt.step) {
						t.Errorf("Expected step %f, got %v", float64(tt.step), fn.Args[2].Value)
					}
				}
			}
		})
	}
}

func TestCalculateFormulaStep(t *testing.T) {
	tests := []struct {
		name       string
		expression string
		req        *qbtypes.QueryRangeRequest
		expected   int64
	}{
		{
			name:       "single query reference",
			expression: "A * 2",
			req: &qbtypes.QueryRangeRequest{
				CompositeQuery: qbtypes.CompositeQuery{
					Queries: []qbtypes.QueryEnvelope{
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
								Name:         "A",
								StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							},
						},
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
								Name:         "B",
								StepInterval: qbtypes.Step{Duration: 120 * time.Second},
							},
						},
					},
				},
			},
			expected: 60000, // Only A is referenced
		},
		{
			name:       "multiple query references",
			expression: "A + B",
			req: &qbtypes.QueryRangeRequest{
				CompositeQuery: qbtypes.CompositeQuery{
					Queries: []qbtypes.QueryEnvelope{
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
								Name:         "A",
								StepInterval: qbtypes.Step{Duration: 30 * time.Second},
							},
						},
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
								Name:         "B",
								StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							},
						},
					},
				},
			},
			expected: 30000, // GCD of 30s and 60s
		},
		{
			name:       "complex expression",
			expression: "(A + B) / C",
			req: &qbtypes.QueryRangeRequest{
				CompositeQuery: qbtypes.CompositeQuery{
					Queries: []qbtypes.QueryEnvelope{
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
								Name:         "A",
								StepInterval: qbtypes.Step{Duration: 60 * time.Second},
							},
						},
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
								Name:         "B",
								StepInterval: qbtypes.Step{Duration: 120 * time.Second},
							},
						},
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
								Name:         "C",
								StepInterval: qbtypes.Step{Duration: 180 * time.Second},
							},
						},
					},
				},
			},
			expected: 60000, // GCD of 60s, 120s, and 180s
		},
		{
			name:       "no query references",
			expression: "100",
			req: &qbtypes.QueryRangeRequest{
				CompositeQuery: qbtypes.CompositeQuery{
					Queries: []qbtypes.QueryEnvelope{},
				},
			},
			expected: 60000, // Default
		},
	}

	q := &querier{}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := q.calculateFormulaStep(tt.expression, tt.req)
			if result != tt.expected {
				t.Errorf("Expected step %d, got %d", tt.expected, result)
			}
		})
	}
}
