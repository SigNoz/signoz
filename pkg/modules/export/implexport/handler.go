package implexport

import (
	"compress/gzip"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/export"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	module export.Module
}

func NewHandler(module export.Module) export.Handler {
	return &handler{module: module}
}

// Export handles data export requests.
//
// API Documentation:
// Endpoint: GET /api/v1/export
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
//     Default: ["timestamp", "id", "body"]
//     Format: ["context.field:type", "context.field", "field"]
//
//   - order_by (optional): Sorting specification ["column:direction" or "context.field:type:direction"]
//     Direction: "asc" or "desc"
//     Default: ["timestamp:asc", "id:asc"]
//
// Response Headers:
//   - Content-Type: "text/csv" or "application/jsonl"
//   - Content-Encoding: "gzip"
//   - Content-Disposition: "attachment; filename=\"data_exported.[format].gz\""
//   - Cache-Control: "no-cache"
//   - Trailers: X-Total-Bytes, X-Total-Rows, X-Response-Complete
//
// Response Format:
//
//	CSV: Headers in first row, data in subsequent rows
//	JSONL: One JSON object per line
//
// Example Usage:
//
//	Basic CSV export:
//	  GET /api/v1/export?start=1693612800000000000&end=1693699199000000000
//
//	Export with columns and format:
//	  GET /api/v1/export?start=1693612800000000000&end=1693699199000000000&format=jsonl
//	      &columns=timestamp&columns=severity&columns=message
//
//	Export with filter and ordering:
//	  GET /api/v1/export?start=1693612800000000000&end=1693699199000000000
//	      &filter=severity="error"&order_by=timestamp:desc&limit=1000
func (handler *handler) Export(rw http.ResponseWriter, r *http.Request) {
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

	flusher, ok := rw.(http.Flusher)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "export is not supported"))
		return
	}
	flusher.Flush()
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
	rw.Header().Set("Content-Encoding", "gzip")
	rw.Header().Add("Trailer", "X-Total-Bytes, X-Total-Rows, X-Response-Complete")

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
	rw.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"data_exported.%s.gz\"", format))

	filterExpression := queryParams.Get("filter")

	orderByExpression, err := getExportQueryOrderBy(queryParams)
	if err != nil {
		render.Error(rw, err)
		return
	}

	columns, err := getExportQueryColumns(queryParams)
	if err != nil {
		render.Error(rw, err)
		return
	}

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

	gzipWriter := gzip.NewWriter(rw)
	defer gzipWriter.Close()

	// This will signal Export module to stop sending data
	doneChan := make(chan any)
	defer close(doneChan)
	rowChan, errChan := handler.module.Export(r.Context(), orgID, &queryRangeRequest, doneChan)

	switch format {
	case "csv", "":
		csvWriter := csv.NewWriter(gzipWriter)
		err := handler.exportLogsCSV(rowChan, errChan, csvWriter)
		if err != nil {
			render.Error(rw, err)
			return
		}
		csvWriter.Flush()
	case "jsonl":
		err := handler.exportLogsJSONL(rowChan, errChan, gzipWriter)
		if err != nil {
			render.Error(rw, err)
			return
		}
	default:
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid format: must be csv or jsonl"))
	}
}

func (handler *handler) exportLogsCSV(rowChan <-chan *qbtypes.RawRow, errChan <-chan error, csvWriter *csv.Writer) error {
	var header []string

	headerToIndexMapping := make(map[string]int, len(header))

	totalBytes := uint64(0)
	for {
		select {
		case row, ok := <-rowChan:
			if !ok {
				return nil
			}
			if header == nil {
				// Initialize and write header for CSV

				header = constructCSVHeaderFromQueryResponse(row.Data)

				if err := csvWriter.Write(header); err != nil {
					return err
				}

				for i, col := range header {
					headerToIndexMapping[col] = i
				}
			}
			record := constructCSVRecordFromQueryResponse(row.Data, headerToIndexMapping)
			if err := csvWriter.Write(record); err != nil {
				return fmt.Errorf("error writing CSV record: %w", err)
			}

			totalBytes += getsizeOfStringSlice(record)
			if totalBytes > MAX_EXPORT_BYTES_LIMIT {
				return nil
			}
		case err := <-errChan:
			if err != nil {
				return fmt.Errorf("error processing row: %w", err)
			}
		}
	}
}

func (handler *handler) exportLogsJSONL(rowChan <-chan *qbtypes.RawRow, errChan <-chan error, gzipWriter io.Writer) error {

	totalBytes := uint64(0)
	for {
		select {
		case row, ok := <-rowChan:
			if !ok {
				return nil
			}
			// Handle JSON format (JSONL - one object per line)
			jsonBytes, _ := json.Marshal(row.Data)
			totalBytes += uint64(len(jsonBytes)) + 1 // +1 for newline

			if _, err := gzipWriter.Write(jsonBytes); err != nil {
				return fmt.Errorf("error writing JSON: %w", err)
			}
			if _, err := gzipWriter.Write([]byte("\n")); err != nil {
				return fmt.Errorf("error writing JSON newline: %w", err)
			}

			if totalBytes > MAX_EXPORT_BYTES_LIMIT {
				return nil
			}
		case err := <-errChan:
			if err != nil {
				return fmt.Errorf("error processing row: %w", err)
			}
		}
	}
}

