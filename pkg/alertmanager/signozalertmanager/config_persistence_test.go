package signozalertmanager

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	amconfig "github.com/prometheus/alertmanager/config"
	"github.com/stretchr/testify/require"
)

func TestConfigurationPersistence(t *testing.T) {
	for _, database := range []string{"sqlite", "postgres"} {
		t.Run(database, func(t *testing.T) {
			db := newChannelTestStore(t, database)
			db.SQLDB().SetMaxOpenConns(1)
			store := sqlalertmanagerstore.NewConfigStore(db)
			defaults := alertmanager.NewConfigFactory().New().(alertmanager.Config)
			orgID := valuer.GenerateUUID().StringValue()
			newConfig := func() *alertmanagertypes.Config {
				config, err := alertmanagertypes.NewDefaultConfig(defaults.Signoz.Global, defaults.Signoz.Route, orgID)
				require.NoError(t, err)
				return config
			}
			ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
			defer cancel()
			initial := newConfig()
			require.NoError(t, store.Set(ctx, initial))
			assertConflict := func(err error) {
				t.Helper()
				require.Error(t, err)
				require.True(t, errors.Asc(err, alertmanagertypes.ErrCodeAlertmanagerConfigConflict))
			}
			// A second creator must not replace an existing row, even with identical content.
			assertConflict(store.Set(ctx, newConfig()))
			stale, err := store.Get(ctx, orgID)
			require.NoError(t, err)
			createdAt := stale.StoreableConfig().CreatedAt
			current, err := store.Get(ctx, orgID)
			require.NoError(t, err)
			require.NoError(t, current.SetGlobalConfig(defaults.Signoz.Global))
			require.NoError(t, current.CreateReceiver(channelReceiver(t, "saved", "saved")))
			require.NoError(t, store.Set(ctx, current))
			assertConflict(store.Set(ctx, stale))
			stored, err := store.Get(ctx, orgID)
			require.NoError(t, err)
			require.Equal(t, initial.StoreableConfig().ID, stored.StoreableConfig().ID)
			require.True(t, createdAt.Equal(stored.StoreableConfig().CreatedAt))
			baseline := stored.StoreableConfig().Config
			originalHash, persisted := stored.OriginalHash()
			require.True(t, persisted)

			rollback := errors.NewInternalf(errors.CodeInternal, "rollback outer transaction")
			err = db.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
				config, err := store.Get(ctx, orgID)
				if err != nil {
					return err
				}
				if err := config.SetGlobalConfig(defaults.Signoz.Global); err != nil {
					return err
				}
				receiver := channelReceiver(t, "uncommitted", "uncommitted")
				if err := config.CreateReceiver(receiver); err != nil {
					return err
				}
				channel, err := alertmanagertypes.NewChannelFromReceiver(receiver, orgID)
				if err != nil {
					return err
				}
				if err := store.CreateChannel(ctx, channel, alertmanagertypes.WithCb(func(ctx context.Context) error {
					return store.Set(ctx, config)
				})); err != nil {
					return err
				}
				channels, err := store.ListChannels(ctx, orgID)
				require.NoError(t, err)
				require.Len(t, channels, 1)
				_, err = store.GetChannelByID(ctx, orgID, channel.ID)
				require.NoError(t, err)
				again, err := store.Get(ctx, orgID)
				if err != nil {
					return err
				}
				_, err = again.GetReceiver("uncommitted")
				require.NoError(t, err)
				if err := again.AddInhibitRules([]amconfig.InhibitRule{{Equal: []string{"service.name"}}}); err != nil {
					return err
				}
				if err := store.Set(ctx, again); err != nil {
					return err
				}
				return rollback
			})
			require.ErrorIs(t, err, rollback)
			stored, err = store.Get(ctx, orgID)
			require.NoError(t, err)
			require.Equal(t, baseline, stored.StoreableConfig().Config)
			channels, err := store.ListChannels(ctx, orgID)
			require.NoError(t, err)
			require.Empty(t, channels)
			gotHash, _ := stored.OriginalHash()
			require.Equal(t, originalHash, gotHash)

			// A previously read snapshot remains usable after an unrelated transaction rolls back.
			require.NoError(t, stored.SetGlobalConfig(defaults.Signoz.Global))
			require.NoError(t, stored.CreateReceiver(channelReceiver(t, "after-rollback", "after")))
			require.NoError(t, store.Set(ctx, stored))
			cancelled, stop := context.WithCancel(ctx)
			stop()
			err = store.Set(cancelled, newConfig())
			require.Error(t, err)
			require.False(t, errors.Asc(err, alertmanagertypes.ErrCodeAlertmanagerConfigConflict))
		})
	}
}

