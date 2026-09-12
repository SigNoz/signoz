package sqlalertmanagerstore

import (
	"errors"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/stretchr/testify/require"
)

func TestStateSnapshotSQL(t *testing.T) {
	for _, provider := range []string{"sqlite", "postgres"} {
		for _, column := range []string{"silences", "nflog"} {
			for _, failure := range []string{"none", "begin", "write", "commit"} {
				t.Run(provider+"/"+column+"/"+failure, func(t *testing.T) {
					db := sqlstoretest.New(sqlstore.Config{Provider: provider}, sqlmock.QueryMatcherRegexp)
					t.Cleanup(func() { _ = db.SQLDB().Close() })
					mock := db.Mock()
					store := NewStateStore(db)
					input := alertmanagertypes.NewStoreableState("org")
					input.Silences = "c2lsZW5jZQ=="
					input.NFLog = "bmZsb2c="
					component := alertmanagertypes.SilenceStateName
					if column == "nflog" {
						component = alertmanagertypes.NFLogStateName
					}
					sentinel := errors.New("database failure")
					begin := mock.ExpectBegin()
					if failure == "begin" {
						begin.WillReturnError(sentinel)
					} else {
						prefix := `INSERT INTO "alertmanager_state" AS "storeable_state" ("id", "created_at", "updated_at", "org_id", "` + column + `") VALUES (`
						suffix := `) ON CONFLICT (org_id) DO UPDATE SET "` + column + `" = EXCLUDED."` + column + `", updated_at = EXCLUDED.updated_at`
						write := mock.ExpectExec("^" + regexp.QuoteMeta(prefix) + ".*" + regexp.QuoteMeta(suffix) + "$")
						if failure == "write" {
							write.WillReturnError(sentinel)
							mock.ExpectRollback()
						} else {
							write.WillReturnResult(sqlmock.NewResult(0, 1))
							commit := mock.ExpectCommit()
							if failure == "commit" {
								commit.WillReturnError(sentinel)
							}
						}
					}
					err := store.Set(t.Context(), input, component)
					if failure == "none" {
						require.NoError(t, err)
					} else {
						require.ErrorIs(t, err, sentinel)
					}
					require.NoError(t, mock.ExpectationsWereMet())
				})
			}
		}
	}
}
