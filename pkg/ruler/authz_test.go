package ruler

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestParseRoutePolicyChannels(t *testing.T) {
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
			got, err := parseRoutePolicyChannels([]byte(testCase.body))
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

func TestDiffDowntimeRuleLinks(t *testing.T) {
	testCases := []struct {
		name         string
		stored       []string
		incoming     []string
		wantAttached []string
		wantDetached []string
	}{
		{
			name:         "AllToAll_NoChange",
			stored:       nil,
			incoming:     []string{"*"},
			wantAttached: []string{},
			wantDetached: []string{},
		},
		{
			name:         "NarrowFromAllToOne_DetachesAllAttachesOne",
			stored:       nil,
			incoming:     []string{"r1"},
			wantAttached: []string{"r1"},
			wantDetached: []string{"*"},
		},
		{
			name:         "WidenFromOneToAll_DetachesOneAttachesAll",
			stored:       []string{"r1"},
			incoming:     []string{"*"},
			wantAttached: []string{"*"},
			wantDetached: []string{"r1"},
		},
		{
			name:         "SwapRules_DiffsIDs",
			stored:       []string{"r1"},
			incoming:     []string{"r2"},
			wantAttached: []string{"r2"},
			wantDetached: []string{"r1"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			attached, detached := diffDowntimeRuleLinks(testCase.stored, testCase.incoming)

			assert.ElementsMatch(t, testCase.wantAttached, attached)
			assert.ElementsMatch(t, testCase.wantDetached, detached)
		})
	}
}

func TestDowntimeRuleIDsExtractor(t *testing.T) {
	testCases := []struct {
		name    string
		body    string
		wantIDs []string
	}{
		{
			name:    "MissingAlertIds_AllRules",
			body:    `{"name": "window"}`,
			wantIDs: []string{"*"},
		},
		{
			name:    "EmptyAlertIds_AllRules",
			body:    `{"alertIds": []}`,
			wantIDs: []string{"*"},
		},
		{
			name:    "ExplicitAlertIds_Kept",
			body:    `{"alertIds": ["r1", "r2"]}`,
			wantIDs: []string{"r1", "r2"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ids, err := DowntimeRuleIDsExtractor.Fn(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})

			require.NoError(t, err)
			assert.Equal(t, testCase.wantIDs, ids)
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
