package ruletypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
)

func errorContains(err error, substr string) bool {
	j := errors.AsJSON(err)
	if strings.Contains(j.Message, substr) {
		return true
	}
	for _, e := range j.Errors {
		if strings.Contains(e.Message, substr) {
			return true
		}
	}
	return false
}

// validV2Alpha1Builder returns a minimal valid v2alpha1 builder rule JSON.
func validV2Alpha1Builder() string {
	return `{
		"alert": "TestAlert",
		"alertType": "METRIC_BASED_ALERT",
		"version": "v5",
		"schemaVersion": "v2alpha1",
		"ruleType": "threshold_rule",
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
				"panelType": "graph",
				"queries": [{
					"type": "builder_query",
					"spec": {
						"name": "A",
						"signal": "metrics",
						"aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}],
						"stepInterval": "5m"
					}
				}]
			},
			"thresholds": {
				"kind": "basic",
				"spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]
			}
		},
		"evaluation": {
			"kind": "rolling",
			"spec": {"evalWindow": "5m", "frequency": "1m"}
		},
		"notificationSettings": {
			"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}
		}
	}`
}

// validV2Alpha1Promql returns a minimal valid v2alpha1 promql rule JSON.
func validV2Alpha1Promql() string {
	return `{
		"alert": "PromQLAlert",
		"alertType": "METRIC_BASED_ALERT",
		"version": "v5",
		"schemaVersion": "v2alpha1",
		"ruleType": "promql_rule",
		"condition": {
			"compositeQuery": {
				"queryType": "promql",
				"panelType": "graph",
				"queries": [{
					"type": "promql",
					"spec": {"name": "A", "query": "up == 0", "disabled": false}
				}]
			},
			"thresholds": {
				"kind": "basic",
				"spec": [{"name": "critical", "target": 1.0, "matchType": "1", "op": "1"}]
			}
		},
		"evaluation": {
			"kind": "rolling",
			"spec": {"evalWindow": "5m", "frequency": "1m"}
		},
		"notificationSettings": {
			"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}
		}
	}`
}

// patchJSON takes base JSON and overlays fields from patch JSON.
func patchJSON(base, patch string) string {
	var baseMap, patchMap map[string]json.RawMessage
	_ = json.Unmarshal([]byte(base), &baseMap)
	_ = json.Unmarshal([]byte(patch), &patchMap)
	for k, v := range patchMap {
		baseMap[k] = v
	}
	out, _ := json.Marshal(baseMap)
	return string(out)
}

// removeField removes a top-level field from JSON.
func removeField(j, field string) string {
	var m map[string]json.RawMessage
	_ = json.Unmarshal([]byte(j), &m)
	delete(m, field)
	out, _ := json.Marshal(m)
	return string(out)
}

// unmarshalAndValidate unmarshals JSON into PostableRule, then calls Validate().
// Returns the unmarshal error and the Validate error separately.
func unmarshalAndValidate(j string) (unmarshalErr, validateErr error) {
	var rule PostableRule
	unmarshalErr = json.Unmarshal([]byte(j), &rule)
	if unmarshalErr != nil {
		return unmarshalErr, nil
	}
	validateErr = rule.Validate()
	return nil, validateErr
}

