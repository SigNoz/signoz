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
	"sync"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
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
// Endpoint: GET /api/v1/export_raw_data - logs and traces only (simple queries via query params)
// Endpoint: POST /api/v1/export_raw_data - logs, traces, and trace operator (full QueryRangeRequest in JSON body)
//
// GET: Converts query params to QueryRangeRequest and delegates to common export logic. No composite_query/trace operator.
//
// GET Query Parameters:
//
//   - source (optional): ["logs" (default) or "traces"] - metrics not supported
//   - format (optional): Output format ["csv" (default), "jsonl"]
//   - start (required): Start time (Unix timestamp in nanoseconds)
//   - end (required): End time (Unix timestamp in nanoseconds)
//   - limit (optional): Max rows to export (cannot exceed MAX_EXPORT_ROW_COUNT_LIMIT)
//   - filter (optional): Filter expression
//   - columns (optional): Columns to include
//   - order_by (optional): Sorting ["column:direction"]
//
// POST Request Body (QueryRangeRequest):
//
//   - Accepts a full QueryRangeRequest JSON body with composite_query containing QueryEnvelope array
//   - Supports builder_query and builder_trace_operator types
//   - format query param still controls output format
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
//
//	Export with composite query (POST only):
//	  POST /api/v1/export_raw_data?format=csv
//	  Body: {"start":1693612800000000000,"end":1693699199000000000,"composite_query":{"queries":[...]}}
func (handler *handler) ExportRawData(rw http.ResponseWriter, r *http.Request) {
	var queryRangeRequest qbtypes.QueryRangeRequest
	if r.Method == http.MethodGet {
		var err error
		queryRangeRequest, err = getQueryRangeRequestFromQueryParams(r)
		if err != nil {
			render.Error(rw, err)
			return
		}
	} else {
		if err := json.NewDecoder(r.Body).Decode(&queryRangeRequest); err != nil {
			render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid request body: %v", err))
			return
		}
	}

	if err := validateAndApplyExportLimits(&queryRangeRequest); err != nil {
		render.Error(rw, err)
		return
	}

	format, err := getExportQueryFormat(r.URL.Query())
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

	setExportResponseHeaders(rw, format)

	doneChan := make(chan any)
	defer close(doneChan)
	rowChan, errChan := handler.module.ExportRawData(r.Context(), orgID, &queryRangeRequest, doneChan)

	isComplete, err := handler.executeExport(rowChan, errChan, format, rw)
	if err != nil {
		render.Error(rw, err)
		return
	}
	rw.Header().Set("X-Response-Complete", strconv.FormatBool(isComplete))
}

// validateAndApplyExportLimits validates query types and applies default/max limits to all queries.
func validateAndApplyExportLimits(req *qbtypes.QueryRangeRequest) error {
	isTraceOperatorQueryPresent := false
	traceOperatorQueryIndex := -1

	// Check if the trace operator query is present
	queries := req.CompositeQuery.Queries
	for idx := range len(queries) {
		if _, ok := queries[idx].Spec.(qbtypes.QueryBuilderTraceOperator); ok {
			isTraceOperatorQueryPresent = true
			traceOperatorQueryIndex = idx
			break
		}
	}

	// If the trace operator query is present, mark the queries other than trace operator as disabled
	if isTraceOperatorQueryPresent {
		for idx := range len(queries) {
			if idx != traceOperatorQueryIndex {
				queries[idx].SetDisabled(true)
			}
		}
	}

	// If the trace operator query is not present, and there are multiple queries, return an error
	if !isTraceOperatorQueryPresent && len(queries) > 1 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "multiple queries not allowed without a trace operator query")
	}

	for idx := range queries {
		switch spec := queries[idx].Spec.(type) {
		case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
			qbtypes.QueryBuilderTraceOperator:
			limit, err := validateExportLimitValue(queries[idx].GetLimit())
			if err != nil {
				return err
			}
			queries[idx].SetLimit(limit)
		default:
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type: %T", spec)
		}
	}
	return nil
}

