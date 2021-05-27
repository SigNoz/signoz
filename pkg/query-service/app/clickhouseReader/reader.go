package clickhouseReader

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	_ "github.com/ClickHouse/clickhouse-go"
	"github.com/jmoiron/sqlx"

	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

const (
	primaryNamespace = "clickhouse"
	archiveNamespace = "clickhouse-archive"

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
type ClickHouseReader struct {
	db              *sqlx.DB
	operationsTable string
	indexTable      string
	spansTable      string
}

// NewTraceReader returns a TraceReader for the database
func NewReader() *ClickHouseReader {

	datasource := os.Getenv("ClickHouseUrl")
	options := NewOptions(datasource, primaryNamespace, archiveNamespace)
	db, err := initialize(options)

	if err != nil {
		zap.S().Error(err)
	}
	return &ClickHouseReader{
		db:              db,
		operationsTable: options.primary.OperationsTable,
		indexTable:      options.primary.IndexTable,
		spansTable:      options.primary.SpansTable,
	}
}

func initialize(options *Options) (*sqlx.DB, error) {

	db, err := connect(options.getPrimary())
	if err != nil {
		return nil, fmt.Errorf("error connecting to primary db: %v", err)
	}

	return db, nil
}

func connect(cfg *namespaceConfig) (*sqlx.DB, error) {
	if cfg.Encoding != EncodingJSON && cfg.Encoding != EncodingProto {
		return nil, fmt.Errorf("unknown encoding %q, supported: %q, %q", cfg.Encoding, EncodingJSON, EncodingProto)
	}

	return cfg.Connector(cfg)
}

func (r *ClickHouseReader) getStrings(ctx context.Context, sql string, args ...interface{}) ([]string, error) {
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
func (r *ClickHouseReader) GetServices(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceItem, error) {

	if r.indexTable == "" {
		return nil, ErrNoIndexTable
	}

	var serviceItems []model.ServiceItem

	query := fmt.Sprintf("SELECT service as serviceName, avg(durationNano) as avgDuration FROM %s GROUP BY service", r.indexTable)

	err := r.db.Select(&serviceItems, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, err
	}

	return &serviceItems, nil
}
