package implrawdataexport

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	module rawdataexport.Module
}

func NewHandler(module rawdataexport.Module) rawdataexport.Handler {
	return &handler{module: module}
}

// ExportRawData handles data export requests.
//
// API Documentation:
// Endpoint: GET /api/v1/export_raw_data
//
// Query Parameters:
//
//   - source (optional): Type of data to export ["logs" (default), "metrics", "traces"]
//     Note: Currently only "logs" is fully supported
//
//   - format (optional): Output format ["csv" (default), "jsonl"]
//
//   - start (required): Start time for query (Unix timestamp in nanoseconds)
//
//   - end (required): End time for query (Unix timestamp in nanoseconds)
//
//   - limit (optional): Maximum number of rows to export
//     Constraints: Must be positive and cannot exceed MAX_EXPORT_ROW_COUNT_LIMIT
//
//   - filter (optional): Filter expression to apply to the query
//
//   - columns (optional): Specific columns to include in export
//     Default: all columns are returned
//     Format: ["context.field:type", "context.field", "field"]
//
//   - order_by (optional): Sorting specification ["column:direction" or "context.field:type:direction"]
//     Direction: "asc" or "desc"
//     Default: ["timestamp:desc", "id:desc"]
//
// Response Headers:
//   - Content-Type: "text/csv" or "application/x-ndjson"
//   - Content-Encoding: "gzip" (handled by HTTP middleware)
//   - Content-Disposition: "attachment; filename=\"data_exported.[format]\""
//   - Cache-Control: "no-cache"
//   - Vary: "Accept-Encoding"
//   - Transfer-Encoding: "chunked"
//   - Trailers: X-Response-Complete
//
// Response Format:
//
//	CSV: Headers in first row, data in subsequent rows
//	JSONL: One JSON object per line
//
// Example Usage:
//
//	Basic CSV export:
//	  GET /api/v1/export_raw_data?start=1693612800000000000&end=1693699199000000000
//
//	Export with columns and format:
//	  GET /api/v1/export_raw_data?start=1693612800000000000&end=1693699199000000000&format=jsonl
//	      &columns=timestamp&columns=severity&columns=message
//
//	Export with filter and ordering:
//	  GET /api/v1/export_raw_data?start=1693612800000000000&end=1693699199000000000
//	      &filter=severity="error"&order_by=timestamp:desc&limit=1000
func (handler *handler) ExportRawData(rw http.ResponseWriter, r *http.Request) {
	source, err := getExportQuerySource(r.URL.Query())
	if err != nil {
		render.Error(rw, err)
		return
	}

	switch source {
	case "logs":
		handler.exportLogs(rw, r)
	case "traces":
		handler.exportTraces(rw, r)
	case "metrics":
		handler.exportMetrics(rw, r)
	default:
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid source: must be logs"))
	}
}

func (handler *handler) exportMetrics(rw http.ResponseWriter, r *http.Request) {
	render.Error(rw, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "metrics export is not yet supported"))
}

func (handler *handler) exportTraces(rw http.ResponseWriter, r *http.Request) {
	render.Error(rw, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "traces export is not yet supported"))
}

func (handler *handler) exportLogs(rw http.ResponseWriter, r *http.Request) {
	// Set up response headers
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Vary", "Accept-Encoding") // Indicate that response varies based on Accept-Encoding
	rw.Header().Set("Access-Control-Expose-Headers", "Content-Disposition, X-Response-Complete")
	rw.Header().Set("Trailer", "X-Response-Complete")
	rw.Header().Set("Transfer-Encoding", "chunked")

	queryParams := r.URL.Query()

	startTime, endTime, err := getExportQueryTimeRange(queryParams)
	if err != nil {
		render.Error(rw, err)
		return
	}

	limit, err := getExportQueryLimit(queryParams)
	if err != nil {
		render.Error(rw, err)
		return
	}

	format, err := getExportQueryFormat(queryParams)
	if err != nil {
		render.Error(rw, err)
		return
	}

	// Set appropriate content type and filename
	filename := fmt.Sprintf("data_exported_%s.%s", time.Now().Format("2006-01-02_150405"), format)
	rw.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	filterExpression := queryParams.Get("filter")

	orderByExpression, err := getExportQueryOrderBy(queryParams)
	if err != nil {
		render.Error(rw, err)
		return
	}

	columns := getExportQueryColumns(queryParams)

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is invalid"))
		return
	}

	queryRangeRequest := qbtypes.QueryRangeRequest{
		Start:       startTime,
		End:         endTime,
		RequestType: qbtypes.RequestTypeRaw,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: nil,
				},
			},
		},
	}

	spec := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		Signal: telemetrytypes.SignalLogs,
		Name:   "raw",
		Filter: &qbtypes.Filter{
			Expression: filterExpression,
		},
		Limit: limit,
		Order: orderByExpression,
	}

	spec.SelectFields = columns

	queryRangeRequest.CompositeQuery.Queries[0].Spec = spec

	// This will signal Export module to stop sending data
	doneChan := make(chan any)
	defer close(doneChan)
	rowChan, errChan := handler.module.ExportRawData(r.Context(), orgID, &queryRangeRequest, doneChan)

	var isComplete bool

	switch format {
	case "csv", "":
		rw.Header().Set("Content-Type", "text/csv")
		csvWriter := csv.NewWriter(rw)
		isComplete, err = handler.exportLogsCSV(rowChan, errChan, csvWriter)
		if err != nil {
			render.Error(rw, err)
			return
		}
		csvWriter.Flush()
	case "jsonl":
		rw.Header().Set("Content-Type", "application/x-ndjson")
		isComplete, err = handler.exportLogsJSONL(rowChan, errChan, rw)
		if err != nil {
			render.Error(rw, err)
			return
		}
	default:
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid format: must be csv or jsonl"))
		return
	}

	rw.Header().Set("X-Response-Complete", strconv.FormatBool(isComplete))
}

