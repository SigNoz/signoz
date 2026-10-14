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
		wantErr      bool
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
		{
			name:    "NotJSON_Errors",
			body:    "not json",
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			channels, err := channelsFromBody([]byte(testCase.body))

			if testCase.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.wantChannels, channels)
		})
	}
}

func TestIncomingChannels(t *testing.T) {
	testCases := []struct {
		name            string
		incoming        incomingChannelsFunc
		stored          string
		body            string
		wantChannels    []string
		wantStoredAfter []string
	}{
		{
			name:            "Replaced_IgnoresStored",
			incoming:        replacedChannels,
			stored:          v2RuleJSON(`["slack"]`),
			body:            v2RuleJSON(`["pager"]`),
			wantChannels:    []string{"pager"},
			wantStoredAfter: []string{"slack"},
		},
		{
			name:            "Patched_OmitsCondition_StoredChannelsSurvive",
			incoming:        patchedChannels,
			stored:          v2RuleJSON(`["slack"]`),
			body:            `{"disabled": true}`,
			wantChannels:    []string{"slack"},
			wantStoredAfter: []string{"slack"},
		},
		{
			name:            "Patched_SetsChannels_StoredChannelsReplaced",
			incoming:        patchedChannels,
			stored:          v2RuleJSON(`["slack"]`),
			body:            v2RuleJSON(`["pager"]`),
			wantChannels:    []string{"pager"},
			wantStoredAfter: []string{"slack"},
		},
		{
			name:            "Patched_EmptiesChannels_NoChannelsLeft",
			incoming:        patchedChannels,
			stored:          v2RuleJSON(`["slack"]`),
			body:            v2RuleJSON(`[]`),
			wantChannels:    nil,
			wantStoredAfter: []string{"slack"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			stored := new(ruletypes.GettableRule)
			require.NoError(t, json.Unmarshal([]byte(testCase.stored), &stored.PostableRule))

			channels, err := testCase.incoming(stored, []byte(testCase.body))

			require.NoError(t, err)
			assert.Equal(t, testCase.wantChannels, channels)
			assert.Equal(t, testCase.wantStoredAfter, stored.Channels())
		})
	}
}