func TestValidate_PostableRule_Common(t *testing.T) {
	tests := []struct {
		name      string
		json      string
		wantErr   bool
		errSubstr string // substring expected in error message
	}{
		// simple test
		{
			name: "valid v2alpha1 builder rule",
			json: validV2Alpha1Builder(),
		},
		{
			name: "valid v2alpha1 promql rule",
			json: validV2Alpha1Promql(),
		},

		// alert name
		{
			name:      "missing alert name",
			json:      removeField(validV2Alpha1Builder(), "alert"),
			wantErr:   true,
			errSubstr: "alert",
		},
		{
			name:      "empty alert name",
			json:      patchJSON(validV2Alpha1Builder(), `{"alert": ""}`),
			wantErr:   true,
			errSubstr: "alert",
		},

		// version is deprecated: missing/empty defaults to "v5", anything else is kept as sent
		{
			name: "missing version defaults to v5",
			json: removeField(validV2Alpha1Builder(), "version"),
		},
		{
			name: "any version is accepted",
			json: patchJSON(validV2Alpha1Builder(), `{"version": "v4"}`),
		},
		{
			name: "empty version defaults to v5",
			json: patchJSON(validV2Alpha1Builder(), `{"version": ""}`),
		},

		// alert type, capital case to avoid breaking changes
		// no types.valuer for now
		{
			name: "valid alertType METRIC_BASED_ALERT",
			json: patchJSON(validV2Alpha1Builder(), `{"alertType": "METRIC_BASED_ALERT"}`),
		},
		{
			name: "valid alertType LOGS_BASED_ALERT",
			json: patchJSON(validV2Alpha1Builder(), `{"alertType": "LOGS_BASED_ALERT"}`),
		},
		{
			name: "valid alertType TRACES_BASED_ALERT",
			json: patchJSON(validV2Alpha1Builder(), `{"alertType": "TRACES_BASED_ALERT"}`),
		},
		{
			name: "valid alertType EXCEPTIONS_BASED_ALERT",
			json: patchJSON(validV2Alpha1Builder(), `{"alertType": "EXCEPTIONS_BASED_ALERT"}`),
		},
		{
			name: "valid alertType AI_TRACES_BASED_ALERT",
			json: patchJSON(validV2Alpha1Builder(), `{"alertType": "AI_TRACES_BASED_ALERT"}`),
		},
		{
			name:      "missing alertType",
			json:      removeField(validV2Alpha1Builder(), "alertType"),
			wantErr:   true,
			errSubstr: "alertType: field is required",
		},
		{
			name:      "invalid alertType",
			json:      patchJSON(validV2Alpha1Builder(), `{"alertType": "CUSTOM_ALERT"}`),
			wantErr:   true,
			errSubstr: "alertType",
		},
		{
			name:      "lowercase alertType",
			json:      patchJSON(validV2Alpha1Builder(), `{"alertType": "metric_based_alert"}`),
			wantErr:   true,
			errSubstr: "alertType",
		},

		//  rule_type, the matrix is bit confusing for now
		{
			name: "valid ruleType threshold_rule",
			json: patchJSON(validV2Alpha1Builder(), `{"ruleType": "threshold_rule"}`),
		},
		{
			name: "valid ruleType promql_rule",
			json: patchJSON(validV2Alpha1Promql(), `{"ruleType": "promql_rule"}`),
		},
		{
			name:      "invalid ruleType",
			json:      patchJSON(validV2Alpha1Builder(), `{"ruleType": "custom_rule"}`),
			wantErr:   true,
			errSubstr: "ruleType",
		},

		// rule condition should never be missing
		{
			name:      "missing condition entirely",
			json:      `{"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1"}`,
			wantErr:   true,
			errSubstr: "condition",
		},
		{
			name:      "null condition",
			json:      `{"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "condition": null}`,
			wantErr:   true,
			errSubstr: "condition",
		},

		// query should never be missing
		{
			name: "missing compositeQuery",
			json: patchJSON(validV2Alpha1Builder(), `{
				"condition": {
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]}
				}
			}`),
			wantErr:   true,
			errSubstr: "compositeQuery",
		},
		{
			name: "empty queries array",
			json: patchJSON(validV2Alpha1Builder(), `{
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": []},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]}
				}
			}`),
			wantErr:   true,
			errSubstr: "queries",
		},

		// selected query should be one of the query from queries
		{
			name: "selectedQueryName matches query",
			json: patchJSON(validV2Alpha1Builder(), `{
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"panelType": "graph",
						"queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]
					},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
					"selectedQueryName": "A"
				}
			}`),
		},
		{
			name: "selectedQueryName does not match any query",
			json: patchJSON(validV2Alpha1Builder(), `{
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"panelType": "graph",
						"queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]
					},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
					"selectedQueryName": "Z"
				}
			}`),
			wantErr:   true,
			errSubstr: "selectedQueryName",
		},
		{
			name: "empty selectedQueryName is ok (optional)",
			json: validV2Alpha1Builder(),
		},

		// min points enforcement
		{
			name: "requireMinPoints false with zero points is ok",
			json: patchJSON(validV2Alpha1Builder(), `{
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
					"requireMinPoints": false, "requiredNumPoints": 0
				}
			}`),
		},
		{
			name: "requireMinPoints true with positive points is ok",
			json: patchJSON(validV2Alpha1Builder(), `{
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
					"requireMinPoints": true, "requiredNumPoints": 5
				}
			}`),
		},
		{
			name: "requireMinPoints true with zero points",
			json: patchJSON(validV2Alpha1Builder(), `{
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
					"requireMinPoints": true, "requiredNumPoints": 0
				}
			}`),
			wantErr:   true,
			errSubstr: "requiredNumPoints",
		},
		{
			name: "requireMinPoints true with negative points",
			json: patchJSON(validV2Alpha1Builder(), `{
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
					"requireMinPoints": true, "requiredNumPoints": -1
				}
			}`),
			wantErr:   true,
			errSubstr: "requiredNumPoints",
		},

		// labels & annotations
		{
			name:      "invalid label name starting with number",
			json:      patchJSON(validV2Alpha1Builder(), `{"labels": {"1bad": "value"}}`),
			wantErr:   true,
			errSubstr: "label name",
		},
		{
			name:      "invalid label name with special chars",
			json:      patchJSON(validV2Alpha1Builder(), `{"labels": {"bad-name": "value"}}`),
			wantErr:   true,
			errSubstr: "label name",
		},
		{
			name: "valid label name with dots and underscores",
			json: patchJSON(validV2Alpha1Builder(), `{"labels": {"valid.name_1": "value"}}`),
		},
		{
			name:      "invalid annotation name",
			json:      patchJSON(validV2Alpha1Builder(), `{"annotations": {"bad-anno": "value"}}`),
			wantErr:   true,
			errSubstr: "annotation name",
		},

		// templating
		{
			name:      "invalid template in label value",
			json:      patchJSON(validV2Alpha1Builder(), `{"labels": {"severity": "{{.Invalid"}}`),
			wantErr:   true,
			errSubstr: "template",
		},
		{
			name:      "invalid template in annotation value",
			json:      patchJSON(validV2Alpha1Builder(), `{"annotations": {"description": "{{.Broken"}}`),
			wantErr:   true,
			errSubstr: "template",
		},
		{
			name: "valid template in label",
			json: patchJSON(validV2Alpha1Builder(), `{"labels": {"severity": "{{$labels.host}}"}}`),
		},

		// anomaly seasonality
		{
			name: "valid seasonality hourly for anomaly rule",
			json: patchJSON(validV2Alpha1Builder(), `{
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 2.0, "matchType": "1", "op": "1"}]},
					"seasonality": "hourly"
				}
			}`),
		},
		{
			name: "valid seasonality daily for anomaly rule",
			json: patchJSON(validV2Alpha1Builder(), `{
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 2.0, "matchType": "1", "op": "1"}]},
					"seasonality": "daily"
				}
			}`),
		},
		{
			name: "valid seasonality weekly for anomaly rule",
			json: patchJSON(validV2Alpha1Builder(), `{
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 2.0, "matchType": "1", "op": "1"}]},
					"seasonality": "weekly"
				}
			}`),
		},
		{
			name: "empty seasonality for anomaly rule is ok (defaults to daily)",
			json: patchJSON(validV2Alpha1Builder(), `{"ruleType": "anomaly_rule"}`),
		},
		{
			name: "invalid seasonality for anomaly rule",
			json: patchJSON(validV2Alpha1Builder(), `{
				"ruleType": "anomaly_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 2.0, "matchType": "1", "op": "1"}]},
					"seasonality": "monthly"
				}
			}`),
			wantErr:   true,
			errSubstr: "seasonality",
		},
		{
			name: "seasonality on non-anomaly rule is ignored",
			json: patchJSON(validV2Alpha1Builder(), `{
				"ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 2.0, "matchType": "1", "op": "1"}]},
					"seasonality": "monthly"
				}
			}`),
		},

		// schema version: only v2alpha1 is accepted on write
		{
			name:      "schemaVersion v1 is rejected",
			json:      patchJSON(validV2Alpha1Builder(), `{"schemaVersion": "v1"}`),
			wantErr:   true,
			errSubstr: "schemaVersion",
		},
		{
			name:      "missing schemaVersion is rejected",
			json:      removeField(validV2Alpha1Builder(), "schemaVersion"),
			wantErr:   true,
			errSubstr: "schemaVersion",
		},
		{
			name:      "unsupported schemaVersion v2",
			json:      patchJSON(validV2Alpha1Builder(), `{"schemaVersion": "v2"}`),
			wantErr:   true,
			errSubstr: "schemaVersion",
		},
		{
			name:      "unsupported schemaVersion v3",
			json:      patchJSON(validV2Alpha1Builder(), `{"schemaVersion": "v3"}`),
			wantErr:   true,
			errSubstr: "schemaVersion",
		},
		{
			name:      "unsupported schemaVersion random string",
			json:      patchJSON(validV2Alpha1Builder(), `{"schemaVersion": "foobar"}`),
			wantErr:   true,
			errSubstr: "schemaVersion",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			unmarshalErr, validateErr := unmarshalAndValidate(tt.json)
			err := unmarshalErr
			if err == nil {
				err = validateErr
			}

			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error containing %q, got nil", tt.errSubstr)
				} else if tt.errSubstr != "" && !errorContains(err, tt.errSubstr) {
					t.Errorf("expected error containing %q, got: %v", tt.errSubstr, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestValidate_V2Alpha1_ThresholdFields(t *testing.T) {
	// threshold returns the v2alpha1 builder rule with the given single threshold spec.
	threshold := func(spec string) string {
		return patchJSON(validV2Alpha1Builder(), `{
			"condition": {
				"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
				"thresholds": {"kind": "basic", "spec": [`+spec+`]}
			}
		}`)
	}

	tests := []struct {
		name      string
		json      string
		wantErr   bool
		errSubstr string
	}{
		// a target must always be present
		{
			name: "valid target",
			json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}`),
		},
		{
			name:      "missing target",
			json:      threshold(`{"name": "critical", "matchType": "1", "op": "1"}`),
			wantErr:   true,
			errSubstr: "target",
		},

		// comparison operation can't be empty or invalid
		{
			name:      "missing op",
			json:      threshold(`{"name": "critical", "target": 10.0, "matchType": "1"}`),
			wantErr:   true,
			errSubstr: "condition.op",
		},
		{
			name:      "invalid op value",
			json:      threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "invalid"}`),
			wantErr:   true,
			errSubstr: "condition.op",
		},
		// numeric operators
		{name: "op numeric 1 (above)", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}`)},
		{name: "op numeric 2 (below)", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "2"}`)},
		{name: "op numeric 3 (equal)", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "3"}`)},
		{name: "op numeric 4 (not_equal)", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "4"}`)},
		{name: "op numeric 5 (above_or_equal)", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "5"}`)},
		{name: "op numeric 6 (below_or_equal)", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "6"}`)},
		{name: "op numeric 7 (outside_bounds)", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "7"}`)},
		// literal operators
		{name: "op literal above", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "above"}`)},
		{name: "op literal below", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "below"}`)},
		{name: "op literal above_or_equal", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "above_or_equal"}`)},
		{name: "op literal below_or_equal", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "below_or_equal"}`)},
		{name: "op literal outside_bounds", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "outside_bounds"}`)},
		// symbol operators
		{name: "op symbol >", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": ">"}`)},
		{name: "op symbol >=", json: threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": ">="}`)},
		{
			name:      "op numeric 8 invalid",
			json:      threshold(`{"name": "critical", "target": 10.0, "matchType": "1", "op": "8"}`),
			wantErr:   true,
			errSubstr: "condition.op",
		},

		// match type can't be empty or invalid
		{
			name:      "missing matchType",
			json:      threshold(`{"name": "critical", "target": 10.0, "op": "1"}`),
			wantErr:   true,
			errSubstr: "condition.matchType",
		},
		{
			name:      "invalid matchType",
			json:      threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "invalid"}`),
			wantErr:   true,
			errSubstr: "condition.matchType",
		},
		// literal matchTypes
		{name: "matchType literal at_least_once", json: threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "at_least_once"}`)},
		{name: "matchType literal all_the_times", json: threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "all_the_times"}`)},
		{name: "matchType literal on_average", json: threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "on_average"}`)},
		{name: "matchType short avg", json: threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "avg"}`)},
		{name: "matchType literal in_total", json: threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "in_total"}`)},
		{name: "matchType short sum", json: threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "sum"}`)},
		{name: "matchType literal last", json: threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "last"}`)},
		{
			name:      "matchType numeric 6 invalid",
			json:      threshold(`{"name": "critical", "target": 10.0, "op": "1", "matchType": "6"}`),
			wantErr:   true,
			errSubstr: "condition.matchType",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			unmarshalErr, validateErr := unmarshalAndValidate(tt.json)
			err := unmarshalErr
			if err == nil {
				err = validateErr
			}

			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error containing %q, got nil", tt.errSubstr)
				} else if tt.errSubstr != "" && !errorContains(err, tt.errSubstr) {
					t.Errorf("expected error containing %q, got: %v", tt.errSubstr, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestValidate_V2Alpha1(t *testing.T) {
	tests := []struct {
		name      string
		json      string
		wantErr   bool
		errSubstr string
	}{
		// simple v2alpha1
		{
			name: "valid v2alpha1 rule",
			json: validV2Alpha1Builder(),
		},

		// missing required fields
		{
			name: "missing thresholds",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "condition.thresholds",
		},
		{
			name: "missing evaluation",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "evaluation",
		},
		{
			name: "missing notificationSettings",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}}
			}`,
			wantErr:   true,
			errSubstr: "notificationSettings",
		},

		// TODO(srikanthccv): should we throw here?
		// {
		// 	name: "v2alpha1 with condition.target",
		// 	json: `{
		// 		"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
		// 		"condition": {
		// 			"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
		// 			"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]},
		// 			"target": 10.0
		// 		},
		// 		"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
		// 		"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
		// 	}`,
		// 	wantErr:   true,
		// 	errSubstr: "condition.target",
		// },
		// {
		// 	name: "v2alpha1 with condition.op",
		// 	json: `{
		// 		"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
		// 		"condition": {
		// 			"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
		// 			"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]},
		// 			"op": "1"
		// 		},
		// 		"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
		// 		"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
		// 	}`,
		// 	wantErr:   true,
		// 	errSubstr: "condition.op",
		// },
		// {
		// 	name: "v2alpha1 with condition.matchType",
		// 	json: `{
		// 		"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
		// 		"condition": {
		// 			"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
		// 			"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]},
		// 			"matchType": "1"
		// 		},
		// 		"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
		// 		"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
		// 	}`,
		// 	wantErr:   true,
		// 	errSubstr: "condition.matchType",
		// },
		// {
		// 	name:      "v2alpha1 with preferredChannels",
		// 	json:      patchJSON(validV2Alpha1Builder(), `{"preferredChannels": ["slack"]}`),
		// 	wantErr:   true,
		// 	errSubstr: "preferredChannels",
		// },
		// {
		// 	name: "v2alpha1 with ALL v1 fields : multiple errors",
		// 	json: `{
		// 		"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
		// 		"preferredChannels": ["slack"],
		// 		"condition": {
		// 			"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
		// 			"target": 10.0, "op": "1", "matchType": "1"
		// 		}
		// 	}`,
		// 	wantErr:   true,
		// 	errSubstr: "condition.target",
		// },

		{
			name: "v2alpha1 promql rule without thresholds is not ok",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "promql_rule",
				"condition": {
					"compositeQuery": {"queryType": "promql", "panelType": "graph", "queries": [{"type": "promql", "spec": {"name": "A", "query": "up == 0", "disabled": false}}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr: true,
		},

		// ensure notificationSettings is non empty for v2alpha1
		{
			name: "renotify enabled with zero interval",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "0s", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "renotify",
		},
		{
			name: "renotify disabled with zero interval is ok",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": false}}
			}`,
		},
		{
			name: "invalid renotify alert state",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["invalid_state"]}}
			}`,
			wantErr:   true,
			errSubstr: "alert state",
		},

		// threshold validation (happens on deser)
		{
			name: "threshold with empty name",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "threshold name",
		},
		{
			name: "threshold with null target",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "target",
		},
		{
			name: "threshold with invalid op",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "bad"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "condition.op",
		},
		{
			name: "threshold with invalid matchType",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName":"cpu","spaceAggregation":"p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "bad", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "condition.matchType",
		},
		{
			name: "threshold with literal op above is valid",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName":"cpu","spaceAggregation":"p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "at_least_once", "op": "above"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
		},
		{
			name: "unknown threshold kind",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName":"cpu","spaceAggregation":"p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "advanced", "spec": []}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "threshold",
		},

		// evaluation spec validation (happens on json unmarshal)
		{
			name: "rolling eval with zero window",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName":"cpu","spaceAggregation":"p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "0s", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "evalWindow",
		},
		{
			name: "rolling eval with zero frequency",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName":"cpu","spaceAggregation":"p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "0s"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "frequency",
		},
		{
			name: "unknown evaluation kind",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
				"condition": {
					"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName":"cpu","spaceAggregation":"p50"}], "stepInterval": "5m"}}]},
					"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
				},
				"evaluation": {"kind": "custom", "spec": {}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "evaluation",
		},

		// query-level validation
		{
			name: "promql query with empty query string",
			json: `{
				"alert": "Test", "alertType": "METRIC_BASED_ALERT", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "promql_rule",
				"condition": {
					"compositeQuery": {"queryType": "promql", "panelType": "graph", "queries": [{"type": "promql", "spec": {"name": "A", "query": "", "disabled": false}}]}
				},
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
				"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
			}`,
			wantErr:   true,
			errSubstr: "query",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			unmarshalErr, validateErr := unmarshalAndValidate(tt.json)
			err := unmarshalErr
			if err == nil {
				err = validateErr
			}

			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error containing %q, got nil", tt.errSubstr)
				} else if tt.errSubstr != "" && !errorContains(err, tt.errSubstr) {
					t.Errorf("expected error containing %q, got: %v", tt.errSubstr, err)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

// ensure that truly malformed input doesn't panic.
func TestValidate_GarbagePayloads(t *testing.T) {
	payloads := []struct {
		name string
		json string
	}{
		{"empty object", `{}`},
		{"empty string", `""`},
		{"null", `null`},
		{"number", `42`},
		{"array", `[]`},
		{"just alert name", `{"alert": "x"}`},
		{"condition is a string", `{"alert": "x", "version": "v5", "condition": "not_an_object"}`},
		{"condition is a number", `{"alert": "x", "version": "v5", "condition": 42}`},
		{"condition is an array", `{"alert": "x", "version": "v5", "condition": []}`},
		{"queries is a string", `{"alert": "x", "version": "v5", "condition": {"compositeQuery": {"queries": "bad"}}}`},
		{"queries is a number", `{"alert": "x", "version": "v5", "condition": {"compositeQuery": {"queries": 42}}}`},
		{"thresholds is a string", `{"alert": "x", "version": "v5", "schemaVersion": "v2alpha1", "condition": {"compositeQuery": {"queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]}, "thresholds": "bad"}}`},
		{"evaluation is a string", `{"alert": "x", "version": "v5", "schemaVersion": "v2alpha1", "condition": {"compositeQuery": {"queries": []}}, "evaluation": "bad"}`},
		{"notificationSettings is a number", `{"alert": "x", "version": "v5", "schemaVersion": "v2alpha1", "condition": {"compositeQuery": {"queries": []}}, "notificationSettings": 42}`},
		{"deeply nested garbage", `{"alert": "x", "version": "v5", "condition": {"compositeQuery": {"queryType": "builder", "queries": [{"type": "unknown_type", "spec": {}}]}}}`},
		{"version is a number", `{"alert": "x", "version": 5, "condition": {}}`},
		{"labels is an array", `{"alert": "x", "version": "v5", "labels": [], "condition": {}}`},
		{"op is a number", `{"alert": "x", "version": "v5", "condition": {"compositeQuery": {"queries": []}, "op": 1}}`},
	}

	for _, tt := range payloads {
		t.Run(tt.name, func(t *testing.T) {
			// Must not panic, errors are expected
			var rule PostableRule
			err := json.Unmarshal([]byte(tt.json), &rule)
			if err == nil {
				// If unmarshal succeeded, Validate should also not panic
				_ = rule.Validate()
			}
		})
	}
}

// TestValidate_ReadPathVsWritePath verifies that UnmarshalJSON (read path)
// is lenient while Validate() (write path) is strict.
func TestValidate_ReadPathVsWritePath(t *testing.T) {
	tests := []struct {
		name              string
		json              string
		unmarshalOK       bool // should UnmarshalJSON succeed?
		validateShouldErr bool // should Validate() fail?
	}{
		{
			name:              "missing alert name : unmarshal ok, Validate fails",
			json:              removeField(validV2Alpha1Builder(), "alert"),
			unmarshalOK:       true,
			validateShouldErr: true,
		},
		{
			name:              "invalid alertType : unmarshal ok, Validate fails",
			json:              patchJSON(validV2Alpha1Builder(), `{"alertType": "GARBAGE"}`),
			unmarshalOK:       true,
			validateShouldErr: true,
		},
		{
			name:              "unsupported schemaVersion : unmarshal ok, Validate fails",
			json:              patchJSON(validV2Alpha1Builder(), `{"schemaVersion": "v99"}`),
			unmarshalOK:       true,
			validateShouldErr: true,
		},
		{
			name:              "valid rule : both ok",
			json:              validV2Alpha1Builder(),
			unmarshalOK:       true,
			validateShouldErr: false,
		},
		{
			name:              "missing condition : unmarshal fails (pre-existing check)",
			json:              removeField(validV2Alpha1Builder(), "condition"),
			unmarshalOK:       false,
			validateShouldErr: false, // not reached
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var rule PostableRule
			unmarshalErr := json.Unmarshal([]byte(tt.json), &rule)

			if tt.unmarshalOK && unmarshalErr != nil {
				t.Fatalf("expected unmarshal to succeed, got: %v", unmarshalErr)
			}
			if !tt.unmarshalOK && unmarshalErr == nil {
				t.Fatalf("expected unmarshal to fail, but it succeeded")
			}
			if unmarshalErr != nil {
				return
			}

			validateErr := rule.Validate()
			if tt.validateShouldErr && validateErr == nil {
				t.Errorf("expected Validate() to fail, but it succeeded")
			}
			if !tt.validateShouldErr && validateErr != nil {
				t.Errorf("expected Validate() to succeed, got: %v", validateErr)
			}
		})
	}
}

