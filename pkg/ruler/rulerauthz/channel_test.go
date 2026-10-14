package rulerauthz

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func v1RuleJSON(preferredChannels string) string {
	return `{
		"alert": "TestAlert",
		"version": "v5",
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
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
			"target": 10.0,
			"matchType": "1",
			"op": "1"
		}` + preferredChannels + `
	}`
}

func v2RuleJSON(channels string) string {
	return `{
		"alert": "TestAlert",
		"version": "v5",
		"schemaVersion": "v2alpha1",
		"ruleType": "threshold_rule",
		"condition": {
			"compositeQuery": {
				"queryType": "builder",
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
				"spec": [{"name": "critical", "target": 90.0, "matchType": "1", "op": "1", "channels": ` + channels + `}]
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

func TestChannelsFromBody(t *testing.T) {
	testCases := []struct {
		name         string
		body         string
		wantChannels []string
	}{
		{
			name:         "V1PreferredChannels_FoldedIntoThresholds",
			body:         v1RuleJSON(`, "preferredChannels": ["slack", "pager"]`),
			wantChannels: []string{"slack", "pager"},
		},
		{
			name:         "V1NoChannels_Empty",
			body:         v1RuleJSON(""),
			wantChannels: nil,
		},
		{
			name:         "V2ThresholdChannels_ReadDirectly",
			body:         v2RuleJSON(`["email"]`),
			wantChannels: []string{"email"},
		},
		{
			name:         "V2EmptyChannels_Empty",
			body:         v2RuleJSON(`[]`),
			wantChannels: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			channels, err := channelsFromBody([]byte(testCase.body))

			require.NoError(t, err)
			assert.Equal(t, testCase.wantChannels, channels)
		})
	}
}

func TestChannelsFromBodyInvalidJSON(t *testing.T) {
	_, err := channelsFromBody([]byte("not json"))

	assert.Error(t, err)
}

func TestPatchedChannels(t *testing.T) {
	testCases := []struct {
		name         string
		stored       string
		patch        string
		wantChannels []string
	}{
		{
			name:         "PatchOmitsCondition_StoredChannelsSurvive",
			stored:       v2RuleJSON(`["slack"]`),
			patch:        `{"disabled": true}`,
			wantChannels: []string{"slack"},
		},
		{
			name:         "PatchSetsChannels_StoredChannelsReplaced",
			stored:       v2RuleJSON(`["slack"]`),
			patch:        v2RuleJSON(`["pager"]`),
			wantChannels: []string{"pager"},
		},
		{
			name:         "PatchEmptiesChannels_NoChannelsLeft",
			stored:       v2RuleJSON(`["slack"]`),
			patch:        v2RuleJSON(`[]`),
			wantChannels: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			stored := new(ruletypes.GettableRule)
			require.NoError(t, json.Unmarshal([]byte(testCase.stored), &stored.PostableRule))

			channels, err := patchedChannels(stored, []byte(testCase.patch))

			require.NoError(t, err)
			assert.Equal(t, testCase.wantChannels, channels)
		})
	}
}

func TestPatchedChannelsLeavesStoredRuleUntouched(t *testing.T) {
	stored := new(ruletypes.GettableRule)
	require.NoError(t, json.Unmarshal([]byte(v2RuleJSON(`["slack"]`)), &stored.PostableRule))

	_, err := patchedChannels(stored, []byte(v2RuleJSON(`["pager"]`)))

	require.NoError(t, err)
	assert.Equal(t, []string{"slack"}, stored.Channels())
}

func TestReplacedChannelsIgnoresStored(t *testing.T) {
	stored := new(ruletypes.GettableRule)
	require.NoError(t, json.Unmarshal([]byte(v2RuleJSON(`["slack"]`)), &stored.PostableRule))

	channels, err := replacedChannels(stored, []byte(v2RuleJSON(`["pager"]`)))

	require.NoError(t, err)
	assert.Equal(t, []string{"pager"}, channels)
}
