package ruler

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
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

func TestDiffLinks(t *testing.T) {
	testCases := []struct {
		name         string
		stored       []string
		incoming     []string
		wantAttached []string
		wantDetached []string
	}{
		{
			name:         "BothEmpty_NothingChanges",
			wantAttached: []string{},
			wantDetached: []string{},
		},
		{
			name:         "NoStored_EverythingAttaches",
			incoming:     []string{"slack", "pager"},
			wantAttached: []string{"slack", "pager"},
			wantDetached: []string{},
		},
		{
			name:         "NoIncoming_EverythingDetaches",
			stored:       []string{"slack", "pager"},
			wantAttached: []string{},
			wantDetached: []string{"slack", "pager"},
		},
		{
			name:         "Unchanged_NothingChanges",
			stored:       []string{"slack", "pager"},
			incoming:     []string{"pager", "slack"},
			wantAttached: []string{},
			wantDetached: []string{},
		},
		{
			name:         "OneAddedOneRemoved_BothSidesReported",
			stored:       []string{"slack", "pager"},
			incoming:     []string{"slack", "email"},
			wantAttached: []string{"email"},
			wantDetached: []string{"pager"},
		},
		{
			name:         "DuplicateIncoming_CollapsedOnce",
			incoming:     []string{"slack", "slack"},
			wantAttached: []string{"slack"},
			wantDetached: []string{},
		},
		{
			name:         "DuplicateStored_CollapsedOnce",
			stored:       []string{"pager", "pager"},
			wantAttached: []string{},
			wantDetached: []string{"pager"},
		},
		{
			name:         "IncomingOrderPreserved",
			stored:       []string{"keep"},
			incoming:     []string{"zebra", "keep", "apple"},
			wantAttached: []string{"zebra", "apple"},
			wantDetached: []string{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			attached, detached := diffLinks(testCase.stored, testCase.incoming)

			assert.Equal(t, testCase.wantAttached, attached)
			assert.Equal(t, testCase.wantDetached, detached)
		})
	}
}

func TestFieldResourcesFromCompositeQuery(t *testing.T) {
	testCases := []struct {
		name      string
		body      string
		wantKinds []coretypes.Kind
		wantErr   bool
	}{
		{
			name:      "Builder_Logs_LogsField",
			body:      `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs"}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindLogsField},
		},
		{
			name:      "Builder_Traces_TracesField",
			body:      `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"traces"}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindTracesField},
		},
		{
			name:      "Builder_Metrics_MetricsField",
			body:      `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"metrics"}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindMetricsField},
		},
		{
			name:      "SubQuery_Metrics_MetricsField",
			body:      `{"compositeQuery":{"queries":[{"type":"builder_sub_query","spec":{"signal":"metrics"}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindMetricsField},
		},
		{
			name:      "BuilderAI_TracesField",
			body:      `{"compositeQuery":{"queries":[{"type":"builder_ai_query","spec":{}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindTracesField},
		},
		{
			name:      "PromQL_MetricsField",
			body:      `{"compositeQuery":{"queries":[{"type":"promql","spec":{}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindMetricsField},
		},
		{
			name:      "ClickHouseSQL_AllThreeFields",
			body:      `{"compositeQuery":{"queries":[{"type":"clickhouse_sql","spec":{}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindLogsField, coretypes.KindTracesField, coretypes.KindMetricsField},
		},
		{
			name:      "TwoBuilderSameSignal_Deduped",
			body:      `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"metrics"}},{"type":"builder_query","spec":{"signal":"metrics"}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindMetricsField},
		},
		{
			name:      "FormulaAlongsideBuilder_FormulaSkipped",
			body:      `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs"}},{"type":"builder_formula","spec":{}}]}}`,
			wantKinds: []coretypes.Kind{coretypes.KindLogsField},
		},
		{
			name:    "NoQueries_Errors",
			body:    `{"compositeQuery":{"queries":[]}}`,
			wantErr: true,
		},
		{
			name:    "UnknownSignal_Errors",
			body:    `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"events"}}]}}`,
			wantErr: true,
		},
		{
			name:    "UnknownQueryType_Errors",
			body:    `{"compositeQuery":{"queries":[{"type":"graphql","spec":{}}]}}`,
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			refs, err := fieldResourcesFromCompositeQuery([]byte(testCase.body))

			if testCase.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			kinds := make([]coretypes.Kind, 0, len(refs))
			for _, ref := range refs {
				kinds = append(kinds, ref.Resource.Kind())
			}
			assert.Equal(t, testCase.wantKinds, kinds)
		})
	}
}
