package rules

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"

	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

func TestThresholdRuleShouldAlert(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Tricky Condition Tests",
		AlertType:  AlertTypeMetric,
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

	cases := []struct {
		values              v3.Series
		expectAlert         bool
		compareOp           string
		matchType           string
		target              float64
		expectedAlertSample v3.Point
	}{
		// Test cases for Equals Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "2", // Always
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		// Test cases for Equals Once
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		// Test cases for Greater Than Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "2", // Always
			target:              1.5,
			expectedAlertSample: v3.Point{Value: 2.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "2", // Always
			target:      4.5,
		},
		// Test cases for Greater Than Once
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "1", // Once
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.0},
					{Value: 4.0},
					{Value: 4.0},
					{Value: 4.0},
					{Value: 4.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "1", // Once
			target:      4.5,
		},
		// Test cases for Not Equals Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "2", // Always
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		// Test cases for Not Equals Once
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		// Test cases for Less Than Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.5},
					{Value: 1.5},
					{Value: 1.5},
					{Value: 1.5},
					{Value: 1.5},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "2", // Always
			target:              4,
			expectedAlertSample: v3.Point{Value: 1.5},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.5},
					{Value: 2.5},
					{Value: 1.5},
					{Value: 3.5},
					{Value: 1.5},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "2", // Always
			target:              4,
			expectedAlertSample: v3.Point{Value: 3.5},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "2", // Always
			target:      4,
		},
		// Test cases for Less Than Once
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 2.5},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "1", // Once
			target:              4,
			expectedAlertSample: v3.Point{Value: 2.5},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "1", // Once
			target:      4,
		},
		// Test cases for OnAverage
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "3", // OnAverage
			target:              6.0,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "3", // OnAverage
			target:      4.5,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "3", // OnAverage
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "3", // OnAverage
			target:      6.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "3", // OnAverage
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 11.0},
					{Value: 4.0},
					{Value: 3.0},
					{Value: 7.0},
					{Value: 12.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Above
			matchType:           "2", // Always
			target:              2.0,
			expectedAlertSample: v3.Point{Value: 3.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 11.0},
					{Value: 4.0},
					{Value: 3.0},
					{Value: 7.0},
					{Value: 12.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Below
			matchType:           "2", // Always
			target:              13.0,
			expectedAlertSample: v3.Point{Value: 12.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "3", // OnAverage
			target:              12.0,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		// Test cases for InTotal
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "4", // InTotal
			target:              30.0,
			expectedAlertSample: v3.Point{Value: 30.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "4", // InTotal
			target:      20.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "4", // InTotal
			target:              9.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "4", // InTotal
			target:      10.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "4", // InTotal
			target:              10.0,
			expectedAlertSample: v3.Point{Value: 20.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "4", // InTotal
			target:      20.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "4", // InTotal
			target:              30.0,
			expectedAlertSample: v3.Point{Value: 20.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "4", // InTotal
			target:      20.0,
		},
		// Test cases for Last
		// greater than last
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "5", // Last
			target:              5.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "5", // Last
			target:      20.0,
		},
		// less than last
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "5", // Last
			target:              15.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "5", // Last
			target:      5.0,
		},
		// equals last
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "5", // Last
			target:              10.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "5", // Last
			target:      5.0,
		},
		// not equals last
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "5", // Last
			target:              5.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "5", // Last
			target:      10.0,
		},
	}

	fm := featureManager.StartManager()
	for idx, c := range cases {
		postableRule.RuleCondition.CompareOp = CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target

		rule, err := NewThresholdRule("69", &postableRule, fm, nil, true, true, WithEvalDelay(2*time.Minute))
		if err != nil {
			assert.NoError(t, err)
		}

		values := c.values
		for i := range values.Points {
			values.Points[i].Timestamp = time.Now().UnixMilli()
		}

		smpl, shoulAlert := rule.ShouldAlert(c.values)
		assert.Equal(t, c.expectAlert, shoulAlert, "Test case %d", idx)
		if shoulAlert {
			assert.Equal(t, c.expectedAlertSample.Value, smpl.V, "Test case %d", idx)
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
		assert.Equal(t, c.expected, common.NormalizeLabelName(c.labelName))
	}
}

