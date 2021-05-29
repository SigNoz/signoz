package clickhouseReader

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
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

	query := fmt.Sprintf("SELECT serviceName, quantile(0.99)(durationNano) as p99, avg(durationNano) as avgDuration, count(*) as numCalls FROM %s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' GROUP BY serviceName", r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))
	err := r.db.Select(&serviceItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	if serviceItems == nil {
		serviceItems = []model.ServiceItem{}
	}

	return &serviceItems, nil
}

func (r *ClickHouseReader) GetServiceOverview(ctx context.Context, queryParams *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, error) {

	var serviceOverviewItems []model.ServiceOverviewItem

	query := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, quantile(0.99)(durationNano) as p99, quantile(0.95)(durationNano) as p95,quantile(0.50)(durationNano) as p50, count(*) as numCalls FROM %s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND serviceName='%s' GROUP BY time ORDER BY time DESC", strconv.Itoa(int(queryParams.StepSeconds/60)), r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10), queryParams.ServiceName)

	err := r.db.Select(&serviceOverviewItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	for i, _ := range serviceOverviewItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, serviceOverviewItems[i].Time)
		serviceOverviewItems[i].Timestamp = int64(timeObj.UnixNano())
		serviceOverviewItems[i].Time = ""
	}

	if serviceOverviewItems == nil {
		serviceOverviewItems = []model.ServiceOverviewItem{}
	}

	return &serviceOverviewItems, nil

}

func (r *ClickHouseReader) SearchSpans(ctx context.Context, queryParams *model.SpanSearchParams) (*[]model.SearchSpansResult, error) {

	query := fmt.Sprintf("SELECT timestamp, spanID, traceID, serviceName, name, kind, durationNano, tagsKeys, tagsValues FROM %s WHERE timestamp >= ? AND timestamp <= ?", r.indexTable)

	args := []interface{}{strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10)}

	if len(queryParams.ServiceName) != 0 {
		query = query + " AND serviceName = ?"
		args = append(args, queryParams.ServiceName)
	}

	if len(queryParams.OperationName) != 0 {

		query = query + " AND name = ?"
		args = append(args, queryParams.OperationName)

	}

	if len(queryParams.Kind) != 0 {
		query = query + " AND kind = ?"
		args = append(args, queryParams.Kind)

	}

	// // zap.S().Debug("MinDuration: ", queryParams.MinDuration)
	// var lower string
	// var upper string

	if len(queryParams.MinDuration) != 0 {
		query = query + " AND durationNano >= ?"
		args = append(args, queryParams.MinDuration)
	}
	if len(queryParams.MaxDuration) != 0 {
		query = query + " AND durationNano <= ?"
		args = append(args, queryParams.MaxDuration)
	}

	for _, item := range queryParams.Tags {

		if item.Operator == "equals" {
			query = query + " AND has(tags, ?)"
			args = append(args, fmt.Sprintf("%s:%s", item.Key, item.Value))

		} else if item.Operator == "contains" {
			query = query + " AND tagsValues[indexOf(tagsKeys, ?)] ILIKE ?"
			args = append(args, item.Key)
			args = append(args, fmt.Sprintf("%%%s%%", item.Value))
		} else if item.Operator == "isnotnull" {
			query = query + " AND has(tagsKeys, ?)"
			args = append(args, item.Key)
		} else {
			return nil, fmt.Errorf("Tag Operator %s not supported", item.Operator)
		}

		if item.Key == "error" && item.Value == "true" {

		}

	}

	var searchScanReponses []model.SearchSpanReponseItem

	err := r.db.Select(&searchScanReponses, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	searchSpansResult := []model.SearchSpansResult{
		model.SearchSpansResult{
			Columns: []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues"},
			Events:  make([][]interface{}, len(searchScanReponses)),
		},
	}

	for i, item := range searchScanReponses {
		spanEvents := item.GetValues()
		searchSpansResult[0].Events[i] = spanEvents
	}

	return &searchSpansResult, nil
}
