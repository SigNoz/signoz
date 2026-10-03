package signozalertmanager

import (
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
)

type postgresChannelStore struct {
	sqlstore.SQLStore
	db *sqlstore.BunDB
}

func (s *postgresChannelStore) SQLDB() *sql.DB { return s.db.DB.DB }
func (s *postgresChannelStore) BunDB() *bun.DB { return s.db.DB }
func (s *postgresChannelStore) BunDBCtx(ctx context.Context) bun.IDB {
	return s.db.BunDBCtx(ctx)
}
func (s *postgresChannelStore) RunInTxCtx(ctx context.Context, opts *sql.TxOptions, cb func(context.Context) error) error {
	return s.db.RunInTxCtx(ctx, opts, cb)
}
func (s *postgresChannelStore) WrapAlreadyExistsErrf(err error, code errors.Code, format string, args ...any) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return errors.Wrapf(err, errors.TypeAlreadyExists, code, format, args...)
	}
	return err
}

func newChannelTestStore(t *testing.T, database string) sqlstore.SQLStore {
	t.Helper()
	var store sqlstore.SQLStore
	settings := factorytest.NewSettings()
	if database == "postgres" {
		dsn := os.Getenv("SIGNOZ_TEST_POSTGRES_DSN")
		if dsn == "" {
			t.Skip("SIGNOZ_TEST_POSTGRES_DSN not set")
		}
		config, err := pgx.ParseConfig(dsn)
		require.NoError(t, err)
		config.ConnectTimeout = 5 * time.Second
		config.RuntimeParams["statement_timeout"] = "10000"
		config.RuntimeParams["lock_timeout"] = "5000"
		admin := stdlib.OpenDB(*config)
		t.Cleanup(func() { require.NoError(t, admin.Close()) })
		schema := pgx.Identifier{"channel_" + valuer.GenerateUUID().StringValue()}.Sanitize()
		_, err = admin.ExecContext(t.Context(), "CREATE SCHEMA "+schema)
		require.NoError(t, err)
		t.Cleanup(func() {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			_, err := admin.ExecContext(ctx, "DROP SCHEMA "+schema+" CASCADE")
			require.NoError(t, err)
		})
		config.RuntimeParams["search_path"] = schema
		config.RuntimeParams["statement_timeout"] = "10000"
		db := stdlib.OpenDB(*config)
		wrapped := sqlstore.NewBunDB(factory.NewScopedProviderSettings(settings, "channel-test"), db, pgdialect.New(), nil)
		store = &postgresChannelStore{db: wrapped}
	} else {
		var err error
		store, err = sqlitesqlstore.New(t.Context(), settings, sqlstore.Config{
			Provider:   "sqlite",
			Connection: sqlstore.ConnectionConfig{MaxOpenConns: 4},
			Sqlite: sqlstore.SqliteConfig{
				Path: filepath.Join(t.TempDir(), "channels.db"), Mode: "wal",
				BusyTimeout: 5 * time.Second, TransactionMode: "immediate",
			},
		})
		require.NoError(t, err)
	}
	t.Cleanup(func() { require.NoError(t, store.SQLDB().Close()) })
	for _, model := range []any{(*alertmanagertypes.Channel)(nil), (*alertmanagertypes.StoreableConfig)(nil)} {
		_, err := store.BunDB().NewCreateTable().Model(model).Exec(t.Context())
		require.NoError(t, err)
	}
	_, err := store.BunDB().NewCreateIndex().Model((*alertmanagertypes.StoreableConfig)(nil)).
		Index("config_org").Column("org_id").Unique().Exec(t.Context())
	require.NoError(t, err)
	_, err = store.BunDB().NewCreateIndex().Model((*alertmanagertypes.Channel)(nil)).
		Index("channel_org_name").Column("org_id", "name").Unique().Exec(t.Context())
	require.NoError(t, err)
	return store
}

type channelReadBarrier struct {
	alertmanagertypes.ConfigStore
	reads   atomic.Int32
	ready   chan int
	release [2]chan struct{}
}