func TestPrepareLinksToLogs(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Tricky Condition Tests",
		AlertType:  AlertTypeLogs,
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
							Key: "",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceLogs,
						Expression:        "A",
					},
				},
			},
			CompareOp:     "4", // Not Equals
			MatchType:     "1", // Once
			Target:        &[]float64{0.0}[0],
			SelectedQuery: "A",
		},
	}
	fm := featureManager.StartManager()

	rule, err := NewThresholdRule("69", &postableRule, fm, nil, true, true, WithEvalDelay(2*time.Minute))
	if err != nil {
		assert.NoError(t, err)
	}

	ts := time.UnixMilli(1705469040000)

	link := rule.prepareLinksToLogs(ts, labels.Labels{})
	assert.Contains(t, link, "&timeRange=%7B%22start%22%3A1705468620000%2C%22end%22%3A1705468920000%2C%22pageSize%22%3A100%7D&startTime=1705468620000&endTime=1705468920000")
}

func TestPrepareLinksToTraces(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Links to traces test",
		AlertType:  AlertTypeTraces,
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
							Key: "durationNano",
						},
						AggregateOperator: v3.AggregateOperatorAvg,
						DataSource:        v3.DataSourceTraces,
						Expression:        "A",
					},
				},
			},
			CompareOp:     "4", // Not Equals
			MatchType:     "1", // Once
			Target:        &[]float64{0.0}[0],
			SelectedQuery: "A",
		},
	}
	fm := featureManager.StartManager()

	rule, err := NewThresholdRule("69", &postableRule, fm, nil, true, true, WithEvalDelay(2*time.Minute))
	if err != nil {
		assert.NoError(t, err)
	}

	ts := time.UnixMilli(1705469040000)

	link := rule.prepareLinksToTraces(ts, labels.Labels{})
	assert.Contains(t, link, "&timeRange=%7B%22start%22%3A1705468620000000000%2C%22end%22%3A1705468920000000000%2C%22pageSize%22%3A100%7D&startTime=1705468620000000000&endTime=1705468920000000000")
}

func TestThresholdRuleLabelNormalization(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Tricky Condition Tests",
		AlertType:  AlertTypeMetric,
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

	cases := []struct {
		values      v3.Series
		expectAlert bool
		compareOp   string
		matchType   string
		target      float64
	}{
		// Test cases for Equals Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
				Labels: map[string]string{
					"service.name": "frontend",
				},
				LabelsArray: []map[string]string{
					{
						"service.name": "frontend",
					},
				},
			},
			expectAlert: true,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
	}

	fm := featureManager.StartManager()
	for idx, c := range cases {
		postableRule.RuleCondition.CompareOp = CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target

		rule, err := NewThresholdRule("69", &postableRule, fm, nil, true, true, WithEvalDelay(2*time.Minute))
		if err != nil {
			assert.NoError(t, err)
		}

		values := c.values
		for i := range values.Points {
			values.Points[i].Timestamp = time.Now().UnixMilli()
		}

		sample, shoulAlert := rule.ShouldAlert(c.values)
		for name, value := range c.values.Labels {
			assert.Equal(t, value, sample.Metric.Get(name))
		}

		assert.Equal(t, c.expectAlert, shoulAlert, "Test case %d", idx)
	}
}

func TestThresholdRuleEvalDelay(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Test Eval Delay",
		AlertType:  AlertTypeMetric,
		RuleType:   RuleTypeThreshold,
		EvalWindow: Duration(5 * time.Minute),
		Frequency:  Duration(1 * time.Minute),
		RuleCondition: &RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"A": {
						Query: "SELECT 1 >= {{.start_timestamp_ms}} AND 1 <= {{.end_timestamp_ms}}",
					},
				},
			},
		},
	}

	// 01:39:47
	ts := time.Unix(1717205987, 0)

	cases := []struct {
		expectedQuery string
	}{
		// Test cases for Equals Always
		{
			// 01:34:00 - 01:39:00
			expectedQuery: "SELECT 1 >= 1717205640000 AND 1 <= 1717205940000",
		},
	}

	fm := featureManager.StartManager()
	for idx, c := range cases {
		rule, err := NewThresholdRule("69", &postableRule, fm, nil, true, true) // no eval delay
		if err != nil {
			assert.NoError(t, err)
		}

		params, err := rule.prepareQueryRange(ts)
		assert.NoError(t, err)
		assert.Equal(t, c.expectedQuery, params.CompositeQuery.ClickHouseQueries["A"].Query, "Test case %d", idx)

		secondTimeParams, err := rule.prepareQueryRange(ts)
		assert.NoError(t, err)
		assert.Equal(t, c.expectedQuery, secondTimeParams.CompositeQuery.ClickHouseQueries["A"].Query, "Test case %d", idx)
	}
}

