package ruletypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func readBody(t *testing.T, stored string) map[string]json.RawMessage {
	t.Helper()
	g := GettableRule{}
	require.NoError(t, json.Unmarshal([]byte(stored), &g))
	out, err := json.Marshal(NewRule(&g))
	require.NoError(t, err)
	var body map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(out, &body))
	return body
}

func TestV2RoundTripRolling(t *testing.T) {
	thresholds := `{
		"kind": "basic",
		"spec": [
			{"name": "critical", "target": 90.5, "targetUnit": "%", "recoveryTarget": 80.5, "matchType": "at_least_once", "op": "above", "channels": ["slack-critical"]},
			{"name": "warning", "target": 75, "targetUnit": "%", "matchType": "at_least_once", "op": "above", "channels": ["slack-warnings", "email-oncall"]}
		]
	}`
	thresholdsEchoed := `{
		"kind": "basic",
		"spec": [
			{"name": "critical", "target": 90.5, "targetUnit": "%", "recoveryTarget": 80.5, "matchType": "at_least_once", "op": "above", "channels": ["slack-critical"]},
			{"name": "warning", "target": 75, "targetUnit": "%", "recoveryTarget": null, "matchType": "at_least_once", "op": "above", "channels": ["slack-warnings", "email-oncall"]}
		]
	}`
	evaluation := `{"kind": "rolling", "spec": {"evalWindow": "90m", "frequency": "90s"}}`
	notificationSettings := `{
		"groupBy": ["service.name", "deployment.environment"],
		"renotify": {"enabled": true, "interval": "45m", "alertStates": ["firing", "nodata"]},
		"usePolicy": true,
		"newGroupEvalDelay": "10m"
	}`
	labels := `{"team": "infra", "severity": "critical"}`
	annotations := `{"summary": "CPU above {{$threshold}}", "description": "value {{$value}}"}`

	stored := `{
		"alert": "cpu high",
		"alertType": "METRIC_BASED_ALERT",
		"description": "watches cpu",
		"ruleType": "promql_rule",
		"schemaVersion": "v2alpha1",
		"version": "v5",
		"disabled": true,
		"labels": ` + labels + `,
		"annotations": ` + annotations + `,
		"condition": {
			"compositeQuery": {
				"queries": [{"type": "promql", "spec": {"name": "A", "query": "avg(cpu_usage)"}}],
				"panelType": "graph",
				"queryType": "promql",
				"unit": "percent"
			},
			"selectedQueryName": "A",
			"alertOnAbsent": true,
			"absentFor": 10,
			"requireMinPoints": true,
			"requiredNumPoints": 4,
			"thresholds": ` + thresholds + `
		},
		"evaluation": ` + evaluation + `,
		"notificationSettings": ` + notificationSettings + `
	}`

	body := readBody(t, stored)

	assert.JSONEq(t, `"cpu high"`, string(body["alert"]))
	assert.JSONEq(t, `"METRIC_BASED_ALERT"`, string(body["alertType"]))
	assert.JSONEq(t, `"watches cpu"`, string(body["description"]))
	assert.JSONEq(t, `"promql_rule"`, string(body["ruleType"]))
	assert.JSONEq(t, `"v2alpha1"`, string(body["schemaVersion"]))
	assert.JSONEq(t, `true`, string(body["disabled"]))
	assert.JSONEq(t, labels, string(body["labels"]))
	assert.JSONEq(t, annotations, string(body["annotations"]))
	assert.JSONEq(t, evaluation, string(body["evaluation"]))
	assert.JSONEq(t, notificationSettings, string(body["notificationSettings"]))

	var condition map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(body["condition"], &condition))
	assert.JSONEq(t, thresholdsEchoed, string(condition["thresholds"]))
	assert.JSONEq(t, `"A"`, string(condition["selectedQueryName"]))
	assert.JSONEq(t, `true`, string(condition["alertOnAbsent"]))
	assert.JSONEq(t, `10`, string(condition["absentFor"]))
	assert.JSONEq(t, `true`, string(condition["requireMinPoints"]))
	assert.JSONEq(t, `4`, string(condition["requiredNumPoints"]))
}

func TestV2RoundTripCumulative(t *testing.T) {
	evaluation := `{
		"kind": "cumulative",
		"spec": {
			"schedule": {"type": "daily", "minute": 30, "hour": 9},
			"frequency": "5m",
			"timezone": "America/New_York"
		}
	}`

	stored := `{
		"alert": "daily budget",
		"alertType": "METRIC_BASED_ALERT",
		"ruleType": "threshold_rule",
		"schemaVersion": "v2alpha1",
		"condition": {
			"compositeQuery": {
				"queries": [{"type": "promql", "spec": {"name": "A", "query": "sum(cost)"}}],
				"panelType": "graph",
				"queryType": "promql"
			},
			"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 100, "matchType": "at_least_once", "op": "above"}]}
		},
		"evaluation": ` + evaluation + `,
		"notificationSettings": {"usePolicy": false}
	}`

	body := readBody(t, stored)
	assert.JSONEq(t, evaluation, string(body["evaluation"]))
}

