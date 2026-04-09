package ruletypes

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestQueriesWithFormulas(t *testing.T) {
	tests := []struct {
		name          string
		queries       []qbtypes.QueryEnvelope
		formulas      []qbtypes.QueryBuilderFormula
		expectedCount int
		expectedNames []string
		description   string
	}{
		{
			name: "only queries, no formulas",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "A",
					},
				},
			},
			formulas:      []qbtypes.QueryBuilderFormula{},
			expectedCount: 1,
			expectedNames: []string{"A"},
			description:   "should return only queries when no formulas exist",
		},
		{
			name: "queries with enabled formulas",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "A",
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   false,
				},
			},
			expectedCount: 2,
			expectedNames: []string{"A", "F1"},
			description:   "should include enabled formulas converted to QueryEnvelope",
		},
		{
			name: "queries with disabled formulas",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "A",
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   true,
				},
			},
			expectedCount: 1,
			expectedNames: []string{"A"},
			description:   "should not include disabled formulas",
		},
		{
			name: "multiple queries and mixed formula states",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "A",
					},
				},
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name: "B",
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A + B",
					Disabled:   false,
				},
				{
					Name:       "F2",
					Expression: "A - B",
					Disabled:   true,
				},
				{
					Name:       "F3",
					Expression: "A / B",
					Disabled:   false,
				},
			},
			expectedCount: 4,
			expectedNames: []string{"A", "B", "F1", "F3"},
			description:   "should include only enabled formulas mixed with regular queries",
		},
		{
			name:          "no queries, only formulas",
			queries:       []qbtypes.QueryEnvelope{},
			formulas:      []qbtypes.QueryBuilderFormula{},
			expectedCount: 0,
			expectedNames: []string{},
			description:   "should handle empty composites gracefully",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			acq := &AlertCompositeQuery{
				Queries:       tt.queries,
				QueryFormulas: tt.formulas,
				QueryType:     QueryTypeBuilder,
				PanelType:     PanelTypeValue,
			}

			result := acq.QueriesWithFormulas()

			assert.Equal(t, tt.expectedCount, len(result), tt.description)

			// verify names match
			for i, expectedName := range tt.expectedNames {
				var actualName string
				switch spec := result[i].Spec.(type) {
				case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
					actualName = spec.Name
				case qbtypes.QueryBuilderFormula:
					actualName = spec.Name
				}
				assert.Equal(t, expectedName, actualName)
			}

			// verify formula queries have correct type
			for i := len(tt.queries); i < len(result); i++ {
				assert.Equal(t, qbtypes.QueryTypeFormula, result[i].Type)
				_, ok := result[i].Spec.(qbtypes.QueryBuilderFormula)
				assert.True(t, ok, "formula spec should be QueryBuilderFormula type")
			}
		})
	}
}

func TestSelectedQueryNameWithFormulas(t *testing.T) {
	tests := []struct {
		name              string
		selectedQuery     string
		queries           []qbtypes.QueryEnvelope
		formulas          []qbtypes.QueryBuilderFormula
		expectedSelected  string
		description       string
	}{
		{
			name:          "explicit formula selection",
			selectedQuery: "F1",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:     "A",
						Disabled: false,
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   false,
				},
			},
			expectedSelected: "F1",
			description:      "should return F1 when explicitly selected",
		},
		{
			name:          "formula in candidates with no explicit selection",
			selectedQuery: "",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:     "A",
						Disabled: false,
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   false,
				},
			},
			expectedSelected: "F1",
			description:      "should default to F1 when available (backward compat)",
		},
		{
			name:          "multiple formulas without selection",
			selectedQuery: "",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:     "A",
						Disabled: false,
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   false,
				},
				{
					Name:       "F2",
					Expression: "A + 1",
					Disabled:   false,
				},
			},
			expectedSelected: "F1",
			description:      "should default to F1 when available (backward compat)",
		},
		{
			name:          "disabled formula excluded from selection",
			selectedQuery: "",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:     "A",
						Disabled: false,
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   true,
				},
			},
			expectedSelected: "A",
			description:      "should not select disabled formula, falls back to query",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rc := &RuleCondition{
				SelectedQuery: tt.selectedQuery,
				CompositeQuery: &AlertCompositeQuery{
					Queries:       tt.queries,
					QueryFormulas: tt.formulas,
					QueryType:     QueryTypeBuilder,
					PanelType:     PanelTypeValue,
				},
			}

			result := rc.SelectedQueryName()
			assert.Equal(t, tt.expectedSelected, result, tt.description)
		})
	}
}

func TestValidateWithFormulas(t *testing.T) {
	tests := []struct {
		name          string
		selectedQuery string
		queries       []qbtypes.QueryEnvelope
		formulas      []qbtypes.QueryBuilderFormula
		expectedError bool
		errorContains string
		description   string
	}{
		{
			name:          "valid formula reference",
			selectedQuery: "F1",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   false,
				},
			},
			expectedError: false,
			description:   "should accept valid formula reference",
		},
		{
			name:          "invalid formula reference",
			selectedQuery: "F2",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   false,
				},
			},
			expectedError: true,
			errorContains: "does not match any query in compositeQuery",
			description:   "should reject non-existent formula reference",
		},
		{
			name:          "disabled formula reference",
			selectedQuery: "F1",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   true,
				},
			},
			expectedError: true,
			errorContains: "does not match any query in compositeQuery",
			description:   "should reject disabled formula reference",
		},
		{
			name:          "valid query reference with formulas",
			selectedQuery: "A",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   false,
				},
			},
			expectedError: false,
			description:   "should accept query reference alongside formulas",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rc := &RuleCondition{
				SelectedQuery: tt.selectedQuery,
				CompositeQuery: &AlertCompositeQuery{
					Queries:       tt.queries,
					QueryFormulas: tt.formulas,
					QueryType:     QueryTypeBuilder,
					PanelType:     PanelTypeValue,
				},
				Target:          ptrFloat64(10.0),
				CompareOperator: ValueIsAbove,
				MatchType:       AllTheTimes,
			}

			// check if selectedQuery is valid against queries and formulas
			found := false
			for _, query := range rc.CompositeQuery.Queries {
				if query.GetQueryName() == tt.selectedQuery {
					found = true
					break
				}
			}
			if !found {
				for _, formula := range rc.CompositeQuery.QueryFormulas {
					if formula.Name == tt.selectedQuery && !formula.Disabled {
						found = true
						break
					}
				}
			}

			if tt.expectedError {
				assert.False(t, found, tt.description)
			} else {
				assert.True(t, found, tt.description)
			}
		})
	}
}

func ptrFloat64(v float64) *float64 {
	return &v
}