// TestValidate_ProcessRuleDefaults verifies that processRuleDefaults applies
// correct defaults during UnmarshalJSON.
func TestValidate_ProcessRuleDefaults(t *testing.T) {
	t.Run("auto-detects ruleType from builder queryType", func(t *testing.T) {
		var rule PostableRule
		_ = json.Unmarshal([]byte(removeField(validV2Alpha1Builder(), "ruleType")), &rule)
		if rule.RuleType != RuleTypeThreshold {
			t.Errorf("expected threshold_rule, got %v", rule.RuleType)
		}
	})

	t.Run("auto-detects ruleType from promql queryType", func(t *testing.T) {
		var rule PostableRule
		_ = json.Unmarshal([]byte(removeField(validV2Alpha1Promql(), "ruleType")), &rule)
		if rule.RuleType != RuleTypeProm {
			t.Errorf("expected promql_rule, got %v", rule.RuleType)
		}
	})
}

// TestValidate_MarshalRoundTrip verifies marshal to unmarshal produces equivalent rules.
func TestValidate_MarshalRoundTrip(t *testing.T) {
	t.Run("v2alpha1 round-trip preserves all fields", func(t *testing.T) {
		var original PostableRule
		_ = json.Unmarshal([]byte(validV2Alpha1Builder()), &original)

		marshaled, err := json.Marshal(&original)
		if err != nil {
			t.Fatalf("marshal error: %v", err)
		}

		var raw map[string]json.RawMessage
		_ = json.Unmarshal(marshaled, &raw)
		if _, ok := raw["schemaVersion"]; !ok {
			t.Error("expected schemaVersion to be preserved in v2alpha1 marshal output")
		}
		if _, ok := raw["evaluation"]; !ok {
			t.Error("expected evaluation to be preserved in v2alpha1 marshal output")
		}
		if _, ok := raw["notificationSettings"]; !ok {
			t.Error("expected notificationSettings to be preserved in v2alpha1 marshal output")
		}

		var roundTripped PostableRule
		if err := json.Unmarshal(marshaled, &roundTripped); err != nil {
			t.Fatalf("unmarshal error: %v", err)
		}
		if roundTripped.SchemaVersion.StringValue() != SchemaVersionV2Alpha1 {
			t.Errorf("expected schemaVersion %q, got %q", SchemaVersionV2Alpha1, roundTripped.SchemaVersion.StringValue())
		}
	})
}

