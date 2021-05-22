package clickhouseReader

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

const (
	minTimespanForProgressiveSearch       = time.Hour
	minTimespanForProgressiveSearchMargin = time.Minute
	maxProgressiveSteps                   = 4
)

var (
	ErrNoOperationsTable = errors.New("no operations table supplied")
	ErrNoIndexTable      = errors.New("no index table supplied")
	ErrStartTimeRequired = errors.New("start time is required for search queries")
)

// SpanWriter for reading spans from ClickHouse
type TraceReader struct {
	db              *sql.DB
	operationsTable string
	indexTable      string
	spansTable      string
}

// NewTraceReader returns a TraceReader for the database
func NewTraceReader(db *sql.DB, operationsTable, indexTable, spansTable string) *TraceReader {
	return &TraceReader{
		db:              db,
		operationsTable: operationsTable,
		indexTable:      indexTable,
		spansTable:      spansTable,
	}
}

func (r *TraceReader) getStrings(ctx context.Context, sql string, args ...interface{}) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	values := []string{}

	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, err
		}
		values = append(values, value)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return values, nil
}

// GetServices fetches the sorted service list that have not expired
func (r *TraceReader) GetServices(ctx context.Context) ([]string, error) {

	if r.operationsTable == "" {
		return nil, ErrNoOperationsTable
	}

	query := fmt.Sprintf("SELECT service FROM %s GROUP BY service", r.operationsTable)

	return r.getStrings(ctx, query)
}
