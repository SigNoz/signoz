package querier

import (
	"context"
	"log/slog"
	"testing"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChSQLQueryStatementRejectsNonSelect(t *testing.T) {
	testCases := []struct {
		name      string
		query     string
		expectErr bool
	}{
		{"Select_Allowed", "SELECT 1", false},
		{"DropTable_Rejected", "DROP TABLE signoz_logs.logs_v2", true},
		{"DropTableExtraSpace_Rejected", "DROP  TABLE signoz_logs.logs_v2", true},
		{"Insert_Rejected", "INSERT INTO signoz_logs.logs_v2 (id) VALUES ('x')", true},
		{"StackedStatements_Rejected", "SELECT 1; DROP TABLE signoz_logs.logs_v2", true},
		{"SystemDatabase_Rejected", "SELECT name FROM system.users", true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			q := newchSQLQuery(
				slog.Default(),
				nil,
				qbv5.ClickHouseQuery{Name: "A", Query: testCase.query},
				nil,
				qbv5.TimeRange{From: 1, To: 2},
				qbv5.RequestTypeRaw,
				nil,
			)

			_, err := q.Statement(context.Background())
			if testCase.expectErr {
				require.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