// TestValidate_MultipleErrors verifies that all errors are collected, not just the first.
func TestValidate_MultipleErrors(t *testing.T) {
	t.Run("v2alpha1 multiple suggestion errors returned together", func(t *testing.T) {
		j := `{
			"alert": "Test", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule",
			"condition": {
				"compositeQuery": {"queryType": "builder", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]}
			}
		}`
		_, validateErr := unmarshalAndValidate(j)
		if validateErr == nil {
			t.Fatal("expected Validate() error")
		}
		// Should contain errors for thresholds, evaluation, notificationSettings
		for _, substr := range []string{"evaluation", "notificationSettings"} {
			if !errorContains(validateErr, substr) {
				t.Errorf("expected error to mention %q, got: %v", substr, validateErr)
			}
		}
	})
}

// TestValidate_AllSymbolAndShortOperators tests symbol and short operator variants.
func TestValidate_AllSymbolAndShortOperators(t *testing.T) {
	mkRule := func(op string) string {
		return patchJSON(validV2Alpha1Builder(), `{"condition":{"compositeQuery":{"queryType":"builder","panelType":"graph","queries":[{"type":"builder_query","spec":{"name":"A","signal":"metrics","aggregations":[{"metricName":"cpu","spaceAggregation":"p50"}],"stepInterval":"5m"}}]},"thresholds":{"kind":"basic","spec":[{"name":"critical","target":10.0,"matchType":"1","op":"`+op+`"}]}}}`)
	}

	validOps := []string{
		// symbols
		">", "<", "=", "!=", ">=", "<=",
		// short literals
		"eq", "not_eq", "above_or_eq", "below_or_eq",
	}
	for _, op := range validOps {
		t.Run("op "+op, func(t *testing.T) {
			_, validateErr := unmarshalAndValidate(mkRule(op))
			if validateErr != nil {
				t.Errorf("expected op %q to be valid, got: %v", op, validateErr)
			}
		})
	}

	invalidOps := []string{">>", "<>", "===", "~", "contains", "0", "8", "99"}
	for _, op := range invalidOps {
		t.Run("invalid op "+op, func(t *testing.T) {
			_, validateErr := unmarshalAndValidate(mkRule(op))
			if validateErr == nil {
				t.Errorf("expected op %q to be invalid", op)
			}
		})
	}
}