func TestThresholdRuleClickHouseTmpl(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Tricky Condition Tests",
		AlertType:  AlertTypeMetric,
		RuleType:   RuleTypeThreshold,
		EvalWindow: Duration(5 * time.Minute),
		Frequency:  Duration(1 * time.Minute),
		RuleCondition: &RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"A": {
						Query: "SELECT 1 >= {{.start_timestamp_ms}} AND 1 <= {{.end_timestamp_ms}}",
					},
				},
			},
		},
	}

	// 01:39:47
	ts := time.Unix(1717205987, 0)

	cases := []struct {
		expectedQuery string
	}{
		// Test cases for Equals Always
		{
			// 01:32:00 - 01:37:00
			expectedQuery: "SELECT 1 >= 1717205520000 AND 1 <= 1717205820000",
		},
	}

	fm := featureManager.StartManager()
	for idx, c := range cases {
		rule, err := NewThresholdRule("69", &postableRule, fm, nil, true, true, WithEvalDelay(2*time.Minute))
		if err != nil {
			assert.NoError(t, err)
		}

		params, err := rule.prepareQueryRange(ts)
		assert.NoError(t, err)
		assert.Equal(t, c.expectedQuery, params.CompositeQuery.ClickHouseQueries["A"].Query, "Test case %d", idx)

		secondTimeParams, err := rule.prepareQueryRange(ts)
		assert.NoError(t, err)
		assert.Equal(t, c.expectedQuery, secondTimeParams.CompositeQuery.ClickHouseQueries["A"].Query, "Test case %d", idx)
	}
}

type queryMatcherAny struct {
}

func (m *queryMatcherAny) Match(x string, y string) error {
	return nil
}

func TestThresholdRuleUnitCombinations(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Units test",
		AlertType:  AlertTypeMetric,
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
							Key: "signoz_calls_total",
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}
	fm := featureManager.StartManager()
	mock, err := cmock.NewClickHouseWithQueryMatcher(nil, &queryMatcherAny{})
	if err != nil {
		t.Errorf("an error '%s' was not expected when opening a stub database connection", err)
	}

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	cases := []struct {
		targetUnit   string
		yAxisUnit    string
		values       [][]interface{}
		expectAlerts int
		compareOp    string
		matchType    string
		target       float64
		summaryAny   []string
	}{
		{
			targetUnit: "s",
			yAxisUnit:  "ns",
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 0.57 seconds
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 0.57 seconds
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 seconds
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 seconds
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 0.06 seconds
			},
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       1,   // 1 second
		},
		{
			targetUnit: "ms",
			yAxisUnit:  "ns",
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 572.58 ms
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 572.38 ms
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 300.94 ms
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 299.31 ms
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 ms
			},
			expectAlerts: 4,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 ms
			summaryAny: []string{
				"observed metric value is 299 ms",
				"the observed metric value is 573 ms",
				"the observed metric value is 572 ms",
				"the observed metric value is 301 ms",
			},
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "bytes",
			values: [][]interface{}{
				{float64(2863284053), "attr", time.Now()},                             // 2.86 GB
				{float64(2863388842), "attr", time.Now().Add(1 * time.Second)},        // 2.86 GB
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 GB
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 GB
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 MB
			},
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 GB
		},
	}

	for idx, c := range cases {
		rows := cmock.NewRows(cols, c.values)

		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		mock.
			ExpectQuery(queryString).
			WillReturnRows(rows)
		postableRule.RuleCondition.CompareOp = CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.CompositeQuery.Unit = c.yAxisUnit
		postableRule.RuleCondition.TargetUnit = c.targetUnit
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		options := clickhouseReader.NewOptions("", "", "archiveNamespace")
		reader := clickhouseReader.NewReaderFromClickhouseConnection(mock, options, nil, "", fm, "", true, true, time.Duration(time.Second), nil)

		rule, err := NewThresholdRule("69", &postableRule, fm, reader, true, true)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		assert.Equal(t, c.expectAlerts, retVal.(int), "case %d", idx)
		if c.expectAlerts != 0 {
			foundCount := 0
			for _, item := range rule.Active {
				for _, summary := range c.summaryAny {
					if strings.Contains(item.Annotations.Get("summary"), summary) {
						foundCount++
						break
					}
				}
			}
			assert.Equal(t, c.expectAlerts, foundCount, "case %d", idx)
		}
	}
}