func getExportQuerySource(queryParams url.Values) (source string, err error) {
	switch queryParams.Get("source") {
	case "logs", "":
		source = "logs"
	case "metrics":
		source = "metrics"
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "metrics export not yet supported")
	case "traces":
		source = "traces"
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "traces export not yet supported")
	default:
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid source: must be logs, metrics or traces")
	}
	return
}

func getExportQueryFormat(queryParams url.Values) (format string, err error) {
	switch queryParams.Get("format") {
	case "csv", "":
		format = "csv"
	case "jsonl":
		format = "jsonl"
	default:
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid format: must be csv or jsonl")
	}
	return
}

func getExportQueryLimit(queryParams url.Values) (limit int, err error) {

	limitStr := queryParams.Get("limit")
	if limitStr == "" {
		limit = DEFAULT_EXPORT_ROW_COUNT_LIMIT
	} else {
		limit, err = strconv.Atoi(limitStr)
		if err != nil {
			err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid limit format: %s", err.Error())
			return
		}
		if limit <= 0 {
			err = errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be positive")
			return
		}
		if limit > MAX_EXPORT_ROW_COUNT_LIMIT {
			err = errors.NewInvalidInputf(errors.CodeInvalidInput, "limit cannot be more than %d", MAX_EXPORT_ROW_COUNT_LIMIT)
			return
		}
	}
	return
}

func getExportQueryTimeRange(queryParams url.Values) (startTime uint64, endTime uint64, err error) {

	startTimeStr := queryParams.Get("start")
	endTimeStr := queryParams.Get("end")

	if startTimeStr == "" || endTimeStr == "" {
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "start and end time are required")
		return
	}
	startTime, err = strconv.ParseUint(startTimeStr, 10, 64)
	if err != nil {
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start time format: %s", err.Error())
		return
	}
	endTime, err = strconv.ParseUint(endTimeStr, 10, 64)
	if err != nil {
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid end time format: %s", err.Error())
		return
	}
	return
}

func constructCSVHeaderFromQueryResponse(data map[string]any) []string {
	header := make([]string, 0, len(data))
	for key := range data {
		header = append(header, key)
	}
	return header
}

func constructCSVRecordFromQueryResponse(data map[string]any, headerToIndexMapping map[string]int) []string {
	record := make([]string, len(headerToIndexMapping))
	for key, value := range data {
		if index, exists := headerToIndexMapping[key]; exists {
			record[index] = fmt.Sprintf("%v", value)
		}
	}
	return record
}

// getExportQueryColumns parses the "columns" query parameters and returns a slice of TelemetryFieldKey structs.
// Each column should be a valid telemetry field key in the format "context.field:type" or "context.field" or "field"
func getExportQueryColumns(queryParams url.Values) (columns []telemetrytypes.TelemetryFieldKey, err error) {
	columnParams := queryParams["columns"]

	columns = make([]telemetrytypes.TelemetryFieldKey, 0, len(columnParams))

	for _, columnStr := range columnParams {
		// Skip empty strings
		columnStr = strings.TrimSpace(columnStr)
		if columnStr == "" {
			continue
		}

		if err := telemetrytypes.ValidateFieldKeyText(columnStr); err != nil {
			return nil, err
		}

		columns = append(columns, telemetrytypes.GetFieldKeyFromKeyText(columnStr))
	}

	if len(columns) == 0 {
		columns = append(columns, telemetrytypes.TelemetryFieldKey{
			Name: telemetrylogs.LogsV2TimestampColumn,
		})
		columns = append(columns, telemetrytypes.TelemetryFieldKey{
			Name: telemetrylogs.LogsV2IDColumn,
		})
		columns = append(columns, telemetrytypes.TelemetryFieldKey{
			Name: telemetrylogs.LogsV2BodyColumn,
		})
	}

	return columns, nil
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
func getExportQueryOrderBy(queryParams url.Values) (orderBy []qbtypes.OrderBy, err error) {
	orderByParams := queryParams["order_by"]

	orderBy = make([]qbtypes.OrderBy, 0, len(orderByParams))

	for _, orderByStr := range orderByParams {
		// Skip empty strings
		orderByStr = strings.TrimSpace(orderByStr)
		if orderByStr == "" {
			continue
		}

		parts := strings.Split(orderByStr, ":")
		if len(parts) != 2 && len(parts) != 3 {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order_by format: %s", orderByStr)
		}

		column := strings.Join(parts[:len(parts)-1], ":")
		direction := parts[len(parts)-1]

		orderDirection, ok := qbtypes.OrderDirectionMap[direction]
		if !ok {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order_by direction: %s", direction)
		}

		if err := telemetrytypes.ValidateFieldKeyText(column); err != nil {
			return nil, err
		}
		orderByKey := telemetrytypes.GetFieldKeyFromKeyText(column)

		orderBy = append(orderBy, qbtypes.OrderBy{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: orderByKey,
			},
			Direction: orderDirection,
		})
	}
	if len(orderBy) == 0 {
		return []qbtypes.OrderBy{
			{
				Direction: qbtypes.OrderDirectionAsc,
				Key: qbtypes.OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: telemetrylogs.LogsV2TimestampColumn,
					},
				},
			},
			{
				Direction: qbtypes.OrderDirectionAsc,
				Key: qbtypes.OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: telemetrylogs.LogsV2IDColumn,
					},
				},
			},
		}, nil
	}

	return orderBy, nil
}
