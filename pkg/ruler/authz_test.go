package ruler

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestRoutePolicyChannelsFromBody(t *testing.T) {
	testCases := []struct {
		name    string
		body    string
		want    []string
		wantErr bool
	}{
		{name: "TwoChannels_Returned", body: `{"name":"p","expression":"a == 1","channels":["slack","pager"]}`, want: []string{"slack", "pager"}},
		{name: "NoChannels_Nil", body: `{"name":"p","expression":"a == 1"}`, want: nil},
		{name: "NotJSON_Errors", body: `not json`, wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got, err := routePolicyChannelsFromBody([]byte(testCase.body))
			if testCase.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.want, got)
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

func TestResolveChannelIDs(t *testing.T) {
	slackID := valuer.GenerateUUID()
	pagerID := valuer.GenerateUUID()
	channels := []*alertmanagertypes.Channel{
		{Identifiable: types.Identifiable{ID: slackID}, DisplayName: "slack"},
		{Identifiable: types.Identifiable{ID: pagerID}, DisplayName: "pager"},
	}

	testCases := []struct {
		name    string
		names   []string
		want    []string
		wantErr bool
	}{
		{name: "AllKnown_IDsInRequestOrder", names: []string{"pager", "slack"}, want: []string{pagerID.StringValue(), slackID.StringValue()}},
		{name: "UnknownName_Errors", names: []string{"slack", "missing"}, wantErr: true},
		{name: "NoNames_NoLookup", names: nil, want: nil},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			alertmanagerService := alertmanagertest.NewMockAlertmanager(t)
			if len(testCase.names) > 0 {
				alertmanagerService.EXPECT().ListChannels(mock.Anything, mock.Anything).Return(channels, nil)
			}

			got, err := resolveChannelIDs(context.Background(), alertmanagerService, valuer.GenerateUUID(), testCase.names)
			if testCase.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.want, got)
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

func TestRuleChannelsFromBody(t *testing.T) {
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
			channels, err := ruleChannelsFromBody([]byte(testCase.body))

			if testCase.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.wantChannels, channels)
		})
	}
}

func TestIncomingRuleChannels(t *testing.T) {
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
			incoming:        replacedRuleChannels,
			stored:          v2RuleJSON(`["slack"]`),
			body:            v2RuleJSON(`["pager"]`),
			wantChannels:    []string{"pager"},
			wantStoredAfter: []string{"slack"},
		},
		{
			name:            "Patched_OmitsCondition_StoredChannelsSurvive",
			incoming:        patchedRuleChannels,
			stored:          v2RuleJSON(`["slack"]`),
			body:            `{"disabled": true}`,
			wantChannels:    []string{"slack"},
			wantStoredAfter: []string{"slack"},
		},
		{
			name:            "Patched_SetsChannels_StoredChannelsReplaced",
			incoming:        patchedRuleChannels,
			stored:          v2RuleJSON(`["slack"]`),
			body:            v2RuleJSON(`["pager"]`),
			wantChannels:    []string{"pager"},
			wantStoredAfter: []string{"slack"},
		},
		{
			name:            "Patched_EmptiesChannels_NoChannelsLeft",
			incoming:        patchedRuleChannels,
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

func TestRuleBodyTelemetryResources(t *testing.T) {
	testCases := []struct {
		name     string
		body     string
		wantKind coretypes.Kind
		wantID   string
		wantErr  bool
	}{
		{
			name:     "V5Body_NoFilter_MetricsWildcard",
			body:     v2RuleJSON(`[]`),
			wantKind: coretypes.KindMetrics,
			wantID:   "builder_query/*",
		},
		{
			name:     "V1Body_PreferredChannels_MetricsWildcard",
			body:     v1RuleJSON(`, "preferredChannels": ["slack"]`),
			wantKind: coretypes.KindMetrics,
			wantID:   "builder_query/*",
		},
		{
			name:    "MissingCondition_Errors",
			body:    `{"alert": "TestAlert", "version": "v5"}`,
			wantErr: true,
		},
		{
			name:    "NotJSON_Errors",
			body:    "not json",
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			refs, err := NewRuleBodyTelemetryResources()(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})

			if testCase.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			require.Len(t, refs, 1)
			assert.Equal(t, testCase.wantKind, refs[0].Resource.Kind())
			assert.Equal(t, testCase.wantID, refs[0].ID)
		})
	}
}

func TestPatchedRule(t *testing.T) {
	logsQuery := `{"condition": {"compositeQuery": {"queryType": "builder", "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "stepInterval": "5m"}}]}}}`
	testCases := []struct {
		name         string
		body         string
		wantSignal   string
		wantChannels []string
	}{
		{
			name:         "BodyWithoutCondition_KeepsStoredQueryAndChannels",
			body:         `{"disabled": true}`,
			wantSignal:   "metrics",
			wantChannels: []string{"slack"},
		},
		{
			name:         "BodyWithNewQuery_ReplacesSignalKeepsThresholds",
			body:         logsQuery,
			wantSignal:   "logs",
			wantChannels: []string{"slack"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			stored := new(ruletypes.GettableRule)
			require.NoError(t, json.Unmarshal([]byte(v2RuleJSON(`["slack"]`)), &stored.PostableRule))

			patched, err := patchedRule(stored, []byte(testCase.body))

			require.NoError(t, err)
			require.NotNil(t, patched.RuleCondition)
			require.NotNil(t, patched.RuleCondition.CompositeQuery)
			encoded, err := json.Marshal(patched.RuleCondition.CompositeQuery)
			require.NoError(t, err)
			assert.Contains(t, string(encoded), `"signal":"`+testCase.wantSignal+`"`)
			assert.Equal(t, testCase.wantChannels, patched.Channels())
		})
	}
}

func TestOptionalRuleBodyTelemetryResources(t *testing.T) {
	testCases := []struct {
		name     string
		body     string
		wantRefs int
	}{
		{
			name:     "BodyWithoutCondition_NoResources",
			body:     `{"disabled": true}`,
			wantRefs: 0,
		},
		{
			name:     "BodyWithQuery_MetricsResource",
			body:     v2RuleJSON(`[]`),
			wantRefs: 1,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			refs, err := NewOptionalRuleBodyTelemetryResources()(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})

			require.NoError(t, err)
			assert.Len(t, refs, testCase.wantRefs)
		})
	}
}

func TestResolveStoredChannelIDs(t *testing.T) {
	channels := []*alertmanagertypes.Channel{
		{Identifiable: types.Identifiable{ID: valuer.GenerateUUID()}, Name: "slack", DisplayName: "slack"},
	}
	testCases := []struct {
		name    string
		names   []string
		wantIDs []string
	}{
		{
			name:    "KnownName_Resolved",
			names:   []string{"slack"},
			wantIDs: []string{channels[0].ID.StringValue()},
		},
		{
			name:    "UnknownName_Skipped",
			names:   []string{"slack", "gone"},
			wantIDs: []string{channels[0].ID.StringValue()},
		},
		{
			name:    "NoNames_NoLookup",
			names:   nil,
			wantIDs: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			alertmanagerService := alertmanagertest.NewMockAlertmanager(t)
			if len(testCase.names) > 0 {
				alertmanagerService.EXPECT().ListChannels(mock.Anything, mock.Anything).Return(channels, nil)
			}

			ids, err := resolveStoredChannelIDs(context.Background(), alertmanagerService, valuer.GenerateUUID(), testCase.names)

			require.NoError(t, err)
			assert.Equal(t, testCase.wantIDs, ids)
		})
	}
}
