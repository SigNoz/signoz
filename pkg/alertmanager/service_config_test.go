package alertmanager

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/stretchr/testify/require"
)

type reconciliationConfigStore struct {
	alertmanagertypes.ConfigStore
	stored   alertmanagertypes.StoreableConfig
	channels []*alertmanagertypes.Channel
	matchers map[string][]string
	saved    []*alertmanagertypes.Config
	setErr   error
	orgIDs   []string
}

func (s *reconciliationConfigStore) Get(_ context.Context, orgID string) (*alertmanagertypes.Config, error) {
	s.orgIDs = append(s.orgIDs, orgID)
	stored := s.stored
	return alertmanagertypes.NewConfigFromStoreableConfig(&stored)
}

func (s *reconciliationConfigStore) Set(_ context.Context, config *alertmanagertypes.Config, _ ...alertmanagertypes.StoreOption) error {
	s.saved = append(s.saved, config)
	return s.setErr
}

func (s *reconciliationConfigStore) ListChannels(_ context.Context, orgID string) ([]*alertmanagertypes.Channel, error) {
	s.orgIDs = append(s.orgIDs, orgID)
	return s.channels, nil
}

func (s *reconciliationConfigStore) GetMatchers(_ context.Context, orgID string) (map[string][]string, error) {
	s.orgIDs = append(s.orgIDs, orgID)
	return s.matchers, nil
}

type reconciliationStateStore struct {
	alertmanagertypes.StateStore
	getCalls int
	err      error
}

func (s *reconciliationStateStore) Get(context.Context, string) (*alertmanagertypes.StoreableState, error) {
	s.getCalls++
	return nil, s.err
}

func reconciliationChannels(orgID string) []*alertmanagertypes.Channel {
	return []*alertmanagertypes.Channel{{
		Name: "current", DisplayName: "Current", Type: "webhook", OrgID: orgID,
		Data: `{"name":"Current","webhook_configs":[{"url":"https://example.com/alerts","send_resolved":true,"max_alerts":7}],"googlechat_configs":[{"webhook_url":"https://chat.googleapis.com/v1/spaces/test/messages?key=test&token=test","send_resolved":true,"title":"Channel title","text":"Channel text"}]}`,
	}}
}

func TestCompareAndSelectConfigPreservesStoredIdentityAndReadHash(t *testing.T) {
	config := alertmanagerserver.NewConfig()
	initial, err := alertmanagertypes.NewDefaultConfig(config.Global, config.Route, "org-reconcile")
	require.NoError(t, err)
	initial.StoreableConfig().CreatedAt = time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	stored := *initial.StoreableConfig()
	store := &reconciliationConfigStore{
		stored: stored, channels: reconciliationChannels(stored.OrgID),
		matchers: map[string][]string{"rule-1": {"Current"}},
	}
	config.Route.GroupWait += time.Second
	settings := factory.NewScopedProviderSettings(factorytest.NewSettings(), "alertmanager-config-test")
	service := New(settings, config, nil, store, nil, nil, nil)
	incoming, storedHash, err := service.getConfig(t.Context(), stored.OrgID)
	require.NoError(t, err)
	require.Equal(t, stored.Hash, storedHash)
	require.NotEqual(t, stored.Hash, incoming.StoreableConfig().Hash)

	rebuilt, err := alertmanagertypes.NewConfigFromChannels(config.Global, config.Route, store.channels, stored.OrgID)
	require.NoError(t, err)
	require.NoError(t, rebuilt.CreateRuleIDMatcher("rule-1", []string{"Current"}))
	selected, err := service.compareAndSelectConfig(t.Context(), incoming)
	require.NoError(t, err)
	require.Same(t, incoming, selected)
	require.Equal(t, stored.ID, selected.StoreableConfig().ID)
	require.Equal(t, stored.OrgID, selected.StoreableConfig().OrgID)
	require.Equal(t, stored.CreatedAt, selected.StoreableConfig().CreatedAt)
	originalHash, persisted := selected.OriginalHash()
	require.True(t, persisted)
	require.Equal(t, stored.Hash, originalHash)
	require.Equal(t, stored.UpdatedAt, selected.OriginalUpdatedAt())
	require.NotEqual(t, originalHash, selected.StoreableConfig().Hash)
	require.Equal(t, rebuilt.StoreableConfig().Hash, selected.StoreableConfig().Hash)
	require.JSONEq(t, rebuilt.StoreableConfig().Config, selected.StoreableConfig().Config)
	require.Equal(t, []string{"Current"}, selected.ReceiverNamesFromRuleID("rule-1"))
	require.Equal(t, []string{stored.OrgID, stored.OrgID, stored.OrgID}, store.orgIDs)
	require.Empty(t, store.saved)

	resolved, err := selected.Resolved()
	require.NoError(t, err)
	resolvedHash, persisted := resolved.OriginalHash()
	require.True(t, persisted)
	require.Equal(t, stored.Hash, resolvedHash)
	require.Equal(t, stored.UpdatedAt, resolved.OriginalUpdatedAt())
	for _, candidate := range []*alertmanagertypes.Config{selected, resolved} {
		receiver, err := candidate.GetReceiver("Current")
		require.NoError(t, err)
		require.Len(t, receiver.WebhookConfigs, 1)
		require.Equal(t, "https://example.com/alerts", string(receiver.WebhookConfigs[0].URL))
		require.EqualValues(t, 7, receiver.WebhookConfigs[0].MaxAlerts)
		require.True(t, receiver.WebhookConfigs[0].VSendResolved)
		require.Len(t, receiver.GoogleChatConfigs, 1)
		require.Equal(t, "https://chat.googleapis.com/v1/spaces/test/messages?key=test&token=test", receiver.GoogleChatConfigs[0].WebhookURL.String())
		require.Equal(t, "Channel title", receiver.GoogleChatConfigs[0].Title)
		require.Equal(t, "Channel text", receiver.GoogleChatConfigs[0].Text)
		require.True(t, receiver.GoogleChatConfigs[0].VSendResolved)
	}
}