func TestThresholdRuleNoData(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "No data test",
		AlertType:  AlertTypeMetric,
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
							Key: "signoz_calls_total",
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
			AlertOnAbsent: true,
		},
	}
	fm := featureManager.StartManager()
	mock, err := cmock.NewClickHouseWithQueryMatcher(nil, &queryMatcherAny{})
	if err != nil {
		t.Errorf("an error '%s' was not expected when opening a stub database connection", err)
	}

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	cases := []struct {
		values       [][]interface{}
		expectNoData bool
	}{
		{
			values:       [][]interface{}{},
			expectNoData: true,
		},
	}

	for idx, c := range cases {
		rows := cmock.NewRows(cols, c.values)

		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		mock.
			ExpectQuery(queryString).
			WillReturnRows(rows)
		var target float64 = 0
		postableRule.RuleCondition.CompareOp = ValueIsEq
		postableRule.RuleCondition.MatchType = AtleastOnce
		postableRule.RuleCondition.Target = &target
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		options := clickhouseReader.NewOptions("", "", "archiveNamespace")
		reader := clickhouseReader.NewReaderFromClickhouseConnection(mock, options, nil, "", fm, "", true, true, time.Duration(time.Second), nil)

		rule, err := NewThresholdRule("69", &postableRule, fm, reader, true, true)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		assert.Equal(t, 1, retVal.(int), "case %d", idx)
		for _, item := range rule.Active {
			if c.expectNoData {
				assert.True(t, strings.Contains(item.Labels.Get(labels.AlertNameLabel), "[No data]"), "case %d", idx)
			} else {
				assert.False(t, strings.Contains(item.Labels.Get(labels.AlertNameLabel), "[No data]"), "case %d", idx)
			}
		}
	}
}

func TestThresholdRuleTracesLink(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Traces link test",
		AlertType:  AlertTypeTraces,
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
							Key: "durationNano",
						},
						AggregateOperator: v3.AggregateOperatorP95,
						DataSource:        v3.DataSourceTraces,
						Expression:        "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "httpMethod", IsColumn: true, Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeString},
									Value:    "GET",
									Operator: v3.FilterOperatorEqual,
								},
							},
						},
					},
				},
			},
		},
	}
	fm := featureManager.StartManager()
	mock, err := cmock.NewClickHouseWithQueryMatcher(nil, &queryMatcherAny{})
	if err != nil {
		t.Errorf("an error '%s' was not expected when opening a stub database connection", err)
	}

	metaCols := make([]cmock.ColumnType, 0)
	metaCols = append(metaCols, cmock.ColumnType{Name: "DISTINCT(tagKey)", Type: "String"})
	metaCols = append(metaCols, cmock.ColumnType{Name: "tagType", Type: "String"})
	metaCols = append(metaCols, cmock.ColumnType{Name: "dataType", Type: "String"})
	metaCols = append(metaCols, cmock.ColumnType{Name: "isColumn", Type: "Bool"})

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	for idx, c := range testCases {
		metaRows := cmock.NewRows(metaCols, c.metaValues)
		mock.
			ExpectQuery("SELECT DISTINCT(tagKey), tagType, dataType FROM archiveNamespace.span_attributes_keys").
			WillReturnRows(metaRows)

		mock.
			ExpectSelect("SHOW CREATE TABLE signoz_traces.distributed_signoz_index_v3").WillReturnRows(&cmock.Rows{})

		rows := cmock.NewRows(cols, c.values)

		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		mock.
			ExpectQuery(queryString).
			WillReturnRows(rows)
		postableRule.RuleCondition.CompareOp = CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.CompositeQuery.Unit = c.yAxisUnit
		postableRule.RuleCondition.TargetUnit = c.targetUnit
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		options := clickhouseReader.NewOptions("", "", "archiveNamespace")
		reader := clickhouseReader.NewReaderFromClickhouseConnection(mock, options, nil, "", fm, "", true, true, time.Duration(time.Second), nil)

		rule, err := NewThresholdRule("69", &postableRule, fm, reader, true, true)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		if c.expectAlerts == 0 {
			assert.Equal(t, 0, retVal.(int), "case %d", idx)
		} else {
			assert.Equal(t, c.expectAlerts, retVal.(int), "case %d", idx)
			for _, item := range rule.Active {
				for name, value := range item.Annotations.Map() {
					if name == "related_traces" {
						assert.NotEmpty(t, value, "case %d", idx)
						assert.Contains(t, value, "GET")
					}
				}
			}
		}
	}
}