func (s *channelReadBarrier) Get(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	config, err := s.ConfigStore.Get(ctx, orgID)
	if err != nil {
		return nil, err
	}
	i := int(s.reads.Add(1)) - 1
	if i < len(s.release) {
		s.ready <- i
		select {
		case <-s.release[i]:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	return config, nil
}

func channelReceiver(t *testing.T, name, path string) *alertmanagertypes.Receiver {
	t.Helper()
	receiver, err := alertmanagertypes.NewReceiver(`{"name":"` + name + `","webhook_configs":[{"url":"http://localhost/` + path + `"}]}`)
	require.NoError(t, err)
	return receiver
}

func channelV2(t *testing.T, name string) *alertmanagertypes.PostableNotificationChannel {
	t.Helper()
	// Construct through the wire format to exercise the same tagged-union decoding as the API.
	var input alertmanagertypes.PostableNotificationChannel
	require.NoError(t, input.UnmarshalJSON([]byte(`{"name":"`+strings.ToLower(name)+`","displayName":"`+name+`","config":{"kind":"webhook","spec":{"url":"http://localhost/new"}}}`)))
	return &input
}

func TestChannelMutationsRejectStaleConfiguration(t *testing.T) {
	for _, database := range []string{"sqlite", "postgres"} {
		for _, operations := range [][2]string{
			{"create", "create"}, {"create-v2", "create-v2"}, {"create", "create-v2"},
			{"update", "update"}, {"delete", "delete"}, {"delete", "create"}, {"update", "delete"},
		} {
			for _, first := range []int{0, 1, -1} {
				order := "overlapping-writes"
				if first >= 0 {
					order = "first-" + string(rune('A'+first))
				}
				t.Run(database+"/"+strings.Join(operations[:], "-")+"/"+order, func(t *testing.T) {
					store := newChannelTestStore(t, database)
					cfg := alertmanager.NewConfigFactory().New().(alertmanager.Config)
					nf := nfmanagertest.NewMock()
					p, err := New(factorytest.NewSettings(), cfg, store, nil, nf, nil)
					require.NoError(t, err)
					orgID := valuer.GenerateUUID().StringValue()
					require.NoError(t, p.SetDefaultConfig(t.Context(), orgID))
					var existing [2]*alertmanagertypes.Channel
					initialCount := 0
					for i, name := range []string{"A", "B"} {
						if operations[i] == "update" || operations[i] == "delete" {
							existing[i], err = p.CreateChannel(t.Context(), orgID, channelReceiver(t, name, "old"))
							require.NoError(t, err)
							initialCount++
						}
					}
					barrier := &channelReadBarrier{
						ConfigStore: p.configStore, ready: make(chan int, 2),
						release: [2]chan struct{}{make(chan struct{}), make(chan struct{})},
					}
					other, err := New(factorytest.NewSettings(), cfg, store, nil, nf, nil)
					require.NoError(t, err)
					p.configStore, other.configStore = barrier, barrier
					providers := [2]*provider{p, other}
					ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
					var workers sync.WaitGroup
					defer workers.Wait()
					defer cancel()
					results := [2]chan error{make(chan error, 1), make(chan error, 1)}
					var mutations [2]func() error
					for i, name := range []string{"A", "B"} {
						receiver := channelReceiver(t, name, "new")
						v2 := channelV2(t, name)
						mutations[i] = func() error {
							var err error
							switch operations[i] {
							case "create":
								_, err = providers[i].CreateChannel(ctx, orgID, receiver)
							case "create-v2":
								_, err = providers[i].CreateNotificationChannel(ctx, orgID, v2)
							case "update":
								err = providers[i].UpdateChannelByReceiverAndID(ctx, orgID, receiver, existing[i].ID)
							case "delete":
								err = providers[i].DeleteChannelByID(ctx, orgID, existing[i].ID)
							}
							return err
						}
						workers.Add(1)
						go func() {
							defer workers.Done()
							results[i] <- mutations[i]()
						}()
						select {
						case <-barrier.ready:
						case <-ctx.Done():
							t.Fatal(ctx.Err())
						}
					}
					winner := first
					if first < 0 {
						close(barrier.release[0])
						close(barrier.release[1])
						errs := [2]error{<-results[0], <-results[1]}
						winner = 0
						if errs[0] != nil {
							winner = 1
						}
						require.NoError(t, errs[winner])
						err = errs[1-winner]
					} else {
						close(barrier.release[first])
						require.NoError(t, <-results[first])
						close(barrier.release[1-first])
						err = <-results[1-first]
					}
					require.Error(t, err)
					require.True(t, errors.Ast(err, errors.TypeAlreadyExists))
					require.True(t, errors.Asc(err, alertmanagertypes.ErrCodeAlertmanagerConfigConflict))
					rw := httptest.NewRecorder()
					render.Error(rw, err)
					require.Equal(t, http.StatusConflict, rw.Code)
					channels, err := p.ListChannels(ctx, orgID)
					require.NoError(t, err)
					persisted, err := p.GetConfig(ctx, orgID)
					require.NoError(t, err)
					delta := map[string]int{"create": 1, "create-v2": 1, "update": 0, "delete": -1}
					expectedCount := initialCount + delta[operations[winner]]
					require.Len(t, channels, expectedCount)
					require.Len(t, persisted.AlertmanagerConfig().Receivers, expectedCount+1)
					for _, channel := range channels {
						receiver, err := persisted.GetReceiver(channel.DisplayName)
						require.NoError(t, err)
						storedReceiver, err := alertmanagertypes.NewReceiver(channel.Data)
						require.NoError(t, err)
						require.Equal(t, storedReceiver.WebhookConfigs, receiver.WebhookConfigs)
						if operations[1-winner] == "update" && channel.ID == existing[1-winner].ID {
							require.Equal(t, "http://localhost/old", string(receiver.WebhookConfigs[0].URL))
						}
					}
					// Resubmission must read current state and preserve the previously committed mutation.
					require.NoError(t, mutations[1-winner]())
					channels, err = p.ListChannels(ctx, orgID)
					require.NoError(t, err)
					persisted, err = p.GetConfig(ctx, orgID)
					require.NoError(t, err)
					require.Len(t, channels, expectedCount+delta[operations[1-winner]])
					require.Len(t, persisted.AlertmanagerConfig().Receivers, len(channels)+1)
					for _, channel := range channels {
						receiver, err := persisted.GetReceiver(channel.DisplayName)
						require.NoError(t, err)
						require.Equal(t, "http://localhost/new", string(receiver.WebhookConfigs[0].URL))
					}
				})
			}
		}
	}
}
