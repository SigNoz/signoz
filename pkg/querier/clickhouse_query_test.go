package querier

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClickHouseSQLRenderValidatesRenderedQuery(t *testing.T) {
	tests := []struct {
		name    string
		query   string
		vars    map[string]qbtypes.VariableItem
		want    string
		wantErr bool
	}{
		{
			name:  "valid select",
			query: "SELECT count() FROM signoz_logs.distributed_logs_v2",
			want:  "SELECT count() FROM signoz_logs.distributed_logs_v2",
		},
		{
			name:  "variable control characters remain quoted",
			query: "SELECT $value",
			vars: map[string]qbtypes.VariableItem{
				"value": {Value: "1; DROP TABLE events"},
			},
			want: "SELECT '1; DROP TABLE events'",
		},
		{
			name:    "multiple statements",
			query:   "SELECT 1; DROP TABLE events",
			wantErr: true,
		},
		{
			name:    "internal database",
			query:   "SELECT * FROM system.users",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := &chSQLQuery{
				query: qbtypes.ClickHouseQuery{Query: tt.query},
				vars:  tt.vars,
			}

			rendered, err := query.render()
			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.want, rendered)
		})
	}
}
