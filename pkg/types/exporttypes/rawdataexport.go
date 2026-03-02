package exporttypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// ExportRawDataQueryParams represents the query parameters for the export raw data endpoint
type ExportRawDataQueryParams struct {
	ExportRawDataFormatQueryParam

	// Signal specifies the type of data to export: "logs" or "traces"
	Signal telemetrytypes.Signal `query:"signal" enum:"logs,traces" required:"true"`

	// Source specifies the type of data to export: "logs" or "traces"
	// Deprecated: Use Signal instead.
	Source string `query:"source" deprecated:"true"`

	// Start is the start time for the query (Unix timestamp in nanoseconds)
	Start uint64 `query:"start"`

	// End is the end time for the query (Unix timestamp in nanoseconds)
	End uint64 `query:"end"`

	// Limit specifies the maximum number of rows to export
	Limit int `query:"limit,default=10000" default:"10000" minimum:"1" maximum:"50000"`

	// Filter is a filter expression to apply to the query
	FilterString string         `query:"filter"  deprecated:"true"`
	Filter       qbtypes.Filter `query:"filterExpression"`

	// Columns specifies the columns to include in the export
	// Format: ["context.field:type", "context.field", "field"]
	Columns []string `query:"columns" deprecated:"true"`

	// SelectFields specifies the columns to include in the export
	SelectFields []telemetrytypes.TelemetryFieldKey `query:"selectFields"`

	// OrderBy specifies the sorting order
	// Format: "column:direction" or "context.field:type:direction"
	// Direction can be "asc" or "desc"
	// ** Deprecated **
	OrderBy string `query:"order_by" deprecated:"true"`

	// order by keys and directions
	Order []qbtypes.OrderBy `query:"order"`
}

type ExportRawDataFormatQueryParam struct {
	// Format specifies the output format: "csv" or "jsonl"
	Format string `query:"format,default=csv" default:"csv" enum:"csv,jsonl"`
}

func (p *ExportRawDataQueryParams) Normalize() {
	if len(p.Order) == 0 && len(p.OrderBy) > 0 {
		p.Order = parseExportQueryOrderBy(p.OrderBy)
	}

	if len(p.SelectFields) == 0 && len(p.Columns) != 0 {
		p.SelectFields = parseExportQueryColumns(p.Columns)

	}

	if len(p.Filter.Expression) == 0 && len(p.FilterString) > 0 {
		p.Filter = qbtypes.Filter{Expression: p.FilterString}
	}

	if p.Signal == telemetrytypes.SignalUnspecified && p.Source != "" {
		p.Signal = telemetrytypes.Signal{String: valuer.NewString(p.Source)}
	}
}

func (p *ExportRawDataQueryParams) Validate() error {

	if p.Signal != telemetrytypes.SignalLogs && p.Signal != telemetrytypes.SignalTraces {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid signal %s", p.Signal).WithAdditional("Allowed values: [logs, traces]")
	}

	return nil
}

// parseExportQueryColumns converts bound column strings to TelemetryFieldKey structs.
// Each column should be in the format "context.field:type" or "context.field" or "field"
func parseExportQueryColumns(columnParams []string) []telemetrytypes.TelemetryFieldKey {
	columns := make([]telemetrytypes.TelemetryFieldKey, 0, len(columnParams))
	for _, columnStr := range columnParams {
		columnStr = strings.TrimSpace(columnStr)
		if columnStr == "" {
			continue
		}
		columns = append(columns, telemetrytypes.GetFieldKeyFromKeyText(columnStr))
	}
	return columns
}

// parseExportQueryOrderBy converts a bound order_by string to an OrderBy slice.
// The string should be in the format "column:direction" and is assumed already validated.
func parseExportQueryOrderBy(orderByParam string) []qbtypes.OrderBy {
	orderByParam = strings.TrimSpace(orderByParam)
	if orderByParam == "" {
		return []qbtypes.OrderBy{}
	}

	parts := strings.Split(orderByParam, ":")
	column := strings.Join(parts[:len(parts)-1], ":")
	direction := parts[len(parts)-1]

	return []qbtypes.OrderBy{
		{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.GetFieldKeyFromKeyText(column),
			},
			Direction: qbtypes.OrderDirectionMap[direction],
		},
	}
}
