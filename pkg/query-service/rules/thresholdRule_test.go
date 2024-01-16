package rules

import (
	"context"
	"testing"
	"time"

	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestThresholdRuleCombinations(t *testing.T) {
	postableRule := PostableRule{
		Alert:      "Tricky Condition Tests",
		AlertType:  "METRIC_BASED_ALERT",
		RuleType:   RuleTypeThreshold,
		EvalWindow: Duration(5 * time.Minute),
		Frequency:  Duration(1 * time.Minute),
		RuleCondition: &RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}
	fm := featureManager.StartManager()
	mock, err := cmock.NewClickHouseNative(nil)
	if err != nil {
		t.Errorf("an error '%s' was not expected when opening a stub database connection", err)
	}

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Int32"})
	cols = append(cols, cmock.ColumnType{Name: "endpoint", Type: "String"})

	cases := []struct {
		values      [][]interface{}
		expectAlert bool
		compareOp   string
		matchType   string
		target      float64
	}{
		// Test cases for Equals Always
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
			},
			expectAlert: true,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		// Test cases for Equals Once
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
			},
			expectAlert: true,
			compareOp:   "3", // Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: true,
			compareOp:   "3", // Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: true,
			compareOp:   "3", // Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		// Test cases for Not Equals Always
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: true,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		// Test cases for Not Equals Once
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
			},
			expectAlert: true,
			compareOp:   "4", // Not Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(0), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
				{int32(0), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: true,
			compareOp:   "4", // Not Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: [][]interface{}{
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
				{int32(1), "endpoint"},
			},
			expectAlert: true,
			compareOp:   "4", // Not Equals
			matchType:   "1", // Once
			target:      0.0,
		},
	}

	for idx, c := range cases {
		rows := cmock.NewRows(cols, c.values)
		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT value, endpoint FROM table"
		mock.
			ExpectQuery(queryString).
			WillReturnRows(rows)
		postableRule.RuleCondition.CompareOp = CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target

		rule, err := NewThresholdRule("69", &postableRule, ThresholdRuleOpts{}, fm)
		if err != nil {
			assert.NoError(t, err)
		}

		result, err := rule.runChQuery(context.Background(), mock, queryString)
		if err != nil {
			assert.NoError(t, err)
		}
		if c.expectAlert {
			assert.Equal(t, 1, len(result), "case %d", idx)
		} else {
			assert.Equal(t, 0, len(result), "case %d", idx)
		}
	}
}

func TestNormalizeLabelName(t *testing.T) {
	cases := []struct {
		labelName string
		expected  string
	}{
		{
			labelName: "label",
			expected:  "label",
		},
		{
			labelName: "label.with.dots",
			expected:  "label_with_dots",
		},
		{
			labelName: "label-with-dashes",
			expected:  "label_with_dashes",
		},
		{
			labelName: "labelwithnospaces",
			expected:  "labelwithnospaces",
		},
		{
			labelName: "label with spaces",
			expected:  "label_with_spaces",
		},
		{
			labelName: "label with spaces and .dots",
			expected:  "label_with_spaces_and__dots",
		},
		{
			labelName: "label with spaces and -dashes",
			expected:  "label_with_spaces_and__dashes",
		},
	}

	for _, c := range cases {
		assert.Equal(t, c.expected, normalizeLabelName(c.labelName))
	}
}
