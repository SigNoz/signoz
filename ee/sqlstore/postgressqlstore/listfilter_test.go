package postgressqlstore

// Lives in this package (rather than the listfilter package) so it can use
// the unexported newFormatter constructor without driving a real Postgres
// connection. Covers the only listfilter cases whose emitted SQL differs
// between SQLite and Postgres — the ones that go through JSONExtractString
// (`name`, `description`). All other operators (=, !=, BETWEEN, LIKE, IN,
// EXISTS, lower(...)) emit identical ANSI SQL on both dialects and are
// covered by the SQLite tests in the listfilter package itself.

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun/dialect/pgdialect"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes/listfilter"
)

func TestListFilterCompile_Postgres(t *testing.T) {
	f := newFormatter(pgdialect.New())

	cases := []struct {
		name     string
		query    string
		wantSQL  string
		wantArgs []any
	}{
		{
			name:     "name = uses Postgres -> / ->> chain",
			query:    `name = 'overview'`,
			wantSQL:  `"dashboard"."data"->'data'->'display'->>'name' = ?`,
			wantArgs: []any{"overview"},
		},
		{
			name:     "name CONTAINS — same JSON path, LIKE pattern",
			query:    `name CONTAINS 'overview'`,
			wantSQL:  `"dashboard"."data"->'data'->'display'->>'name' LIKE ?`,
			wantArgs: []any{"%overview%"},
		},
		{
			name:     "name ILIKE — LOWER wraps the JSON path",
			query:    `name ILIKE 'Prod%'`,
			wantSQL:  `lower("dashboard"."data"->'data'->'display'->>'name') LIKE LOWER(?)`,
			wantArgs: []any{"Prod%"},
		},
		{
			name:     "description = follows the same path shape",
			query:    `description = 'd1'`,
			wantSQL:  `"dashboard"."data"->'data'->'display'->>'description' = ?`,
			wantArgs: []any{"d1"},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			out, err := listfilter.Compile(c.query, f)
			require.NoError(t, err)
			require.NotNil(t, out)
			assert.Equal(t, c.wantSQL, out.SQL)
			assert.Equal(t, c.wantArgs, out.Args)
		})
	}
}
