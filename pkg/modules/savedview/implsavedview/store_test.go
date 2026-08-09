package implsavedview

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// newRealSQLiteStore spins up a real, file-backed sqlite database (not
// sqlmock) with the actual saved_view table + the same UNIQUE(org_id, name)
// index migration 109 creates in production, so tests here exercise the
// genuine constraint violation and sqlitesqlstore.WrapAlreadyExistsErrf's
// real error classification -- something a mocked "return this canned
// error" test can't verify.
func newRealSQLiteStore(t *testing.T) *store {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "saved_view_test.db")
	sqlStore, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            dbPath,
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = sqlStore.BunDB().NewCreateTable().
		Model((*savedviewtypes.StorableSavedView)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	_, err = sqlStore.BunDB().Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_view_org_id_name ON saved_view (org_id, name)`)
	require.NoError(t, err)

	return &store{sqlstore: sqlStore}
}

func testStorableSavedView(orgID string) *savedviewtypes.StorableSavedView {
	const name = "same-name"
	view := &savedviewtypes.SavedView{
		Name:          name,
		Source:        savedviewtypes.SourceLogs,
		SchemaVersion: savedviewtypes.SavedViewSchemaVersion,
		Spec: savedviewtypes.SavedViewSpec{
			DisplayName: name,
			PanelType:   savedviewtypes.PanelTypeGraph,
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
						Signal:       telemetrytypes.SignalLogs,
						Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
					},
				},
			},
		},
	}
	view.ID = valuer.GenerateUUID()
	view.OrgID = orgID
	view.CreatedBy = "creator@signoz.io"
	view.UpdatedBy = "creator@signoz.io"
	now := time.Now()
	view.CreatedAt = now
	view.UpdatedAt = now
	return savedviewtypes.NewStorableSavedView(view)
}

// TestStore_Create_DuplicateNameIsConflict proves the full, real path: a
// genuine sqlite UNIQUE(org_id, name) violation is classified as
// errors.TypeAlreadyExists, not left as an opaque internal error -- this is
// what makes the 409 declared on CreateSavedView actually true, not just
// documented in the OpenAPI schema.
func TestStore_Create_DuplicateNameIsConflict(t *testing.T) {
	s := newRealSQLiteStore(t)
	orgID := valuer.GenerateUUID().StringValue()

	require.NoError(t, s.Create(context.Background(), testStorableSavedView(orgID)))

	err := s.Create(context.Background(), testStorableSavedView(orgID))
	require.Error(t, err)
	require.True(t, errors.Ast(err, errors.TypeAlreadyExists), "expected an already-exists error, got %v", err)
}

// TestStore_Create_SameNameDifferentOrgSucceeds guards against an
// overly-broad fix: uniqueness is scoped to (org_id, name), so the same name
// under a different org must succeed.
func TestStore_Create_SameNameDifferentOrgSucceeds(t *testing.T) {
	s := newRealSQLiteStore(t)

	require.NoError(t, s.Create(context.Background(), testStorableSavedView(valuer.GenerateUUID().StringValue())))
	require.NoError(t, s.Create(context.Background(), testStorableSavedView(valuer.GenerateUUID().StringValue())))
}
