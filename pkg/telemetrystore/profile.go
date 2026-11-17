package telemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

type profileKey struct{}

// ProfileFromContext returns the settings profile a query runs with, set by a store from NewProfileStore.
func ProfileFromContext(ctx context.Context) string {
	profile, _ := ctx.Value(profileKey{}).(string)
	return profile
}

func contextWithProfile(ctx context.Context, profile string) context.Context {
	return context.WithValue(ctx, profileKey{}, profile)
}

// NewProfileStore returns a store that runs every query of store with the settings profile, over store's
// connections. The profile reaches ClickHouse through the store's hooks, which read ProfileFromContext.
func NewProfileStore(store TelemetryStore, profile string) TelemetryStore {
	return &profileStore{store: store, profile: profile, conn: &profileConn{Conn: store.ClickhouseDB(), profile: profile}}
}

type profileStore struct {
	store   TelemetryStore
	profile string
	conn    *profileConn
}

func (s *profileStore) ClickhouseDB() clickhouse.Conn {
	return s.conn
}

func (s *profileStore) WithProfile(profile string) TelemetryStore {
	return s.store.WithProfile(profile)
}

func (s *profileStore) Cluster() string {
	return s.store.Cluster()
}

func (s *profileStore) Estimate(ctx context.Context, stmt string, args ...any) ([]telemetrystoretypes.EstimateEntry, error) {
	return s.store.Estimate(contextWithProfile(ctx, s.profile), stmt, args...)
}

func (s *profileStore) Plan(ctx context.Context, stmt string, args ...any) error {
	return s.store.Plan(contextWithProfile(ctx, s.profile), stmt, args...)
}

func (s *profileStore) Indexes(ctx context.Context, stmt string, args ...any) (telemetrystoretypes.Granules, bool, error) {
	return s.store.Indexes(contextWithProfile(ctx, s.profile), stmt, args...)
}

type profileConn struct {
	clickhouse.Conn
	profile string
}

func (c *profileConn) Select(ctx context.Context, dest any, query string, args ...any) error {
	return c.Conn.Select(contextWithProfile(ctx, c.profile), dest, query, args...)
}

func (c *profileConn) Query(ctx context.Context, query string, args ...any) (driver.Rows, error) {
	return c.Conn.Query(contextWithProfile(ctx, c.profile), query, args...)
}

func (c *profileConn) QueryRow(ctx context.Context, query string, args ...any) driver.Row {
	return c.Conn.QueryRow(contextWithProfile(ctx, c.profile), query, args...)
}

func (c *profileConn) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	return c.Conn.PrepareBatch(contextWithProfile(ctx, c.profile), query, opts...)
}

func (c *profileConn) Exec(ctx context.Context, query string, args ...any) error {
	return c.Conn.Exec(contextWithProfile(ctx, c.profile), query, args...)
}

// Close leaves the connections open: they belong to the store the profile store was made from.
func (c *profileConn) Close() error {
	return nil
}