func TestDefaultConfigurationResetPreservesIdentity(t *testing.T) {
	db := newChannelTestStore(t, "sqlite")
	defaults := alertmanager.NewConfigFactory().New().(alertmanager.Config)
	p, err := New(factorytest.NewSettings(), defaults, db, nil, nil, nil)
	require.NoError(t, err)
	orgID := valuer.GenerateUUID().StringValue()
	require.NoError(t, p.SetDefaultConfig(t.Context(), orgID))
	before, err := p.GetConfig(t.Context(), orgID)
	require.NoError(t, err)
	_, err = p.CreateChannel(t.Context(), orgID, channelReceiver(t, "channel", "channel"))
	require.NoError(t, err)
	require.NoError(t, p.SetDefaultConfig(t.Context(), orgID))
	after, err := p.GetConfig(t.Context(), orgID)
	require.NoError(t, err)
	require.Equal(t, before.StoreableConfig().ID, after.StoreableConfig().ID)
	require.Equal(t, before.StoreableConfig().Hash, after.StoreableConfig().Hash)
}

func TestRecreatedChannelCannotBeChangedThroughDeletedIdentity(t *testing.T) {
	for _, database := range []string{"sqlite", "postgres"} {
		for _, operation := range []string{"update", "delete"} {
			t.Run(database+"/"+operation, func(t *testing.T) {
				db := newChannelTestStore(t, database)
				defaults := alertmanager.NewConfigFactory().New().(alertmanager.Config)
				p, err := New(factorytest.NewSettings(), defaults, db, nil, nfmanagertest.NewMock(), nil)
				require.NoError(t, err)
				orgID := valuer.GenerateUUID().StringValue()
				ctx := t.Context()
				require.NoError(t, p.SetDefaultConfig(ctx, orgID))
				receiver := channelReceiver(t, "channel", "old")
				original, err := p.CreateChannel(ctx, orgID, receiver)
				require.NoError(t, err)
				staleConfig, err := p.GetConfig(ctx, orgID)
				require.NoError(t, err)
				require.NoError(t, staleConfig.SetGlobalConfig(defaults.Signoz.Global))
				require.NoError(t, p.DeleteChannelByID(ctx, orgID, original.ID))
				replacement, err := p.CreateChannel(ctx, orgID, receiver)
				require.NoError(t, err)
				current, err := p.GetConfig(ctx, orgID)
				require.NoError(t, err)
				expectedHash, _ := staleConfig.OriginalHash()
				require.Equal(t, expectedHash, current.StoreableConfig().Hash)
				cb := alertmanagertypes.WithCb(func(ctx context.Context) error { return p.SetConfig(ctx, staleConfig) })
				if operation == "update" {
					changed := channelReceiver(t, "channel", "changed")
					require.NoError(t, original.Update(changed))
					require.NoError(t, staleConfig.UpdateReceiver(changed))
					err = p.configStore.UpdateChannel(ctx, orgID, original, cb)
				} else {
					require.NoError(t, staleConfig.DeleteReceiver("channel"))
					err = p.configStore.DeleteChannelByID(ctx, orgID, original.ID, cb)
				}
				require.Error(t, err)
				require.True(t, errors.Ast(err, errors.TypeNotFound))
				stored, err := p.GetChannelByID(ctx, orgID, replacement.ID)
				require.NoError(t, err)
				require.Equal(t, replacement.Data, stored.Data)
				unchanged, err := p.GetConfig(ctx, orgID)
				require.NoError(t, err)
				require.Equal(t, current.StoreableConfig().Config, unchanged.StoreableConfig().Config)
			})
		}
	}
}

