package sqltokenizerstore

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateLastObservedAt(t *testing.T) {
	testCases := []struct {
		name          string
		provider      string
		tokens        []*authtypes.StorableToken
		expectedQuery string
	}{
		{
			name:          "Sqlite_Empty",
			provider:      "sqlite",
			tokens:        nil,
			expectedQuery: "",
		},
		{
			name:          "Postgres_Empty",
			provider:      "postgres",
			tokens:        []*authtypes.StorableToken{},
			expectedQuery: "",
		},
		{
			name:     "Sqlite_OneToken",
			provider: "sqlite",
			tokens: []*authtypes.StorableToken{
				{ID: valuer.MustNewUUID("019984d1-0000-7000-8000-000000000001"), AccessToken: "access-one", RefreshToken: "refresh-one", LastObservedAt: time.Date(2026, 9, 22, 10, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 9, 22, 10, 0, 1, 0, time.UTC)},
			},
			expectedQuery: `WITH "update_cte" ("id", "last_observed_at", "updated_at") AS (VALUES ('019984d1-0000-7000-8000-000000000001', '2026-09-22 10:00:00+00:00', '2026-09-22 10:00:01+00:00')) UPDATE "auth_token" AS "auth_token" SET last_observed_at = update_cte.last_observed_at, updated_at = update_cte.updated_at FROM update_cte WHERE (auth_token.id = update_cte.id)`,
		},
		{
			name:     "Postgres_TwoTokens",
			provider: "postgres",
			tokens: []*authtypes.StorableToken{
				{ID: valuer.MustNewUUID("019984d1-0000-7000-8000-000000000002"), AccessToken: "access-two", RefreshToken: "refresh-two", LastObservedAt: time.Date(2026, 9, 22, 11, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 9, 22, 11, 0, 1, 0, time.UTC)},
				{ID: valuer.MustNewUUID("019984d1-0000-7000-8000-000000000003"), AccessToken: "access-three", RefreshToken: "refresh-three", LastObservedAt: time.Date(2026, 9, 22, 12, 0, 0, 0, time.UTC), UpdatedAt: time.Date(2026, 9, 22, 12, 0, 1, 0, time.UTC)},
			},
			expectedQuery: `WITH "update_cte" ("id", "last_observed_at", "updated_at") AS (VALUES ('019984d1-0000-7000-8000-000000000002'::text, '2026-09-22 11:00:00+00:00'::TIMESTAMPTZ, '2026-09-22 11:00:01+00:00'::TIMESTAMPTZ), ('019984d1-0000-7000-8000-000000000003'::text, '2026-09-22 12:00:00+00:00'::TIMESTAMPTZ, '2026-09-22 12:00:01+00:00'::TIMESTAMPTZ)) UPDATE "auth_token" AS "auth_token" SET last_observed_at = update_cte.last_observed_at, updated_at = update_cte.updated_at FROM update_cte WHERE (auth_token.id = update_cte.id)`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var executedQuery string
			matcher := sqlmock.QueryMatcherFunc(func(_, actual string) error {
				executedQuery = actual
				return nil
			})

			sqlStore := sqlstoretest.New(sqlstore.Config{Provider: testCase.provider}, matcher)
			if testCase.expectedQuery != "" {
				sqlStore.Mock().ExpectExec("").WillReturnResult(sqlmock.NewResult(0, int64(len(testCase.tokens))))
			}

			err := NewStore(sqlStore).UpdateLastObservedAt(context.Background(), testCase.tokens)
			require.NoError(t, err)
			require.NoError(t, sqlStore.Mock().ExpectationsWereMet())
			assert.Equal(t, testCase.expectedQuery, executedQuery)
		})
	}
}
