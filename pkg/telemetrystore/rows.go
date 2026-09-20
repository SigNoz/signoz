package telemetrystore

import (
	"reflect"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

// AdaptClickHouseRows keeps driver-specific column metadata at the storage
// boundary. WrapRows must be applied first when JSON scan types need overriding.
func AdaptClickHouseRows(rows driver.Rows, stats *QueryStats) Rows {
	if stats == nil {
		stats = &QueryStats{}
	}
	return &queryRows{Rows: rows, stats: stats}
}

type queryRows struct {
	driver.Rows
	stats *QueryStats
}

func (r *queryRows) ColumnTypes() []ColumnType {
	columns := r.Rows.ColumnTypes()
	result := make([]ColumnType, len(columns))
	for i, column := range columns {
		result[i] = column
	}
	return result
}

func (r *queryRows) QueryStats() QueryStats { return *r.stats }

// WrapRows reports JSONValue as the scan type of every JSON column. Nested JSON — Array(JSON),
// Map(String, JSON) — is not covered.
func WrapRows(rows driver.Rows) driver.Rows {
	return &rowsWithJSONScanType{Rows: rows}
}

type rowsWithJSONScanType struct {
	driver.Rows
}

func (r *rowsWithJSONScanType) ColumnTypes() []driver.ColumnType {
	colTypes := r.Rows.ColumnTypes()
	wrapped := make([]driver.ColumnType, len(colTypes))
	for i, colType := range colTypes {
		wrapped[i] = colType
		if strings.HasPrefix(strings.ToUpper(colType.DatabaseTypeName()), "JSON") {
			wrapped[i] = jsonColumnType{ColumnType: colType}
		}
	}
	return wrapped
}

type jsonColumnType struct {
	driver.ColumnType
}

func (jsonColumnType) ScanType() reflect.Type {
	return reflect.TypeFor[telemetrystoretypes.JSONValue]()
}
