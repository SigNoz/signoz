package ruletypes

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

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

func TestParseIntoRuleSchemaVersioning(t *testing.T) {
	tests := []struct {
		name        string
		initRule    PostableRule
		content     []byte
		kind        RuleDataKind
		expectError bool
		validate    func(*testing.T, *PostableRule)
	}{
		{
			name:     "schema v1 - threshold name from severity label",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "SeverityLabelTest",
				"schemaVersion": "v1",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"aggregateAttribute": {
									"key": "cpu_usage"
								}
							}
						},
						"unit": "percent"
					},
					"target": 85.0,
					"targetUnit": "%",
					"matchType": "1",
					"op": "1"
				},
				"labels": {
					"severity": "warning",
					"team": "platform"
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.RuleCondition.Thresholds == nil {
					t.Fatal("Expected Thresholds to be populated for v1")
				}

				threshold := rule.RuleCondition.Thresholds
				if threshold.Kind != BasicThresholdKind {
					t.Errorf("Expected BasicThresholdKind, got %s", threshold.Kind)
				}

				specs, ok := threshold.Spec.(BasicRuleThresholds)
				if !ok {
					t.Fatalf("Expected BasicRuleThresholds, got %T", threshold.Spec)
				}

				if len(specs) != 1 {
					t.Fatalf("Expected 1 threshold spec, got %d", len(specs))
				}

				spec := specs[0]
				if spec.Name != "warning" {
					t.Errorf("Expected threshold name 'warning' from severity label, got '%s'", spec.Name)
				}

				if spec.TargetUnit != "%" {
					t.Errorf("Expected TargetUnit '%%', got '%s'", spec.TargetUnit)
				}
				if *spec.TargetValue != 85.0 {
					t.Errorf("Expected TargetValue 85.0, got %v", *spec.TargetValue)
				}
				if spec.MatchType != rule.RuleCondition.MatchType {
					t.Error("Expected MatchType to be copied from RuleCondition")
				}
				if spec.CompareOp != rule.RuleCondition.CompareOp {
					t.Error("Expected CompareOp to be copied from RuleCondition")
				}

				// Verify evaluation envelope is populated
				if rule.Evaluation == nil {
					t.Fatal("Expected Evaluation to be populated for v1")
				}
				if rule.Evaluation.Kind != RollingEvaluation {
					t.Errorf("Expected RollingEvaluation, got %s", rule.Evaluation.Kind)
				}

				// Verify evaluation window matches rule settings
				if window, ok := rule.Evaluation.Spec.(RollingWindow); ok {
					if window.EvalWindow != rule.EvalWindow {
						t.Errorf("Expected Evaluation EvalWindow %v, got %v", rule.EvalWindow, window.EvalWindow)
					}
					if window.Frequency != rule.Frequency {
						t.Errorf("Expected Evaluation Frequency %v, got %v", rule.Frequency, window.Frequency)
					}
				} else {
					t.Errorf("Expected RollingWindow spec, got %T", rule.Evaluation.Spec)
				}
			},
		},
		{
			name:     "schema v1 - uses critical threshold when no labels",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "NoLabelsTest",
				"schemaVersion": "v1",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"aggregateAttribute": {
									"key": "memory_usage"
								}
							}
						}
					},
					"target": 90.0,
					"matchType": "1",
					"op": "1"
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.RuleCondition.Thresholds == nil {
					t.Fatal("Expected Thresholds to be populated")
				}

				specs, ok := rule.RuleCondition.Thresholds.Spec.(BasicRuleThresholds)
				if !ok {
					t.Fatalf("Expected BasicRuleThresholds, got %T", rule.RuleCondition.Thresholds.Spec)
				}
				spec := specs[0]
				// Should default to CriticalThresholdName when no severity label
				if spec.Name != CriticalThresholdName {
					t.Errorf("Expected threshold name '%s', got '%s'", CriticalThresholdName, spec.Name)
				}
			},
		},
		{
			name:     "schema v1 - overwrites existing thresholds and evaluation",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "OverwriteTest",
				"schemaVersion": "v1",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"aggregateAttribute": {
									"key": "cpu_usage"
								}
							}
						},
						"unit": "percent"
					},
					"target": 80.0,
					"targetUnit": "%",
					"matchType": "1",
					"op": "1",
					"thresholds": {
						"kind": "basic",
						"spec": [{
							"name": "existing_threshold",
							"target": 50.0,
							"targetUnit": "MB",
							"ruleUnit": "bytes",
							"matchType": "1",
							"op": "1"
						}]
					}
				},
				"evaluation": {
					"kind": "rolling",
					"spec": {
						"evalWindow": "10m",
						"frequency": "2m"
					}
				},
				"frequency":"7m",
				"evalWindow":"11m",
				"labels": {
					"severity": "critical"
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.RuleCondition.Thresholds == nil {
					t.Fatal("Expected Thresholds to be populated")
				}

				specs, ok := rule.RuleCondition.Thresholds.Spec.(BasicRuleThresholds)
				if !ok {
					t.Fatalf("Expected BasicRuleThresholds, got %T", rule.RuleCondition.Thresholds.Spec)
				}

				if len(specs) != 1 {
					t.Fatalf("Expected 1 threshold spec, got %d", len(specs))
				}

				spec := specs[0]
				if spec.Name != "critical" {
					t.Errorf("Expected threshold name 'critical' (overwritten), got '%s'", spec.Name)
				}

				if *spec.TargetValue != 80.0 {
					t.Errorf("Expected TargetValue 80.0 (overwritten), got %v", *spec.TargetValue)
				}
				if spec.TargetUnit != "%" {
					t.Errorf("Expected TargetUnit '%%' (overwritten), got '%s'", spec.TargetUnit)
				}

				if rule.Evaluation == nil {
					t.Fatal("Expected Evaluation to be populated")
				}
				if window, ok := rule.Evaluation.Spec.(RollingWindow); ok {
					if window.EvalWindow != rule.EvalWindow {
						t.Errorf("Expected Evaluation EvalWindow to be overwritten to %v, got %v", rule.EvalWindow, window.EvalWindow)
					}
					if window.Frequency != rule.Frequency {
						t.Errorf("Expected Evaluation Frequency to be overwritten to %v, got %v", rule.Frequency, window.Frequency)
					}
				} else {
					t.Errorf("Expected RollingWindow spec, got %T", rule.Evaluation.Spec)
				}
			},
		},
		{
			name:     "schema v2 - does not populate thresholds and evaluation",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "V2Test",
				"schemaVersion": "v2",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"aggregateAttribute": {
									"key": "test_metric"
								}
							}
						}
					},
					"target": 100.0,
					"matchType": "1",
					"op": "1"
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.SchemaVersion != "v2" {
					t.Errorf("Expected schemaVersion 'v2', got '%s'", rule.SchemaVersion)
				}

				if rule.RuleCondition.Thresholds != nil {
					t.Error("Expected Thresholds to be nil for v2")
				}
				if rule.Evaluation != nil {
					t.Error("Expected Evaluation to be nil for v2")
				}

				if rule.EvalWindow != Duration(5*time.Minute) {
					t.Error("Expected default EvalWindow to be applied")
				}
				if rule.RuleType != RuleTypeThreshold {
					t.Error("Expected RuleType to be auto-detected")
				}
			},
		},
		{
			name:     "default schema version - defaults to v1 behavior",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "DefaultSchemaTest",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"aggregateAttribute": {
									"key": "test_metric"
								}
							}
						}
					},
					"target": 75.0,
					"matchType": "1",
					"op": "1"
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.SchemaVersion != DefaultSchemaVersion {
					t.Errorf("Expected default schemaVersion '%s', got '%s'", DefaultSchemaVersion, rule.SchemaVersion)
				}
				if rule.RuleCondition.Thresholds == nil {
					t.Error("Expected Thresholds to be populated for default schema version")
				}
				if rule.Evaluation == nil {
					t.Error("Expected Evaluation to be populated for default schema version")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rule := tt.initRule
			err := json.Unmarshal(tt.content, &rule)
			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if tt.validate != nil && err == nil {
				tt.validate(t, &rule)
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
	vector, err := threshold.Eval(v3.Series{
		Points: []v3.Point{{Value: 0.15, Timestamp: 1000}}, // 150ms in seconds
		Labels: map[string]string{"test": "label"},
	}, "", EvalData{})
	if err != nil {
		t.Fatalf("Unexpected error in shouldAlert: %v", err)
	}

	if len(vector) == 0 {
		t.Error("Expected alert to be triggered for value above threshold")
	}
}

func TestParseIntoRuleMultipleThresholds(t *testing.T) {
	content := []byte(`{
		"schemaVersion": "v2",
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
	vector, err := threshold.Eval(v3.Series{
		Points: []v3.Point{{Value: 95.0, Timestamp: 1000}}, // 95% CPU usage
		Labels: map[string]string{"service": "test"},
	}, "", EvalData{})
	if err != nil {
		t.Fatalf("Unexpected error in shouldAlert: %v", err)
	}

	assert.Equal(t, 2, len(vector))

	vector, err = threshold.Eval(v3.Series{
		Points: []v3.Point{{Value: 75.0, Timestamp: 1000}}, // 75% CPU usage
		Labels: map[string]string{"service": "test"},
	}, "", EvalData{})
	if err != nil {
		t.Fatalf("Unexpected error in shouldAlert: %v", err)
	}

	assert.Equal(t, 1, len(vector))
}

func TestAnomalyNegationEval(t *testing.T) {
	tests := []struct {
		name          string
		ruleJSON      []byte
		series        v3.Series
		shouldAlert   bool
		expectedValue float64
	}{
		{
			name: "anomaly rule with ValueIsBelow - should alert",
			ruleJSON: []byte(`{
				"alert": "AnomalyBelowTest",
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 2.0,
					"matchType": "1",
					"op": "2",
					"selectedQuery": "A"
				}
			}`),
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: -2.1}, // below & at least once, should alert
					{Timestamp: 2000, Value: -2.3},
				},
			},
			shouldAlert:   true,
			expectedValue: -2.1,
		},
		{
			name: "anomaly rule with ValueIsBelow; should not alert",
			ruleJSON: []byte(`{
				"alert": "AnomalyBelowTest",
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 2.0,
					"matchType": "1",
					"op": "2",
					"selectedQuery": "A"
				}
			}`), // below & at least once, no value below -2.0
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: -1.9},
					{Timestamp: 2000, Value: -1.8},
				},
			},
			shouldAlert: false,
		},
		{
			name: "anomaly rule with ValueIsAbove; should alert",
			ruleJSON: []byte(`{
				"alert": "AnomalyAboveTest",
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 2.0,
					"matchType": "1",
					"op": "1",
					"selectedQuery": "A"
				}
			}`), // above & at least once, should alert
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: 2.1}, // above 2.0, should alert
					{Timestamp: 2000, Value: 2.2},
				},
			},
			shouldAlert:   true,
			expectedValue: 2.1,
		},
		{
			name: "anomaly rule with ValueIsAbove; should not alert",
			ruleJSON: []byte(`{
				"alert": "AnomalyAboveTest",
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 2.0,
					"matchType": "1",
					"op": "1",
					"selectedQuery": "A"
				}
			}`),
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: 1.1},
					{Timestamp: 2000, Value: 1.2},
				},
			},
			shouldAlert: false,
		},
		{
			name: "anomaly rule with ValueIsBelow and AllTheTimes; should alert",
			ruleJSON: []byte(`{
				"alert": "AnomalyBelowAllTest",
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 2.0,
					"matchType": "2",
					"op": "2",
					"selectedQuery": "A"
				}
			}`), // below and all the times
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: -2.1}, // all below -2
					{Timestamp: 2000, Value: -2.2},
					{Timestamp: 3000, Value: -2.5},
				},
			},
			shouldAlert:   true,
			expectedValue: -2.1, // max value when all are below threshold
		},
		{
			name: "anomaly rule with ValueIsBelow and AllTheTimes; should not alert",
			ruleJSON: []byte(`{
				"alert": "AnomalyBelowAllTest",
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 2.0,
					"matchType": "2",
					"op": "2",
					"selectedQuery": "A"
				}
			}`),
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: -3.0},
					{Timestamp: 2000, Value: -1.0}, // above -2, breaks condition
					{Timestamp: 3000, Value: -2.5},
				},
			},
			shouldAlert: false,
		},
		{
			name: "anomaly rule with ValueOutsideBounds; should alert",
			ruleJSON: []byte(`{
				"alert": "AnomalyOutOfBoundsTest",
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 7.0,
					"matchType": "1",
					"op": "7",
					"selectedQuery": "A"
				}
			}`),
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: -8.0}, // abs(−8) >= 7, alert
					{Timestamp: 2000, Value: 5.0},
				},
			},
			shouldAlert:   true,
			expectedValue: -8.0,
		},
		{
			name: "non-anomaly threshold rule with ValueIsBelow; should alert",
			ruleJSON: []byte(`{
				"alert": "ThresholdTest",
				"ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 90.0,
					"matchType": "1",
					"op": "2",
					"selectedQuery": "A"
				}
			}`),
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: 80.0}, // below 90, should alert
					{Timestamp: 2000, Value: 85.0},
				},
			},
			shouldAlert:   true,
			expectedValue: 80.0,
		},
		{
			name: "non-anomaly rule with ValueIsBelow - should not alert",
			ruleJSON: []byte(`{
				"alert": "ThresholdTest",
				"ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 50.0,
					"matchType": "1",
					"op": "2",
					"selectedQuery": "A"
				}
			}`),
			series: v3.Series{
				Labels: map[string]string{"host": "server1"},
				Points: []v3.Point{
					{Timestamp: 1000, Value: 60.0}, // below, should alert
					{Timestamp: 2000, Value: 90.0},
				},
			},
			shouldAlert: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rule := PostableRule{}
			err := json.Unmarshal(tt.ruleJSON, &rule)
			if err != nil {
				t.Fatalf("Failed to unmarshal rule: %v", err)
			}

			ruleThreshold, err := rule.RuleCondition.Thresholds.GetRuleThreshold()
			if err != nil {
				t.Fatalf("unexpected error from GetRuleThreshold: %v", err)
			}

			resultVector, err := ruleThreshold.Eval(tt.series, "", EvalData{})
			if err != nil {
				t.Fatalf("unexpected error from Eval: %v", err)
			}

			shouldAlert := len(resultVector) > 0

			if shouldAlert != tt.shouldAlert {
				t.Errorf("Expected shouldAlert=%v, got %v. %s",
					tt.shouldAlert, shouldAlert, tt.name)
			}

			if tt.shouldAlert && len(resultVector) > 0 {
				sample := resultVector[0]
				if sample.V != tt.expectedValue {
					t.Errorf("Expected alert value=%.2f, got %.2f. %s",
						tt.expectedValue, sample.V, tt.name)
				}
			}
		})
	}
}
