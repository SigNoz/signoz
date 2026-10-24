package ruler

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
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
