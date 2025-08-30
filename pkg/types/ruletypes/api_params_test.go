package ruletypes

import (
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
				if len(rule.RuleCondition.Thresholds) == 0 {
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
				if len(rule.RuleCondition.Thresholds) == 0 {
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
			rule, err := ParseIntoRule(tt.initRule, tt.content, tt.kind)

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

			if rule == nil {
				t.Error("Expected rule but got nil")
				return
			}

			if tt.validate != nil {
				tt.validate(t, rule)
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
			"targetUnit": "ms"
		}
	}`)

	rule, err := ParseIntoRule(PostableRule{}, content, RuleDataKindJson)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if len(rule.RuleCondition.Thresholds) != 1 {
		t.Errorf("Expected 1 threshold, got %d", len(rule.RuleCondition.Thresholds))
	}

	threshold := rule.RuleCondition.Thresholds[0]
	if threshold.Name() != CriticalThresholdName {
		t.Errorf("Expected threshold name '%s', got '%s'", CriticalThresholdName, threshold.Name())
	}

	if threshold.Target() != 0.1 {
		t.Errorf("Expected threshold target 0.1 (100ms converted to seconds), got %f", threshold.Target())
	}
}

func TestParseIntoRuleMultipleThresholds(t *testing.T) {
	content := []byte(`{
		"alert": "MultiThresholdAlert",
		"ruleType": "threshold_rule",
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
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
			"target": 5.0,
			"matchType": "1",
			"op": "1",
			"selectedQuery": "A",
			"thresholds": [
				{
					"kind": "basic",
					"spec": {
						"name": "WARNING",
						"target": 70.0,
						"matchType": "1",
						"op": "1",
						"selectedQuery": "A",
						"targetUnit": "%",
						"ruleUnit": "%"
					}
				},
				{
					"kind": "basic",
					"spec": {
						"name": "CRITICAL",
						"target": 90.0,
						"matchType": "1",
						"op": "1",
						"selectedQuery": "A",
						"targetUnit": "%",
						"ruleUnit": "%"
					}
				}
			]
		}
	}`) // for now, it needs both thresholds and target, compareOP as separate fields in condition.

	rule, err := ParseIntoRule(PostableRule{}, content, RuleDataKindJson)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if len(rule.RuleCondition.Thresholds) != 2 {
		t.Errorf("Expected 2 thresholds, got %d", len(rule.RuleCondition.Thresholds))
		return
	}

	// Check WARNING threshold
	var warningThreshold, criticalThreshold *BasicRuleThreshold
	for _, threshold := range rule.RuleCondition.Thresholds {
		if basicThreshold, ok := threshold.(*BasicRuleThreshold); ok {
			if basicThreshold.Name() == "WARNING" {
				warningThreshold = basicThreshold
			} else if basicThreshold.Name() == "CRITICAL" {
				criticalThreshold = basicThreshold
			}
		}
	}

	if warningThreshold == nil {
		t.Error("Expected WARNING threshold to be found")
	} else {
		if warningThreshold.Target() != 70.0 {
			t.Errorf("Expected WARNING threshold target 70.0, got %f", warningThreshold.Target())
		}
		if warningThreshold.CompareOp() != ValueIsAbove {
			t.Errorf("Expected WARNING threshold op '%s', got '%s'", ValueIsAbove, warningThreshold.CompareOp())
		}
		if warningThreshold.MatchType() != AtleastOnce {
			t.Errorf("Expected WARNING threshold match type '%s', got '%s'", AtleastOnce, warningThreshold.MatchType())
		}
	}

	if criticalThreshold == nil {
		t.Error("Expected CRITICAL threshold to be found")
	} else {
		if criticalThreshold.Target() != 90.0 {
			t.Errorf("Expected CRITICAL threshold target 90.0, got %f", criticalThreshold.Target())
		}
		if criticalThreshold.CompareOp() != ValueIsAbove {
			t.Errorf("Expected CRITICAL threshold op '%s', got '%s'", ValueIsAbove, criticalThreshold.CompareOp())
		}
		if criticalThreshold.MatchType() != AtleastOnce {
			t.Errorf("Expected CRITICAL threshold match type '%s', got '%s'", AtleastOnce, criticalThreshold.MatchType())
		}
	}

}