func TestV2MinimalReadShape(t *testing.T) {
	stored := `{
		"alert": "minimal",
		"alertType": "METRIC_BASED_ALERT",
		"ruleType": "threshold_rule",
		"schemaVersion": "v2alpha1",
		"condition": {
			"compositeQuery": {
				"queries": [{"type": "promql", "spec": {"name": "A", "query": "up"}}],
				"panelType": "graph",
				"queryType": "promql"
			},
			"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above"}]}
		},
		"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
		"notificationSettings": {"usePolicy": false}
	}`

	body := readBody(t, stored)

	for _, field := range []string{"labels", "annotations", "description", "preferredChannels", "evalWindow", "frequency"} {
		assert.NotContains(t, body, field)
	}

	var ns map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(body["notificationSettings"], &ns))
	for _, field := range []string{"renotify", "groupBy", "newGroupEvalDelay", "usePolicy"} {
		assert.NotContains(t, ns, field, "notificationSettings.%s", field)
	}

	assert.JSONEq(t, `false`, string(body["disabled"]))
	assert.JSONEq(t, `"v5"`, string(body["version"]))

	var condition struct {
		Thresholds struct {
			Spec []map[string]json.RawMessage `json:"spec"`
		} `json:"thresholds"`
	}
	require.NoError(t, json.Unmarshal(body["condition"], &condition))
	require.Len(t, condition.Thresholds.Spec, 1)
	spec := condition.Thresholds.Spec[0]
	assert.JSONEq(t, `""`, string(spec["targetUnit"]))
	assert.JSONEq(t, `null`, string(spec["channels"]))
	assert.JSONEq(t, `null`, string(spec["recoveryTarget"]))
}

func TestRenotifyRoundTrip(t *testing.T) {
	base := `{
		"alert": "cpu high",
		"alertType": "METRIC_BASED_ALERT",
		"ruleType": "threshold_rule",
		"schemaVersion": "v2alpha1",
		"condition": {
			"compositeQuery": {
				"queries": [{"type": "promql", "spec": {"name": "A", "query": "up"}}],
				"panelType": "graph",
				"queryType": "promql"
			},
			"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above"}]}
		},
		"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
		"notificationSettings": %s
	}`

	cases := []struct {
		name         string
		settings     string
		wantRenotify string
	}{
		{
			name:     "absent renotify stays absent",
			settings: `{"usePolicy": false}`,
		},
		{
			name:         "explicitly disabled renotify is echoed",
			settings:     `{"renotify": {"enabled": false}}`,
			wantRenotify: `{"enabled": false}`,
		},
		{
			name:         "enabled renotify with states is echoed",
			settings:     `{"renotify": {"enabled": true, "interval": "30m", "alertStates": ["firing"]}}`,
			wantRenotify: `{"enabled": true, "interval": "30m", "alertStates": ["firing"]}`,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			body := readBody(t, strings.Replace(base, "%s", tc.settings, 1))
			var ns map[string]json.RawMessage
			require.NoError(t, json.Unmarshal(body["notificationSettings"], &ns))
			if tc.wantRenotify == "" {
				assert.NotContains(t, ns, "renotify")
			} else {
				assert.JSONEq(t, tc.wantRenotify, string(ns["renotify"]))
			}
		})
	}
}

func TestPatchMergePreservesUnpatchedFields(t *testing.T) {
	stored := `{
		"alert": "cpu high",
		"alertType": "METRIC_BASED_ALERT",
		"ruleType": "threshold_rule",
		"schemaVersion": "v2alpha1",
		"condition": {
			"compositeQuery": {
				"queries": [{"type": "promql", "spec": {"name": "A", "query": "up"}}],
				"panelType": "graph",
				"queryType": "promql"
			},
			"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above"}]}
		},
		"evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
		"notificationSettings": {"renotify": {"enabled": true, "interval": "30m", "alertStates": ["firing"]}}
	}`

	rule := PostableRule{}
	require.NoError(t, json.Unmarshal([]byte(stored), &rule))
	require.NoError(t, json.Unmarshal([]byte(`{"disabled": true}`), &rule))
	require.NoError(t, rule.Validate())

	assert.True(t, rule.Disabled)
	assert.NotNil(t, rule.RuleCondition.Thresholds)
	assert.NotNil(t, rule.Evaluation)
	require.NotNil(t, rule.NotificationSettings)
	require.NotNil(t, rule.NotificationSettings.Renotify)
	assert.True(t, rule.NotificationSettings.Renotify.Enabled)
}
