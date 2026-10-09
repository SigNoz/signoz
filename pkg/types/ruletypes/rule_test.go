package ruletypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNextCloneAlertName(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{name: "PlainName_CopySuffixAppended", input: "High CPU", expected: "High CPU - Copy"},
		{name: "CopySuffix_BumpedToTwo", input: "High CPU - Copy", expected: "High CPU - Copy (2)"},
		{name: "NumberedSuffix_Incremented", input: "High CPU - Copy (2)", expected: "High CPU - Copy (3)"},
		{name: "MultiDigitSuffix_Incremented", input: "svc - Copy (41)", expected: "svc - Copy (42)"},
		{name: "ContainsCopyWord_NotTreatedAsSuffix", input: "Copy of things", expected: "Copy of things - Copy"},
		{name: "RepeatedCopy_OnlyTrailingMarkerParsed", input: "Prod - Copy - Copy", expected: "Prod - Copy - Copy (2)"},
		{name: "LongName_NotTruncated", input: "Muting And Manual Resolving Log Based Alert 7 October With A Very Long Descriptive Name That Goes On And On Past One Hundred Twenty Eight Characters", expected: "Muting And Manual Resolving Log Based Alert 7 October With A Very Long Descriptive Name That Goes On And On Past One Hundred Twenty Eight Characters - Copy"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, nextCloneAlertName(testCase.input))
		})
	}
}

func TestStorableRule_ToPostableRuleForCloning(t *testing.T) {
	v1Stored := `{
		"alert": "cpu high",
		"alertType": "METRIC_BASED_ALERT",
		"description": "watches cpu",
		"ruleType": "threshold_rule",
		"version": "v5",
		"evalWindow": "10m",
		"frequency": "2m",
		"disabled": true,
		"source": "https://signoz.example.com/alerts/new",
		"labels": {"team": "infra", "severity": "warning"},
		"annotations": {"summary": "cpu above {{$threshold}}"},
		"preferredChannels": ["slack-infra"],
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
				"panelType": "graph",
				"queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "aggregations": [{"metricName": "cpu_usage", "timeAggregation": "avg", "spaceAggregation": "max"}]}}]
			},
			"selectedQueryName": "A",
			"op": "1",
			"target": 90,
			"matchType": "1",
			"alertOnAbsent": true,
			"absentFor": 5
		}
	}`
	v2Stored := `{
		"alert": "cpu high - Copy",
		"alertType": "METRIC_BASED_ALERT",
		"ruleType": "promql_rule",
		"schemaVersion": "v2alpha1",
		"version": "v5",
		"disabled": false,
		"labels": {"team": "infra"},
		"condition": {
			"compositeQuery": {
				"queries": [{"type": "promql", "spec": {"name": "A", "query": "avg(cpu_usage)"}}],
				"panelType": "graph",
				"queryType": "promql"
			},
			"selectedQueryName": "A",
			"thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above", "channels": ["slack-critical"]}]}
		},
		"evaluation": {"kind": "rolling", "spec": {"evalWindow": "90m", "frequency": "90s"}},
		"notificationSettings": {"groupBy": ["service.name"], "renotify": {"enabled": true, "interval": "45m", "alertStates": ["firing"]}, "usePolicy": true}
	}`

	testCases := []struct {
		name         string
		stored       string
		expectedName string
		expectErr    bool
	}{
		{name: "V1Rule_Cloned_NameSuffixedRestIntact", stored: v1Stored, expectedName: "cpu high - Copy"},
		{name: "V2Alpha1Rule_Cloned_NameBumpedRestIntact", stored: v2Stored, expectedName: "cpu high - Copy (2)"},
		{name: "InvalidJSON_Error", stored: `{"alert": `, expectErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			rule := &StorableRule{Data: testCase.stored}

			cloned, err := rule.ToPostableRuleForCloning()
			if testCase.expectErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)

			expected := &PostableRule{}
			require.NoError(t, json.Unmarshal([]byte(testCase.stored), expected))
			expected.AlertName = testCase.expectedName
			assert.Equal(t, expected, cloned)

			marshaled, err := json.Marshal(cloned)
			require.NoError(t, err)
			roundTripped := &PostableRule{}
			require.NoError(t, json.Unmarshal(marshaled, roundTripped))
			assert.Equal(t, expected, roundTripped)
		})
	}
}
