package model

import (
	"context"
	"fmt"
	"log/slog"
	"path/filepath"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func newAgentTestStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	store, err := sqlitesqlstore.New(t.Context(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "test.db"),
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		_ = store.SQLDB().Close()
	})

	_, err = store.BunDB().NewCreateTable().
		Model((*opamptypes.StorableAgent)(nil)).
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	return store
}

func insertTestAgent(t *testing.T, store sqlstore.SQLStore, orgID valuer.UUID, agentID string, createdAt time.Time) {
	t.Helper()
	storable := opamptypes.StorableAgent{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: createdAt, UpdatedAt: createdAt},
		AgentID:       agentID,
		OrgID:         orgID,
		Status:        opamptypes.AgentStatusConnected,
		Config:        "{}",
	}
	_, err := store.BunDB().NewInsert().Model(&storable).Exec(t.Context())
	require.NoError(t, err)
}

func TestKeepOnlyLast50Agents(t *testing.T) {
	store := newAgentTestStore(t)
	orgID := valuer.GenerateUUID()
	otherOrgID := valuer.GenerateUUID()

	base := time.Now().UTC().Truncate(time.Second)
	for i := range 60 {
		insertTestAgent(t, store, orgID, fmt.Sprintf("agent-%02d", i), base.Add(time.Duration(i)*time.Minute))
	}
	for i := range 5 {
		insertTestAgent(t, store, otherOrgID, fmt.Sprintf("other-%02d", i), base.Add(time.Duration(i)*time.Minute))
	}

	agent := New(store, slog.New(slog.DiscardHandler), orgID, "agent-59", nil)
	agent.KeepOnlyLast50Agents(context.Background())

	var remaining []opamptypes.StorableAgent
	err := store.BunDB().NewSelect().
		Model(&remaining).
		Where("org_id = ?", orgID).
		Order("created_at ASC").
		Scan(context.Background())
	require.NoError(t, err)
	require.Len(t, remaining, 50)

	for i, storable := range remaining {
		assert.Equal(t, fmt.Sprintf("agent-%02d", i+10), storable.AgentID)
	}

	otherCount, err := store.BunDB().NewSelect().
		Model((*opamptypes.StorableAgent)(nil)).
		Where("org_id = ?", otherOrgID).
		Count(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 5, otherCount)
}

func TestKeepOnlyLast50Agents_PostgresDialect(t *testing.T) {
	store := sqlstoretest.New(sqlstore.Config{Provider: "postgres"}, sqlmock.QueryMatcherRegexp)
	orgID := valuer.GenerateUUID()

	// SQLite tolerates SELECT DISTINCT ... ORDER BY in the pruning subquery, so
	// TestKeepOnlyLast50Agents cannot catch the postgres dialect regression. Assert
	// the exact bun-rendered DELETE shape instead: the subquery must select bare
	// agent_id, not distinct(agent_id).
	store.Mock().ExpectExec(`^DELETE FROM "agent" AS "storable_agent" WHERE \(org_id = '[^']+'\) AND \(agent_id NOT IN \(SELECT agent_id FROM "agent" AS "storable_agent" WHERE \(org_id = '[^']+'\) ORDER BY created_at DESC LIMIT 50\)\)$`).
		WillReturnResult(sqlmock.NewResult(0, 0))

	agent := New(store, slog.New(slog.DiscardHandler), orgID, "agent-00", nil)
	agent.KeepOnlyLast50Agents(context.Background())

	require.NoError(t, store.Mock().ExpectationsWereMet())
}
