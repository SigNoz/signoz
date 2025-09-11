package ruletypes

import (
	"encoding/json"
	"github.com/stretchr/testify/assert"
	"testing"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
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

func TestParseIntoRule(t *testing.T) {
	tests := []struct {
		name        string
		initRule    PostableRule
		content     []byte
		kind        RuleDataKind
		expectError bool
		validate    func(*testing.T, *PostableRule)
	}{
		{
			name:     "valid JSON with complete rule",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "TestAlert",
				"alertType": "METRIC_BASED_ALERT",
				"description": "Test description",
				"ruleType": "threshold_rule",
				"evalWindow": "5m",
				"frequency": "1m",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"expression": "A",
								"disabled": false,
								"aggregateAttribute": {
									"key": "test_metric"
								}
							}
						}
					},
					"target": 10.0,
					"matchType": "1",
					"op": "1",
					"selectedQuery": "A"
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.AlertName != "TestAlert" {
					t.Errorf("Expected alert name 'TestAlert', got '%s'", rule.AlertName)
				}
				if rule.RuleType != RuleTypeThreshold {
					t.Errorf("Expected rule type '%s', got '%s'", RuleTypeThreshold, rule.RuleType)
				}
				if rule.RuleCondition.Thresholds.Kind.IsZero() {
					t.Error("Expected thresholds to be populated")
				}
				if rule.RuleCondition.Target == nil {
					t.Error("Expected target to be populated")
				}
			},
		},
		{
			name:     "rule with default values applied",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "DefaultsRule",
				"ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"disabled": false,
								"aggregateAttribute": {
									"key": "test_metric"
								}
							}
						}
					},
					"target": 5.0,
					"matchType": "1",
					"op": "1",
					"selectedQuery": "A"
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.EvalWindow != Duration(5*time.Minute) {
					t.Errorf("Expected default eval window '5m', got '%v'", rule.EvalWindow)
				}
				if rule.Frequency != Duration(1*time.Minute) {
					t.Errorf("Expected default frequency '1m', got '%v'", rule.Frequency)
				}
				if rule.RuleCondition.CompositeQuery.BuilderQueries["A"].Expression != "A" {
					t.Errorf("Expected expression 'A', got '%s'", rule.RuleCondition.CompositeQuery.BuilderQueries["A"].Expression)
				}
			},
		},
		{
			name:     "PromQL rule type detection",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "PromQLRule",
				"condition": {
					"compositeQuery": {
						"queryType": "promql",
						"promQueries": {
							"A": {
								"query": "rate(http_requests_total[5m])",
								"disabled": false
							}
						}
					},
					"target": 10.0,
					"matchType": "1",
					"op": "1",
					"selectedQuery": "A"
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.RuleType != RuleTypeProm {
					t.Errorf("Expected rule type 'PROM_QL_RULE', got '%s'", rule.RuleType)
				}
				if rule.RuleCondition.Thresholds.Kind.IsZero() {
					t.Error("Expected thresholds to be populated")
				}
				if rule.RuleCondition.Target == nil {
					t.Error("Expected target to be populated")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := json.Unmarshal(tt.content, &tt.initRule)
			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if tt.validate != nil {
				tt.validate(t, &tt.initRule)
			}
		})
	}
}

func TestParseIntoRuleThresholdGeneration(t *testing.T) {
	content := []byte(`{
		"alert": "TestThresholds",
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
				"builderQueries": {
					"A": {
						"expression": "A",
						"disabled": false,
						"aggregateAttribute": {
							"key": "response_time"
						}
					}
				}
			},
			"target": 100.0,
			"matchType": "1",
			"op": "1",
			"selectedQuery": "A",
			"targetUnit": "ms",
			"thresholds": {
				"kind": "basic",
				"spec": [
					{
						"name": "CRITICAL",
						"target": 100.0,
						"targetUnit": "ms",
						"ruleUnit": "s",
						"matchType": "1",
						"op": "1",
						"selectedQuery": "A"
					}
				]
			}
		}
	}`)
	rule := PostableRule{}
	err := json.Unmarshal(content, &rule)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Check that thresholds were parsed correctly
	if rule.RuleCondition.Thresholds.Kind != BasicThresholdKind {
		t.Errorf("Expected threshold kind 'basic', got '%s'", rule.RuleCondition.Thresholds.Kind)
	}

	// Get the threshold and test functionality
	threshold, err := rule.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		t.Fatalf("Failed to get threshold: %v", err)
	}

	// Test that threshold can evaluate properly
	vector, err := threshold.ShouldAlert(v3.Series{
		Points: []v3.Point{{Value: 0.15, Timestamp: 1000}}, // 150ms in seconds
		Labels: map[string]string{"test": "label"},
	})
	if err != nil {
		t.Fatalf("Unexpected error in ShouldAlert: %v", err)
	}

	if len(vector) == 0 {
		t.Error("Expected alert to be triggered for value above threshold")
	}
}

func TestParseIntoRuleMultipleThresholds(t *testing.T) {
	content := []byte(`{
		"alert": "MultiThresholdAlert",
		"ruleType": "threshold_rule",
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
				"unit": "%",
				"builderQueries": {
					"A": {
						"expression": "A",
						"disabled": false,
						"aggregateAttribute": {
							"key": "cpu_usage"
						}
					}
				}
			},
			"target": 90.0,
			"matchType": "1",
			"op": "1",
			"selectedQuery": "A",
			"thresholds": {
				"kind": "basic",
				"spec": [
					{
						"name": "WARNING",
						"target": 70.0,
						"targetUnit": "%",
						"ruleUnit": "%",
						"matchType": "1",
						"op": "1",
						"selectedQuery": "A"
					},
					{
						"name": "CRITICAL",
						"target": 90.0,
						"targetUnit": "%",
						"ruleUnit": "%",
						"matchType": "1",
						"op": "1",
						"selectedQuery": "A"
					}
				]
			}
		}
	}`)
	rule := PostableRule{}
	err := json.Unmarshal(content, &rule)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if rule.RuleCondition.Thresholds.Kind != BasicThresholdKind {
		t.Errorf("Expected threshold kind 'basic', got '%s'", rule.RuleCondition.Thresholds.Kind)
	}

	threshold, err := rule.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		t.Fatalf("Failed to get threshold: %v", err)
	}

	// Test with a value that should trigger both WARNING and CRITICAL thresholds
	vector, err := threshold.ShouldAlert(v3.Series{
		Points: []v3.Point{{Value: 95.0, Timestamp: 1000}}, // 95% CPU usage
		Labels: map[string]string{"service": "test"},
	})
	if err != nil {
		t.Fatalf("Unexpected error in ShouldAlert: %v", err)
	}

	assert.Equal(t, 2, len(vector))

	vector, err = threshold.ShouldAlert(v3.Series{
		Points: []v3.Point{{Value: 75.0, Timestamp: 1000}}, // 75% CPU usage
		Labels: map[string]string{"service": "test"},
	})
	if err != nil {
		t.Fatalf("Unexpected error in ShouldAlert: %v", err)
	}

	assert.Equal(t, 1, len(vector))
}
