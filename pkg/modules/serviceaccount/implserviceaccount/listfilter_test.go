package implserviceaccount

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCompileListFilter(t *testing.T) {
	store := &store{sqlstore: sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)}

	testCases := []struct {
		name         string
		query        string
		expectedSQL  string
		expectedArgs []any
		wantErr      bool
	}{
		{
			name:        "Empty_MatchesEverything",
			query:       "",
			expectedSQL: "",
		},
		{
			name:         "BareToken_SearchesNameOrEmail",
			query:        "ci-pipeline",
			expectedSQL:  "(lower(COALESCE(service_account.name, '')) LIKE LOWER(?) ESCAPE '\\' OR lower(COALESCE(service_account.email, '')) LIKE LOWER(?) ESCAPE '\\')",
			expectedArgs: []any{"%ci-pipeline%", "%ci-pipeline%"},
		},
		{
			name:         "QuotedToken_SearchesLiterally",
			query:        "'name = x'",
			expectedSQL:  "(lower(COALESCE(service_account.name, '')) LIKE LOWER(?) ESCAPE '\\' OR lower(COALESCE(service_account.email, '')) LIKE LOWER(?) ESCAPE '\\')",
			expectedArgs: []any{"%name = x%", "%name = x%"},
		},
		{
			name:         "StatusEqualsAndNameContains_Combined",
			query:        "status = deleted AND name CONTAINS 'ci'",
			expectedSQL:  "(service_account.status = ? AND service_account.name LIKE ? ESCAPE '\\')",
			expectedArgs: []any{"deleted", "%ci%"},
		},
		{
			name:         "CreatedAtAfterTimestamp_Compared",
			query:        "created_at > '2026-01-01T00:00:00Z'",
			expectedSQL:  "service_account.created_at > ?",
			expectedArgs: []any{time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)},
		},
		{
			name:    "UnknownKey_Rejected",
			query:   "owner = ci",
			wantErr: true,
		},
		{
			name:    "ContainsOnStatus_Rejected",
			query:   "status CONTAINS act",
			wantErr: true,
		},
		{
			name:    "DanglingEquals_Rejected",
			query:   "name =",
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			compiled, err := store.compileListFilter(testCase.query)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.expectedSQL, compiled.SQL)
			assert.Equal(t, testCase.expectedArgs, compiled.Args)
		})
	}
}
