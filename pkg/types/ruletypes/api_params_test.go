package ruletypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

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
				"schemaVersion": "v2alpha1",
				"version": "v5",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test_metric", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
					"selectedQueryName": "A"
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.AlertName.StringValue() != "TestAlert" {
					t.Errorf("Expected alert name 'TestAlert', got '%s'", rule.AlertName)
				}
				if rule.RuleType != RuleTypeThreshold {
					t.Errorf("Expected rule type '%s', got '%s'", RuleTypeThreshold, rule.RuleType)
				}
				if rule.RuleCondition.Thresholds.Kind.IsZero() {
					t.Error("Expected thresholds to be populated")
				}
			},
		},
		{
			name:     "PromQL rule type detection",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "PromQLRule",
				"schemaVersion": "v2alpha1",
				"version": "v5",
				"condition": {
					"compositeQuery": {
						"queryType": "promql",
						"queries": [{
							"type": "promql",
							"spec": {
								"name": "A",
								"query": "rate(http_requests_total[5m])",
								"disabled": false
							}
						}]
					},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
					"selectedQueryName": "A"
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
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
		name                string
		initRule            PostableRule
		content             []byte
		kind                RuleDataKind
		expectError         bool // unmarshal error (read path)
		expectValidateError bool // Validate() error (write path only)
		validate            func(*testing.T, *PostableRule)
	}{
		{
			name:     "schema v2alpha1 - uses explicit thresholds and evaluation",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "V2Alpha1Test",
				"schemaVersion": "v2alpha1",
				"version": "v5",
				"ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test_metric", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"thresholds": {
						"kind": "basic",
						"spec": [{
							"name": "critical",
							"target": 100.0,
							"matchType": "1",
							"op": "1"
						}]
					}
				},
				"evaluation": {
					"kind": "rolling",
					"spec": {
						"evalWindow": "5m",
						"frequency": "1m"
					}
				},
				"notificationSettings": {
					"renotify": {
						"enabled": true,
						"interval": "4h",
						"alertStates": ["firing"]
					}
				}
			}`),
			kind:        RuleDataKindJson,
			expectError: false,
			validate: func(t *testing.T, rule *PostableRule) {
				if rule.SchemaVersion.StringValue() != SchemaVersionV2Alpha1 {
					t.Errorf("Expected schemaVersion %q, got %q", SchemaVersionV2Alpha1, rule.SchemaVersion.StringValue())
				}

				if rule.RuleCondition.Thresholds == nil {
					t.Error("Expected Thresholds to be present for v2alpha1")
				}
				if rule.Evaluation == nil {
					t.Error("Expected Evaluation to be present for v2alpha1")
				}
				if rule.NotificationSettings == nil {
					t.Error("Expected NotificationSettings to be present for v2alpha1")
				}
				if rule.RuleType != RuleTypeThreshold {
					t.Error("Expected RuleType to be auto-detected")
				}
			},
		},
		{
			name:     "schema v2alpha1 - rejects v1-only fields with suggestions",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "MixedFieldsTest",
				"schemaVersion": "v2alpha1",
				"version": "v5",
				"ruleType": "threshold_rule",
				"preferredChannels": ["slack"],
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test_metric", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"target": 100.0,
					"matchType": "1",
					"op": "1"
				}
			}`),
			kind:                RuleDataKindJson,
			expectValidateError: true,
		},
		{
			name:     "schema v2alpha1 - requires evaluation",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "MissingEvalTest",
				"schemaVersion": "v2alpha1",
				"version": "v5",
				"ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test_metric", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"thresholds": {
						"kind": "basic",
						"spec": [{
							"name": "critical",
							"target": 100.0,
							"matchType": "1",
							"op": "1"
						}]
					}
				},
				"notificationSettings": {
					"renotify": {
						"enabled": true,
						"interval": "4h",
						"alertStates": ["firing"]
					}
				}
			}`),
			kind:                RuleDataKindJson,
			expectValidateError: true,
		},
		{
			name:     "schema v2alpha1 - requires notificationSettings",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "MissingNotifTest",
				"schemaVersion": "v2alpha1",
				"version": "v5",
				"ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test_metric", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"thresholds": {
						"kind": "basic",
						"spec": [{
							"name": "critical",
							"target": 100.0,
							"matchType": "1",
							"op": "1"
						}]
					}
				},
				"evaluation": {
					"kind": "rolling",
					"spec": {
						"evalWindow": "5m",
						"frequency": "1m"
					}
				}
			}`),
			kind:                RuleDataKindJson,
			expectValidateError: true,
		},
		{
			name:     "schema v2alpha1 - requires thresholds for non-promql rules",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "MissingThresholdsTest",
				"schemaVersion": "v2alpha1",
				"version": "v5",
				"ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test_metric", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					}
				},
				"evaluation": {
					"kind": "rolling",
					"spec": {
						"evalWindow": "5m",
						"frequency": "1m"
					}
				},
				"notificationSettings": {
					"renotify": {
						"enabled": true,
						"interval": "4h",
						"alertStates": ["firing"]
					}
				}
			}`),
			kind:                RuleDataKindJson,
			expectValidateError: true,
		},
		{
			name:     "unsupported schema version",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "BadSchemaTest",
				"schemaVersion": "v3",
				"version": "v5",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test_metric", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 100.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`),
			kind:                RuleDataKindJson,
			expectValidateError: true,
		},
		{
			name:     "missing schema version - rejected on write",
			initRule: PostableRule{},
			content: []byte(`{
				"alert": "MissingSchemaTest",
				"version": "v5",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"queries": [{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{"metricName": "test_metric", "spaceAggregation": "p50"}],
								"stepInterval": "5m"
							}
						}]
					},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 75.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`),
			kind:                RuleDataKindJson,
			expectValidateError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rule := tt.initRule
			err := json.Unmarshal(tt.content, &rule)
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected unmarshal error but got none")
				}
				return
			}
			if err != nil {
				t.Errorf("Unexpected unmarshal error: %v", err)
				return
			}
			if tt.expectValidateError {
				if err := rule.Validate(); err == nil {
					t.Errorf("Expected Validate() error but got none")
				}
				return
			}
			if tt.validate != nil {
				tt.validate(t, &rule)
			}
		})
	}
}