func (handler *handler) exportLogsCSV(rowChan <-chan *qbtypes.RawRow, errChan <-chan error, csvWriter *csv.Writer) (bool, error) {
	var header []string

	headerToIndexMapping := make(map[string]int, len(header))

	totalBytes := uint64(0)
	for {
		select {
		case row, ok := <-rowChan:
			if !ok {
				return true, nil
			}
			if header == nil {
				// Initialize and write header for CSV
				header = constructCSVHeaderFromQueryResponse(row.Data)

				if err := csvWriter.Write(header); err != nil {
					return false, err
				}

				for i, col := range header {
					headerToIndexMapping[col] = i
				}
			}
			record := constructCSVRecordFromQueryResponse(row.Data, headerToIndexMapping)
			if err := csvWriter.Write(record); err != nil {
				return false, err
			}

			totalBytes += getsizeOfStringSlice(record)
			if totalBytes > MaxExportBytesLimit {
				return false, nil
			}
		case err := <-errChan:
			if err != nil {
				return false, err
			}
		}
	}
}

func (handler *handler) exportLogsJSONL(rowChan <-chan *qbtypes.RawRow, errChan <-chan error, writer io.Writer) (bool, error) {

	totalBytes := uint64(0)
	for {
		select {
		case row, ok := <-rowChan:
			if !ok {
				return true, nil
			}
			// Handle JSON format (JSONL - one object per line)
			jsonBytes, _ := json.Marshal(row.Data)
			totalBytes += uint64(len(jsonBytes)) + 1 // +1 for newline

			if _, err := writer.Write(jsonBytes); err != nil {
				return false, errors.NewUnexpectedf(errors.CodeInternal, "error writing JSON: %s", err)
			}
			if _, err := writer.Write([]byte("\n")); err != nil {
				return false, errors.NewUnexpectedf(errors.CodeInternal, "error writing JSON newline: %s", err)
			}

			if totalBytes > MaxExportBytesLimit {
				return false, nil
			}
		case err := <-errChan:
			if err != nil {
				return false, err
			}
		}
	}
}

func getExportQuerySource(queryParams url.Values) (string, error) {
	switch queryParams.Get("source") {
	case "logs", "":
		return "logs", nil
	case "metrics":
		return "metrics", errors.NewInvalidInputf(errors.CodeInvalidInput, "metrics export not yet supported")
	case "traces":
		return "traces", errors.NewInvalidInputf(errors.CodeInvalidInput, "traces export not yet supported")
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid source: must be logs, metrics or traces")
	}
}

func getExportQueryFormat(queryParams url.Values) (string, error) {
	switch queryParams.Get("format") {
	case "csv", "":
		return "csv", nil
	case "jsonl":
		return "jsonl", nil
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid format: must be csv or jsonl")
	}
}

func getExportQueryLimit(queryParams url.Values) (int, error) {

	limitStr := queryParams.Get("limit")
	if limitStr == "" {
		return DefaultExportRowCountLimit, nil
	} else {
		limit, err := strconv.Atoi(limitStr)
		if err != nil {
			return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid limit format: %s", err.Error())
		}
		if limit <= 0 {
			return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be positive")
		}
		if limit > MaxExportRowCountLimit {
			return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "limit cannot be more than %d", MaxExportRowCountLimit)
		}
		return limit, nil
	}
}

func getExportQueryTimeRange(queryParams url.Values) (uint64, uint64, error) {

	startTimeStr := queryParams.Get("start")
	endTimeStr := queryParams.Get("end")

	if startTimeStr == "" || endTimeStr == "" {
		return 0, 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "start and end time are required")
	}
	startTime, err := strconv.ParseUint(startTimeStr, 10, 64)
	if err != nil {
		return 0, 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start time format: %s", err.Error())
	}
	endTime, err := strconv.ParseUint(endTimeStr, 10, 64)
	if err != nil {
		return 0, 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid end time format: %s", err.Error())
	}
	return startTime, endTime, nil
}

