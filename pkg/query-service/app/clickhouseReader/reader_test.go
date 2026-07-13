package clickhouseReader

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"strings"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/stretchr/testify/assert"
)

var errQueryRecorded = errors.New("query recorded")

type recordedQuery struct {
	query string
	args  []any
}

type recordingClickHouseConn struct {
	driver.Conn
	queries []recordedQuery
}

func (c *recordingClickHouseConn) record(query string, args ...any) {
	c.queries = append(c.queries, recordedQuery{query: query, args: args})
}

func (c *recordingClickHouseConn) Query(_ context.Context, query string, args ...any) (driver.Rows, error) {
	c.record(query, args...)
	return nil, errQueryRecorded
}

func (c *recordingClickHouseConn) QueryRow(_ context.Context, query string, args ...any) driver.Row {
	c.record(query, args...)
	return recordedErrorRow{}
}

func (c *recordingClickHouseConn) Select(_ context.Context, _ any, query string, args ...any) error {
	c.record(query, args...)
	return errQueryRecorded
}

type recordedErrorRow struct{}

func (recordedErrorRow) Err() error           { return errQueryRecorded }
func (recordedErrorRow) Scan(...any) error    { return errQueryRecorded }
func (recordedErrorRow) ScanStruct(any) error { return errQueryRecorded }

type GetStatusFiltersTest struct {
	query        string
	statusParams []string
	excludeMap   map[string]struct{}
	expected     string
}

func TestGetStatusFilters(t *testing.T) {
	assert := assert.New(t)
	var tests = []GetStatusFiltersTest{
		{"", make([]string, 0), map[string]struct{}{}, ""},
		{"test", []string{"error"}, map[string]struct{}{}, "test AND hasError = true"},
		{"test", []string{"ok"}, map[string]struct{}{}, "test AND hasError = false"},
		{"test", []string{"error"}, map[string]struct{}{"status": {}}, "test AND hasError = false"},
		{"test", []string{"ok"}, map[string]struct{}{"status": {}}, "test AND hasError = true"},
		{"test", []string{"error", "ok"}, map[string]struct{}{}, "test"},
	}
	for _, test := range tests {
		assert.Equal(getStatusFilters(test.query, test.statusParams, test.excludeMap), test.expected)
	}
}

func TestRuleStateHistoryQueriesBindRuleID(t *testing.T) {
	const maliciousRuleID = "1' OR 1=1 --"
	params := &model.QueryRuleStateHistory{
		Start:  1,
		End:    2,
		Limit:  10,
		Order:  "asc",
		Offset: 0,
	}

	testCases := []struct {
		name             string
		run              func(*ClickHouseReader) error
		ruleIDArgIndexes []int
	}{
		{
			name: "last saved state",
			run: func(reader *ClickHouseReader) error {
				_, err := reader.GetLastSavedRuleStateHistory(context.Background(), maliciousRuleID)
				return err
			},
			ruleIDArgIndexes: []int{0},
		},
		{
			name: "timeline",
			run: func(reader *ClickHouseReader) error {
				_, err := reader.ReadRuleStateHistoryByRuleID(context.Background(), maliciousRuleID, params)
				return err
			},
			ruleIDArgIndexes: []int{0},
		},
		{
			name: "top contributors",
			run: func(reader *ClickHouseReader) error {
				_, err := reader.ReadRuleStateHistoryTopContributorsByRuleID(context.Background(), maliciousRuleID, params)
				return err
			},
			ruleIDArgIndexes: []int{0},
		},
		{
			name: "overall state transitions",
			run: func(reader *ClickHouseReader) error {
				_, err := reader.GetOverallStateTransitions(context.Background(), maliciousRuleID, params)
				return err
			},
			ruleIDArgIndexes: []int{0, 3},
		},
		{
			name: "average resolution time",
			run: func(reader *ClickHouseReader) error {
				_, err := reader.GetAvgResolutionTime(context.Background(), maliciousRuleID, params)
				return err
			},
			ruleIDArgIndexes: []int{0, 3},
		},
		{
			name: "average resolution time by interval",
			run: func(reader *ClickHouseReader) error {
				_, err := reader.GetAvgResolutionTimeByInterval(context.Background(), maliciousRuleID, params)
				return err
			},
			ruleIDArgIndexes: []int{0, 3},
		},
		{
			name: "total triggers",
			run: func(reader *ClickHouseReader) error {
				_, err := reader.GetTotalTriggers(context.Background(), maliciousRuleID, params)
				return err
			},
			ruleIDArgIndexes: []int{0},
		},
		{
			name: "triggers by interval",
			run: func(reader *ClickHouseReader) error {
				_, err := reader.GetTriggersByInterval(context.Background(), maliciousRuleID, params)
				return err
			},
			ruleIDArgIndexes: []int{0},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			conn := &recordingClickHouseConn{}
			reader := &ClickHouseReader{
				db:     conn,
				logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
			}

			err := tc.run(reader)
			if err == nil || !strings.Contains(err.Error(), errQueryRecorded.Error()) {
				t.Fatalf("expected recorded query error, got %v", err)
			}
			if len(conn.queries) != 1 {
				t.Fatalf("expected one query, got %d", len(conn.queries))
			}

			query := conn.queries[0]
			if strings.Contains(query.query, maliciousRuleID) {
				t.Fatalf("rule ID was interpolated into query: %s", query.query)
			}
			if !strings.Contains(query.query, "rule_id = ?") {
				t.Fatalf("query does not bind rule ID: %s", query.query)
			}
			for _, index := range tc.ruleIDArgIndexes {
				if index >= len(query.args) {
					t.Fatalf("missing rule ID argument at index %d: %#v", index, query.args)
				}
				if query.args[index] != maliciousRuleID {
					t.Fatalf("expected rule ID argument at index %d, got %#v", index, query.args[index])
				}
			}
		})
	}
}
