package sqlalertmanagerstore

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func newConcurrentTestStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	store, err := sqlitesqlstore.New(t.Context(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    4,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            t.TempDir() + "/test.db",
			Mode:            "wal",
			BusyTimeout:     10 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*alertmanagertypes.StoreableConfig)(nil)).
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateIndex().
		Model((*alertmanagertypes.StoreableConfig)(nil)).
		Index("alertmanager_config_org_id_idx").
		Column("org_id").
		Unique().
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*alertmanagertypes.Channel)(nil)).
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	return store
}

func TestConcurrentChannelConfigUpdatesPreserveReceivers(t *testing.T) {
	sqlDB := newConcurrentTestStore(t)
	store := NewConfigStore(sqlDB)
	ctx := t.Context()
	orgID := valuer.GenerateUUID().StringValue()

	cfg, err := alertmanagertypes.NewDefaultConfig(
		alertmanagertypes.GlobalConfig{},
		alertmanagertypes.RouteConfig{GroupInterval: time.Minute, RepeatInterval: time.Minute, GroupWait: time.Minute},
		orgID,
	)
	require.NoError(t, err)

	recvA, err := alertmanagertypes.NewReceiver(`{"name":"ch-a","webhook_configs":[{"url":"http://example.com/a"}]}`)
	require.NoError(t, err)
	recvB, err := alertmanagertypes.NewReceiver(`{"name":"ch-b","webhook_configs":[{"url":"http://example.com/b"}]}`)
	require.NoError(t, err)
	require.NoError(t, cfg.CreateReceiver(recvA))
	require.NoError(t, cfg.CreateReceiver(recvB))
	require.NoError(t, store.Set(ctx, cfg))

	now := time.Now().UTC()
	channelA := &alertmanagertypes.Channel{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          "ch-a",
		DisplayName:   "ch-a",
		Type:          "webhook",
		Data:          `{"name":"ch-a","webhook_configs":[{"url":"http://example.com/a"}]}`,
		OrgID:         orgID,
	}
	channelB := &alertmanagertypes.Channel{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          "ch-b",
		DisplayName:   "ch-b",
		Type:          "webhook",
		Data:          `{"name":"ch-b","webhook_configs":[{"url":"http://example.com/b"}]}`,
		OrgID:         orgID,
	}
	require.NoError(t, store.CreateChannel(ctx, channelA))
	require.NoError(t, store.CreateChannel(ctx, channelB))

	update := func(channel *alertmanagertypes.Channel, raw string) error {
		receiver, err := alertmanagertypes.NewReceiver(raw)
		if err != nil {
			return err
		}
		if err := channel.Update(receiver); err != nil {
			return err
		}
		return store.UpdateChannel(ctx, orgID, channel, alertmanagertypes.WithCb(func(ctx context.Context) error {
			config, err := store.Get(ctx, orgID)
			if err != nil {
				return err
			}
			if err := config.UpdateReceiver(receiver); err != nil {
				return err
			}
			return store.Set(ctx, config)
		}))
	}

	var wg sync.WaitGroup
	errA := make(chan error, 1)
	errB := make(chan error, 1)
	wg.Add(2)
	go func() {
		defer wg.Done()
		errA <- update(channelA, `{"name":"ch-a","webhook_configs":[{"url":"http://example.com/a-new"}]}`)
	}()
	go func() {
		defer wg.Done()
		errB <- update(channelB, `{"name":"ch-b","webhook_configs":[{"url":"http://example.com/b-new"}]}`)
	}()
	wg.Wait()
	require.NoError(t, <-errA)
	require.NoError(t, <-errB)

	got, err := store.Get(ctx, orgID)
	require.NoError(t, err)

	raw := got.StoreableConfig().Config
	assert.Contains(t, raw, "http://example.com/a-new")
	assert.Contains(t, raw, "http://example.com/b-new")
}