func TestNewServerReconcilesBeforeConstruction(t *testing.T) {
	conflict := errors.New(errors.TypeAlreadyExists, alertmanagertypes.ErrCodeAlertmanagerConfigConflict, "concurrent config update")
	constructionErr := errors.New(errors.TypeInternal, errors.CodeInternal, "construction reached state store")
	for _, tc := range []struct {
		name         string
		changed      bool
		setErr       error
		wantErr      error
		wantSaves    int
		wantStateGet int
	}{
		{"conflict prevents construction", true, conflict, conflict, 1, 0},
		{"saved reconciliation reaches construction", true, nil, constructionErr, 1, 1},
		{"unchanged config skips save", false, nil, constructionErr, 0, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			config := alertmanagerserver.NewConfig()
			initial, err := alertmanagertypes.NewDefaultConfig(config.Global, config.Route, "org-construction")
			require.NoError(t, err)
			stored := *initial.StoreableConfig()
			store := &reconciliationConfigStore{stored: stored, setErr: tc.setErr}
			if tc.changed {
				store.channels = reconciliationChannels(stored.OrgID)
			}
			state := &reconciliationStateStore{err: constructionErr}
			settings := factory.NewScopedProviderSettings(factorytest.NewSettings(), "alertmanager-config-test")
			service := New(settings, config, state, store, nil, nil, nil)

			server, err := service.newServer(t.Context(), stored.OrgID)
			require.ErrorIs(t, err, tc.wantErr)
			require.Nil(t, server)
			require.Empty(t, service.servers)
			require.Equal(t, tc.wantStateGet, state.getCalls)
			require.Len(t, store.saved, tc.wantSaves)
			require.Equal(t, []string{stored.OrgID, stored.OrgID, stored.OrgID}, store.orgIDs)
			if tc.wantSaves != 0 {
				saved := store.saved[0]
				originalHash, persisted := saved.OriginalHash()
				require.True(t, persisted)
				require.Equal(t, stored.Hash, originalHash)
				require.Equal(t, stored.UpdatedAt, saved.OriginalUpdatedAt())
				require.NotEqual(t, stored.Hash, saved.StoreableConfig().Hash)
				require.Equal(t, stored.ID, saved.StoreableConfig().ID)
				require.Equal(t, stored.OrgID, saved.StoreableConfig().OrgID)
				require.Equal(t, stored.CreatedAt, saved.StoreableConfig().CreatedAt)
			}
		})
	}
}