// getQueryRangeRequestFromQueryParams builds a QueryRangeRequest from GET query parameters.
func getQueryRangeRequestFromQueryParams(r *http.Request) (qbtypes.QueryRangeRequest, error) {
	queryParams := r.URL.Query()

	source, err := getExportQuerySource(queryParams)
	if err != nil {
		return qbtypes.QueryRangeRequest{}, err
	}

	startTime, endTime, err := getExportQueryTimeRange(queryParams)
	if err != nil {
		return qbtypes.QueryRangeRequest{}, err
	}

	limit, err := getExportQueryLimit(queryParams)
	if err != nil {
		return qbtypes.QueryRangeRequest{}, err
	}

	columns := getExportQueryColumns(queryParams)

	orderBy, err := getExportQueryOrderBy(queryParams)
	if err != nil {
		return qbtypes.QueryRangeRequest{}, err
	}

	var filter *qbtypes.Filter
	if filterExpr := queryParams.Get("filter"); filterExpr != "" {
		filter = &qbtypes.Filter{Expression: filterExpr}
	}

	var query qbtypes.QueryEnvelope
	switch source {
	case "logs":
		query = qbtypes.QueryEnvelope{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				Filter:       filter,
				Limit:        limit,
				Order:        orderBy,
				SelectFields: columns,
			},
		}
	case "traces":
		query = qbtypes.QueryEnvelope{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				Filter:       filter,
				Limit:        limit,
				Order:        orderBy,
				SelectFields: columns,
			},
		}
	}

	return qbtypes.QueryRangeRequest{
		Start:       startTime,
		End:         endTime,
		RequestType: qbtypes.RequestTypeRaw,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{query},
		},
	}, nil
}

// setExportResponseHeaders sets common HTTP headers for export responses.
func setExportResponseHeaders(rw http.ResponseWriter, format string) {
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Vary", "Accept-Encoding")
	rw.Header().Set("Access-Control-Expose-Headers", "Content-Disposition, X-Response-Complete")
	rw.Header().Set("Trailer", "X-Response-Complete")
	rw.Header().Set("Transfer-Encoding", "chunked")
	filename := fmt.Sprintf("data_exported_%s.%s", time.Now().Format("2006-01-02_150405"), format)
	rw.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
}

// executeExport streams data from rowChan to the response writer in the specified format.
func (handler *handler) executeExport(rowChan <-chan *qbtypes.RawRow, errChan <-chan error, format string, rw http.ResponseWriter) (bool, error) {
	switch format {
	case "csv", "":
		rw.Header().Set("Content-Type", "text/csv")
		csvWriter := csv.NewWriter(rw)
		isComplete, err := handler.exportRawDataCSV(rowChan, errChan, csvWriter)
		if err != nil {
			return false, err
		}
		csvWriter.Flush()
		return isComplete, nil
	case "jsonl":
		rw.Header().Set("Content-Type", "application/x-ndjson")
		return handler.exportRawDataJSONL(rowChan, errChan, rw)
	default:
		return false, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid format: must be csv or jsonl")
	}
}

// exportRawDataCSV is a generic CSV export function that works with any raw data (logs, traces, etc.)
func (handler *handler) exportRawDataCSV(rowChan <-chan *qbtypes.RawRow, errChan <-chan error, csvWriter *csv.Writer) (bool, error) {

	headerToIndexMapping := make(map[string]int)
	var once sync.Once

	totalBytes := uint64(0)
	for {
		select {
		case row, ok := <-rowChan:
			if !ok {
				return true, nil
			}
			once.Do(func() {
				header := constructCSVHeaderFromQueryResponse(row.Data)
				_ = csvWriter.Write(header)
				// We ignore the error here, as it will get caught in the next iteration
				for i, col := range header {
					headerToIndexMapping[col] = i
				}
			})
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

// exportRawDataJSONL is a generic JSONL export function that works with any raw data (logs, traces, etc.)
func (handler *handler) exportRawDataJSONL(rowChan <-chan *qbtypes.RawRow, errChan <-chan error, writer io.Writer) (bool, error) {
	totalBytes := uint64(0)
	for {
		select {
		case row, ok := <-rowChan:
			if !ok {
				return true, nil
			}
			jsonBytes, err := json.Marshal(row.Data)
			if err != nil {
				return false, errors.NewUnexpectedf(errors.CodeInternal, "error marshaling JSON: %s", err)
			}
			totalBytes += uint64(len(jsonBytes)) + 1

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
		return "traces", nil
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
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid limit format: %s", err.Error())
	}
	return validateExportLimitValue(limit)
}

// validateExportLimitValue validates a limit value for export queries.
// Returns DefaultExportRowCountLimit when limit is 0, or an error if limit exceeds MaxExportRowCountLimit.
func validateExportLimitValue(limit int) (int, error) {
	if limit == 0 {
		return DefaultExportRowCountLimit, nil
	}
	if limit < 0 {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be positive")
	}
	if limit > MaxExportRowCountLimit {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "limit cannot be more than %d", MaxExportRowCountLimit)
	}
	return limit, nil
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
				jsonBytes, err := json.Marshal(v)
				if err != nil {
					valueStr = fmt.Sprintf("%v", v)
				} else {
					valueStr = string(jsonBytes)
				}
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
		return []qbtypes.OrderBy{}, nil
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

	return []qbtypes.OrderBy{
		{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: orderByKey,
			},
			Direction: orderDirection,
		},
	}, nil
}