func TestReconciliationRejectsConfigurationABA(t *testing.T) {
	for _, database := range []string{"sqlite", "postgres"} {
		for _, futureRevision := range []bool{false, true} {
			name := "normal-clock"
			if futureRevision {
				name = "clock-behind-revision"
			}
			t.Run(database+"/"+name, func(t *testing.T) {
				db := newChannelTestStore(t, database)
				defaults := alertmanager.NewConfigFactory().New().(alertmanager.Config)
				p, err := New(factorytest.NewSettings(), defaults, db, nil, nil, nil)
				require.NoError(t, err)
				ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
				defer cancel()
				orgID := valuer.GenerateUUID().StringValue()
				require.NoError(t, p.SetDefaultConfig(ctx, orgID))
				channel, err := p.CreateChannel(ctx, orgID, channelReceiver(t, "channel", "A"))
				require.NoError(t, err)
				if futureRevision {
					_, err := db.BunDB().NewUpdate().Model((*alertmanagertypes.StoreableConfig)(nil)).
						Set("updated_at = ?", time.Now().Add(time.Hour).UTC().Truncate(time.Microsecond)).
						Where("org_id = ?", orgID).Exec(ctx)
					require.NoError(t, err)
				}
				before, err := p.GetConfig(ctx, orgID)
				require.NoError(t, err)
				require.NoError(t, p.UpdateChannelByReceiverAndID(ctx, orgID, channelReceiver(t, "channel", "B"), channel.ID))
				channels, err := p.ListChannels(ctx, orgID)
				require.NoError(t, err)
				rebuilt, err := alertmanagertypes.NewConfigFromChannels(defaults.Signoz.Global, defaults.Signoz.Route, channels, orgID)
				require.NoError(t, err)
				middle, err := p.GetConfig(ctx, orgID)
				require.NoError(t, err)
				require.True(t, middle.OriginalUpdatedAt().After(before.OriginalUpdatedAt()))
				require.NoError(t, p.UpdateChannelByReceiverAndID(ctx, orgID, channelReceiver(t, "channel", "A"), channel.ID))
				after, err := p.GetConfig(ctx, orgID)
				require.NoError(t, err)
				require.Equal(t, before.StoreableConfig().Hash, after.StoreableConfig().Hash)
				require.True(t, after.OriginalUpdatedAt().After(middle.OriginalUpdatedAt()))

				before.ReplaceWith(rebuilt)
				err = p.SetConfig(ctx, before)
				require.Error(t, err)
				require.True(t, errors.Asc(err, alertmanagertypes.ErrCodeAlertmanagerConfigConflict))
				unchanged, err := p.GetConfig(ctx, orgID)
				require.NoError(t, err)
				require.Equal(t, after.StoreableConfig().Config, unchanged.StoreableConfig().Config)
				require.Equal(t, after.OriginalUpdatedAt(), unchanged.OriginalUpdatedAt())
				stored, err := p.GetChannelByID(ctx, orgID, channel.ID)
				require.NoError(t, err)
				require.Equal(t, channels[0].ID, stored.ID)
				require.Contains(t, stored.Data, "http://localhost/A")

				// Even a no-content-change save consumes the read revision.
				require.NoError(t, p.SetConfig(ctx, after))
				err = p.SetConfig(ctx, after)
				require.Error(t, err)
				require.True(t, errors.Asc(err, alertmanagertypes.ErrCodeAlertmanagerConfigConflict))
			})
		}
	}
}