func TestParseIntoRuleThresholdGeneration(t *testing.T) {
	content := []byte(`{
		"alert": "TestThresholds",
		"version": "v5",
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
				"queries": [{
					"type": "builder_query",
					"spec": {
						"name": "A",
						"signal": "metrics",
						"aggregations": [{"metricName": "response_time", "spaceAggregation": "p50"}],
						"stepInterval": "5m"
					}
				}]
			},
			"selectedQueryName": "A",
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
	vector, err := threshold.Eval(&qbtypes.TimeSeries{
		Values: []*qbtypes.TimeSeriesValue{{Value: 0.15, Timestamp: 1000}}, // 150ms in seconds
		Labels: []*qbtypes.Label{
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name: "test",
				},
				Value: "label",
			},
		},
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
		"schemaVersion": "v2alpha1",
		"alert": "MultiThresholdAlert",
		"ruleType": "threshold_rule",
		"version": "v5",
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
				"unit": "%",
				"queries": [{
					"type": "builder_query",
					"spec": {
						"name": "A",
						"signal": "metrics",
						"aggregations": [{"metricName": "cpu_usage", "spaceAggregation": "p50"}],
						"stepInterval": "5m"
					}
				}]
			},
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
		},
		"evaluation": {
			"kind": "rolling",
			"spec": {
				"evalWindow": "5m",
				"frequency": "1m"
			}
		},
		"notificationSettings": {
			"renotify": {
				"enabled": true,
				"interval": "4h",
				"alertStates": ["firing"]
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
	vector, err := threshold.Eval(&qbtypes.TimeSeries{
		Values: []*qbtypes.TimeSeriesValue{{Value: 95.0, Timestamp: 1000}}, // 95% CPU usage
		Labels: []*qbtypes.Label{
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name: "service",
				},
				Value: "test",
			},
		},
	}, "", EvalData{})
	if err != nil {
		t.Fatalf("Unexpected error in shouldAlert: %v", err)
	}

	assert.Equal(t, 2, len(vector))

	vector, err = threshold.Eval(&qbtypes.TimeSeries{
		Values: []*qbtypes.TimeSeriesValue{{Value: 75.0, Timestamp: 1000}}, // 75% CPU usage
		Labels: []*qbtypes.Label{
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name: "service",
				},
				Value: "test",
			},
		},
	}, "", EvalData{})
	if err != nil {
		t.Fatalf("Unexpected error in shouldAlert: %v", err)
	}

	assert.Equal(t, 1, len(vector))
}