func TestThresholdRuleLogsLink(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Logs link test",
		AlertType:  AlertTypeLogs,
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
							Key: "component",
						},
						AggregateOperator: v3.AggregateOperatorCountDistinct,
						DataSource:        v3.DataSourceLogs,
						Expression:        "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "k8s.container.name", IsColumn: false, Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeString},
									Value:    "testcontainer",
									Operator: v3.FilterOperatorEqual,
								},
							},
						},
					},
				},
			},
		},
	}
	fm := featureManager.StartManager()
	mock, err := cmock.NewClickHouseWithQueryMatcher(nil, &queryMatcherAny{})
	if err != nil {
		t.Errorf("an error '%s' was not expected when opening a stub database connection", err)
	}

	attrMetaCols := make([]cmock.ColumnType, 0)
	attrMetaCols = append(attrMetaCols, cmock.ColumnType{Name: "name", Type: "String"})
	attrMetaCols = append(attrMetaCols, cmock.ColumnType{Name: "dataType", Type: "String"})

	resourceMetaCols := make([]cmock.ColumnType, 0)
	resourceMetaCols = append(resourceMetaCols, cmock.ColumnType{Name: "name", Type: "String"})
	resourceMetaCols = append(resourceMetaCols, cmock.ColumnType{Name: "dataType", Type: "String"})

	createTableCols := make([]cmock.ColumnType, 0)
	createTableCols = append(createTableCols, cmock.ColumnType{Name: "statement", Type: "String"})

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	for idx, c := range testCases {
		attrMetaRows := cmock.NewRows(attrMetaCols, c.attrMetaValues)
		mock.
			ExpectSelect("SELECT DISTINCT name, datatype from signoz_logs.distributed_logs_attribute_keys group by name, datatype").
			WillReturnRows(attrMetaRows)

		resourceMetaRows := cmock.NewRows(resourceMetaCols, c.resourceMetaValues)
		mock.
			ExpectSelect("SELECT DISTINCT name, datatype from signoz_logs.distributed_logs_resource_keys group by name, datatype").
			WillReturnRows(resourceMetaRows)

		createTableRows := cmock.NewRows(createTableCols, c.createTableValues)
		mock.
			ExpectSelect("SHOW CREATE TABLE signoz_logs.logs").
			WillReturnRows(createTableRows)

		rows := cmock.NewRows(cols, c.values)

		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		mock.
			ExpectQuery(queryString).
			WillReturnRows(rows)
		postableRule.RuleCondition.CompareOp = CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.CompositeQuery.Unit = c.yAxisUnit
		postableRule.RuleCondition.TargetUnit = c.targetUnit
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		options := clickhouseReader.NewOptions("", "", "archiveNamespace")
		reader := clickhouseReader.NewReaderFromClickhouseConnection(mock, options, nil, "", fm, "", true, true, time.Duration(time.Second), nil)

		rule, err := NewThresholdRule("69", &postableRule, fm, reader, true, true)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		if c.expectAlerts == 0 {
			assert.Equal(t, 0, retVal.(int), "case %d", idx)
		} else {
			assert.Equal(t, c.expectAlerts, retVal.(int), "case %d", idx)
			for _, item := range rule.Active {
				for name, value := range item.Annotations.Map() {
					if name == "related_logs" {
						assert.NotEmpty(t, value, "case %d", idx)
						assert.Contains(t, value, "testcontainer")
					}
				}
			}
		}
	}
}

func TestThresholdRuleShiftBy(t *testing.T) {
	target := float64(10)
	postableRule := PostableRule{
		AlertName:  "Logs link test",
		AlertType:  AlertTypeLogs,
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
							Key: "component",
						},
						AggregateOperator: v3.AggregateOperatorCountDistinct,
						DataSource:        v3.DataSourceLogs,
						Expression:        "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "k8s.container.name", IsColumn: false, Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeString},
									Value:    "testcontainer",
									Operator: v3.FilterOperatorEqual,
								},
							},
						},
						Functions: []v3.Function{
							{
								Name: v3.FunctionNameTimeShift,
								Args: []interface{}{float64(10)},
							},
						},
					},
				},
			},
			Target:    &target,
			CompareOp: ValueAboveOrEq,
		},
	}

	rule, err := NewThresholdRule("69", &postableRule, nil, nil, true, true)
	if err != nil {
		assert.NoError(t, err)
	}
	rule.TemporalityMap = map[string]map[v3.Temporality]bool{
		"signoz_calls_total": {
			v3.Delta: true,
		},
	}

	params, err := rule.prepareQueryRange(time.Now())
	if err != nil {
		assert.NoError(t, err)
	}

	assert.Equal(t, int64(10), params.CompositeQuery.BuilderQueries["A"].ShiftBy)
}