// TestValidate_V2Alpha1_CumulativeEvaluation tests cumulative evaluation schedules.
func TestValidate_V2Alpha1_CumulativeEvaluation(t *testing.T) {
	mkRule := func(evalJSON string) string {
		return `{
			"alert": "Test", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule", "alertType": "METRIC_BASED_ALERT",
			"condition": {
				"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
				"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
			},
			"evaluation": ` + evalJSON + `,
			"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
		}`
	}

	tests := []struct {
		name      string
		evalJSON  string
		wantErr   bool
		errSubstr string
	}{
		{
			name:     "valid cumulative hourly",
			evalJSON: `{"kind": "cumulative", "spec": {"schedule": {"type": "hourly", "minute": 0}, "frequency": "5m", "timezone": "UTC"}}`,
		},
		{
			name:     "valid cumulative daily",
			evalJSON: `{"kind": "cumulative", "spec": {"schedule": {"type": "daily", "hour": 9, "minute": 30}, "frequency": "5m", "timezone": "America/New_York"}}`,
		},
		{
			name:     "valid cumulative weekly",
			evalJSON: `{"kind": "cumulative", "spec": {"schedule": {"type": "weekly", "weekday": 1, "hour": 14, "minute": 0}, "frequency": "5m", "timezone": "UTC"}}`,
		},
		{
			name:     "valid cumulative monthly",
			evalJSON: `{"kind": "cumulative", "spec": {"schedule": {"type": "monthly", "day": 1, "hour": 0, "minute": 0}, "frequency": "5m", "timezone": "UTC"}}`,
		},
		{
			name:      "cumulative missing minute for hourly",
			evalJSON:  `{"kind": "cumulative", "spec": {"schedule": {"type": "hourly"}, "frequency": "5m", "timezone": "UTC"}}`,
			wantErr:   true,
			errSubstr: "minute",
		},
		{
			name:      "cumulative invalid timezone",
			evalJSON:  `{"kind": "cumulative", "spec": {"schedule": {"type": "hourly", "minute": 0}, "frequency": "5m", "timezone": "Mars/Olympus"}}`,
			wantErr:   true,
			errSubstr: "timezone",
		},
		{
			name:      "cumulative zero frequency",
			evalJSON:  `{"kind": "cumulative", "spec": {"schedule": {"type": "hourly", "minute": 0}, "frequency": "0s", "timezone": "UTC"}}`,
			wantErr:   true,
			errSubstr: "frequency",
		},
		{
			name:      "cumulative daily missing hour",
			evalJSON:  `{"kind": "cumulative", "spec": {"schedule": {"type": "daily", "minute": 30}, "frequency": "5m", "timezone": "UTC"}}`,
			wantErr:   true,
			errSubstr: "hour",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			unmarshalErr, validateErr := unmarshalAndValidate(mkRule(tt.evalJSON))
			err := unmarshalErr
			if err == nil {
				err = validateErr
			}
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error containing %q, got nil", tt.errSubstr)
				} else if !errorContains(err, tt.errSubstr) {
					t.Errorf("expected error containing %q, got: %v", tt.errSubstr, err)
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

// TestValidate_V2Alpha1_MultipleThresholds tests multi-threshold and literal ops in thresholds.
func TestValidate_V2Alpha1_MultipleThresholds(t *testing.T) {
	t.Run("warning and critical thresholds", func(t *testing.T) {
		j := `{
			"alert": "Test", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule", "alertType": "METRIC_BASED_ALERT",
			"condition": {
				"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
				"thresholds": {"kind": "basic", "spec": [
					{"name": "warning", "target": 70.0, "matchType": "1", "op": "1"},
					{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}
				]}
			},
			"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
			"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
		}`
		_, err := unmarshalAndValidate(j)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("thresholds with literal ops and matchTypes", func(t *testing.T) {
		j := `{
			"alert": "Test", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule", "alertType": "METRIC_BASED_ALERT",
			"condition": {
				"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
				"thresholds": {"kind": "basic", "spec": [
					{"name": "warning", "target": 70.0, "matchType": "on_average", "op": "above_or_equal"},
					{"name": "critical", "target": 90.0, "matchType": "last", "op": "above"}
				]}
			},
			"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
			"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing"]}}
		}`
		_, err := unmarshalAndValidate(j)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

// TestValidate_V2Alpha1_NotificationStates tests various renotify alert state combinations.
func TestValidate_V2Alpha1_NotificationStates(t *testing.T) {
	mkRule := func(states string) string {
		return `{
			"alert": "Test", "version": "v5", "schemaVersion": "v2alpha1", "ruleType": "threshold_rule", "alertType": "METRIC_BASED_ALERT",
			"condition": {
				"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
				"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1"}]}
			},
			"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
			"notificationSettings": {"renotify": {"enabled": true, "interval": "4h", "alertStates": ` + states + `}}
		}`
	}

	tests := []struct {
		name    string
		states  string
		wantErr bool
	}{
		{"firing only", `["firing"]`, false},
		{"nodata only", `["nodata"]`, false},
		{"both firing and nodata", `["firing", "nodata"]`, false},
		{"empty states", `[]`, false},
		{"invalid state", `["pending"]`, true},
		{"mix valid and invalid", `["firing", "inactive"]`, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			unmarshalErr, validateErr := unmarshalAndValidate(mkRule(tt.states))
			err := unmarshalErr
			if err == nil {
				err = validateErr
			}
			if tt.wantErr && err == nil {
				t.Error("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

// TestValidate_QueryTypes tests various query types in the composite query.
func TestValidate_QueryTypes(t *testing.T) {
	mkRule := func(queryType, queryJSON string) string {
		return patchJSON(validV2Alpha1Builder(), `{
			"condition": {
				"compositeQuery": {"queryType": "`+queryType+`", "panelType": "graph", "queries": [`+queryJSON+`]},
				"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]}
			}
		}`)
	}

	t.Run("logs signal query", func(t *testing.T) {
		j := mkRule("builder", `{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "stepInterval": "5m", "aggregations": [{"spaceAggregation": "count"}], "filter": {"expression": "severity_text = 'ERROR'"}}}`)
		_, err := unmarshalAndValidate(j)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("traces signal query", func(t *testing.T) {
		j := mkRule("builder", `{"type": "builder_query", "spec": {"name": "A", "signal": "traces", "stepInterval": "5m", "aggregations": [{"spaceAggregation": "count"}]}}`)
		_, err := unmarshalAndValidate(j)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("clickhouse_sql query", func(t *testing.T) {
		j := mkRule("clickhouse_sql", `{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT count() FROM logs", "disabled": false}}`)
		_, err := unmarshalAndValidate(j)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("clickhouse_sql with empty query string", func(t *testing.T) {
		j := mkRule("clickhouse_sql", `{"type": "clickhouse_sql", "spec": {"name": "A", "query": "", "disabled": false}}`)
		_, err := unmarshalAndValidate(j)
		if err == nil {
			t.Error("expected error for empty clickhouse_sql query")
		}
	})

	t.Run("formula query", func(t *testing.T) {
		j := mkRule("builder", `
			{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}},
			{"type": "builder_formula", "spec": {"name": "F1", "expression": "A * 100", "disabled": false}}
		`)
		_, err := unmarshalAndValidate(j)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("formula with empty expression", func(t *testing.T) {
		j := mkRule("builder", `
			{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}},
			{"type": "builder_formula", "spec": {"name": "F1", "expression": "", "disabled": false}}
		`)
		_, err := unmarshalAndValidate(j)
		if err == nil {
			t.Error("expected error for empty formula expression")
		}
	})

	t.Run("duplicate query names", func(t *testing.T) {
		j := mkRule("builder", `
			{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}},
			{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "mem", "spaceAggregation": "p50"}], "stepInterval": "5m"}}
		`)
		_, err := unmarshalAndValidate(j)
		if err == nil {
			t.Error("expected error for duplicate query names")
		}
	})
}

// TestValidate_DisabledRule verifies that disabled rules are still validated.
func TestValidate_DisabledRule(t *testing.T) {
	t.Run("disabled rule with invalid alertType still fails Validate", func(t *testing.T) {
		j := patchJSON(validV2Alpha1Builder(), `{"disabled": true, "alertType": "GARBAGE"}`)
		_, err := unmarshalAndValidate(j)
		if err == nil {
			t.Error("expected Validate() to fail even for disabled rule")
		}
	})

	t.Run("disabled rule with valid payload passes", func(t *testing.T) {
		j := patchJSON(validV2Alpha1Builder(), `{"disabled": true}`)
		_, err := unmarshalAndValidate(j)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

// TestValidate_AlertOnAbsent documents current behavior for alertOnAbsent/absentFor fields.
func TestValidate_AlertOnAbsent(t *testing.T) {
	t.Run("alertOnAbsent true accepted", func(t *testing.T) {
		j := patchJSON(validV2Alpha1Builder(), `{
			"condition": {
				"compositeQuery": {"queryType": "builder", "panelType": "graph", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu", "spaceAggregation": "p50"}], "stepInterval": "5m"}}]},
				"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 10.0, "matchType": "1", "op": "1"}]},
				"alertOnAbsent": true, "absentFor": 300
			}
		}`)
		_, err := unmarshalAndValidate(j)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}