func constructCSVHeaderFromQueryResponse(data map[string]any) []string {
	header := make([]string, 0, len(data))
	for key := range data {
		header = append(header, key)
	}
	return header
}

// sanitizeForCSV sanitizes a string for CSV by prefixing a single quote if the first non-whitespace rune is '=', '+', '-', or '@'.
// Excel and sheets remove these leading single quote when displaying the cell content.
// TODO: will revisit this in a future PR
func sanitizeForCSV(s string) string {
	// Find first non-whitespace rune
	i := 0
	for i < len(s) {
		r, size := utf8.DecodeRuneInString(s[i:])
		if !unicode.IsSpace(r) {
			// If first non-space is risky, prefix a single quote
			switch r {
			case '=', '+', '-', '@':
				return "'" + s
			}
			return s
		}
		i += size
	}
	return s // all whitespace
}

func constructCSVRecordFromQueryResponse(data map[string]any, headerToIndexMapping map[string]int) []string {
	record := make([]string, len(headerToIndexMapping))

	for key, value := range data {
		if index, exists := headerToIndexMapping[key]; exists && value != nil {

			var valueStr string
			switch v := value.(type) {
			case string:
				valueStr = v
			case int:
				valueStr = strconv.FormatInt(int64(v), 10)
			case int32:
				valueStr = strconv.FormatInt(int64(v), 10)
			case int64:
				valueStr = strconv.FormatInt(v, 10)
			case uint:
				valueStr = strconv.FormatUint(uint64(v), 10)
			case uint32:
				valueStr = strconv.FormatUint(uint64(v), 10)
			case uint64:
				valueStr = strconv.FormatUint(v, 10)
			case float32:
				valueStr = strconv.FormatFloat(float64(v), 'f', -1, 32)
			case float64:
				valueStr = strconv.FormatFloat(v, 'f', -1, 64)
			case bool:
				valueStr = strconv.FormatBool(v)
			case time.Time:
				valueStr = v.Format(time.RFC3339Nano)
			case []byte:
				valueStr = string(v)
			case fmt.Stringer:
				valueStr = v.String()

			default:
				// For all other complex types (maps, structs, etc.)
				jsonBytes, _ := json.Marshal(v)
				valueStr = string(jsonBytes)
			}

			record[index] = sanitizeForCSV(valueStr)
		}
	}
	return record
}

// getExportQueryColumns parses the "columns" query parameters and returns a slice of TelemetryFieldKey structs.
// Each column should be a valid telemetry field key in the format "context.field:type" or "context.field" or "field"
func getExportQueryColumns(queryParams url.Values) []telemetrytypes.TelemetryFieldKey {
	columnParams := queryParams["columns"]

	columns := make([]telemetrytypes.TelemetryFieldKey, 0, len(columnParams))

	for _, columnStr := range columnParams {
		// Skip empty strings
		columnStr = strings.TrimSpace(columnStr)
		if columnStr == "" {
			continue
		}

		columns = append(columns, telemetrytypes.GetFieldKeyFromKeyText(columnStr))
	}

	return columns
}

func getsizeOfStringSlice(slice []string) uint64 {
	var totalBytes uint64
	for _, str := range slice {
		totalBytes += uint64(len(str))
	}
	return totalBytes
}

// getExportQueryOrderBy parses the "order_by" query parameters and returns a slice of OrderBy structs.
// Each "order_by" parameter should be in the format "column:direction"
// Each "column" should be a valid telemetry field key in the format "context.field:type" or "context.field" or "field"
func getExportQueryOrderBy(queryParams url.Values) ([]qbtypes.OrderBy, error) {
	orderByParam := queryParams.Get("order_by")

	orderByParam = strings.TrimSpace(orderByParam)
	if orderByParam == "" {
		return telemetrylogs.DefaultLogsV2SortingOrder, nil
	}

	parts := strings.Split(orderByParam, ":")
	if len(parts) != 2 && len(parts) != 3 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order_by format: %s, should be <column>:<direction>", orderByParam)
	}

	column := strings.Join(parts[:len(parts)-1], ":")
	direction := parts[len(parts)-1]

	orderDirection, ok := qbtypes.OrderDirectionMap[direction]
	if !ok {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order_by direction: %s, should be one of %s, %s", direction, qbtypes.OrderDirectionAsc, qbtypes.OrderDirectionDesc)
	}

	orderByKey := telemetrytypes.GetFieldKeyFromKeyText(column)

	orderBy := []qbtypes.OrderBy{
		{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: orderByKey,
			},
			Direction: orderDirection,
		},
	}

	// If we are ordering by the timestamp column, also order by the ID column
	if orderByKey.Name == telemetrylogs.LogsV2TimestampColumn {
		orderBy = append(orderBy, qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: telemetrylogs.LogsV2IDColumn,
				},
			},
			Direction: orderDirection,
		})
	}
	return orderBy, nil
}
