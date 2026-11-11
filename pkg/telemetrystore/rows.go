package telemetrystore

import (
	"reflect"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

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
