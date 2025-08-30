package api

import (
	"compress/gzip"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"runtime"
	"runtime/debug"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

const MAX_EXPORT_ROW_COUNT_LIMIT = 50000
const DEFAULT_EXPORT_ROW_COUNT_LIMIT = 10000
const MAX_EXPORT_BYTES_LIMIT = 10 * 1024 * 1024 * 1024 // 10 GB
const CHUNK_SIZE = 1000

func (aH *APIHandler) Export(rw http.ResponseWriter, req *http.Request) {

	queryParams := req.URL.Query()

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

	filterExpression := queryParams.Get("filter")

	selectColumns, err := getExportQueryColumns(queryParams)
	if err != nil {
		render.Error(rw, err)
		return
	}

	source, err := getExportQuerySource(queryParams)
	if err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	flusher, ok := rw.(http.Flusher)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "export is not supported"))
		return
	}

	defer func() {
		if r := recover(); r != nil {
			stackTrace := string(debug.Stack())

			aH.Signoz.Instrumentation.Logger().ErrorContext(req.Context(), "panic in export",
				"error", r,
				"user", claims.UserID,
				"stacktrace", stackTrace,
			)

			render.Error(rw, errors.NewInternalf(
				errors.CodeInternal,
				"Something went wrong on our end. It's not you, it's us. Our team is notified about it. Reach out to support if issue persists.",
			))
		}
	}()

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

	switch source {
	case "logs":
		spec := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Signal: telemetrytypes.SignalLogs,
			Name:   "raw",
			Filter: &qbtypes.Filter{
				Expression: filterExpression,
			},
			Limit:        limit,
			SelectFields: selectColumns,
			Order: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "timestamp",
							Materialized: true,
						},
					},
				},
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "id",
							Materialized: true,
						},
					},
				},
			},
		}

		queryRangeRequest.CompositeQuery.Queries[0].Spec = spec
		err = aH.exportLogs(rw, req, &queryRangeRequest, format)
		if err != nil {
			render.Error(rw, err)
			return
		}

	}

	flusher.Flush()
}

func (aH *APIHandler) exportLogs(rw http.ResponseWriter, req *http.Request, rangeRequest *qbtypes.QueryRangeRequest, format string) error {

	// Set up response headers
	rw.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"data_exported.%s.gz\"", format))
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Content-Encoding", "gzip")

	rw.Header().Add("Trailer", "X-Total-Bytes, X-Total-Rows, X-Response-Complete")

	spec := rangeRequest.CompositeQuery.Queries[0].Spec.(qbtypes.QueryBuilderQuery[qbtypes.LogAggregation])
	rowCountLimit := spec.Limit

	// Set up the gzip writer first
	gzipWriter := gzip.NewWriter(rw)

	// Get claims for querier
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		return err
	}

	// Create orgID
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return err
	}

	var (
		csvWriter *csv.Writer
		encoder   *json.Encoder
	)

	switch format {
	case "csv":
		rw.Header().Set("Content-Type", "text/csv")
		csvWriter = csv.NewWriter(gzipWriter)

	case "jsonl":
		rw.Header().Set("Content-Type", "application/x-ndjson")
		encoder = json.NewEncoder(gzipWriter)
		encoder.SetEscapeHTML(false)
	}

	rowChan := make(chan *qbtypes.RawRow, runtime.NumCPU())
	errChan := make(chan error, 1)
	doneChan := make(chan any)

	go func() {
		defer close(doneChan)

		var header []string

		headerToIndexMapping := make(map[string]int, len(header))

		for row := range rowChan {
			switch format {
			case "csv":
				if header == nil {
					// Initialize and write header for CSV

					header = constructCSVHeaderFromQueryResponse(row.Data)

					if err := csvWriter.Write(header); err != nil {
						errChan <- fmt.Errorf("error writing CSV header: %w", err)
						return
					}

					for i, col := range header {
						headerToIndexMapping[col] = i
					}
				}
				record := constructCSVRecordFromQueryResponse(row.Data, headerToIndexMapping)

				if err := csvWriter.Write(record); err != nil {
					errChan <- fmt.Errorf("error writing CSV record: %w", err)
					return
				}
			case "jsonl":
				// Handle JSON format (JSONL - one object per line)
				if err := encoder.Encode(row.Data); err != nil {
					errChan <- fmt.Errorf("error encoding JSON: %w", err)
					return
				}
			}
		}

		if csvWriter != nil {
			csvWriter.Flush()
			if err := csvWriter.Error(); err != nil {
				errChan <- fmt.Errorf("error flushing CSV writer: %w", err)
				return
			}
		}

		if gzipWriter != nil {
			if err := gzipWriter.Flush(); err != nil {
				errChan <- fmt.Errorf("error flushing gzip writer: %w", err)
				return
			}
			if err := gzipWriter.Close(); err != nil {
				errChan <- fmt.Errorf("error closing gzip writer: %w", err)
				return
			}
		}

	}()

	totalBytes := uint64(0)
	rowCount := 0

	cursor := ""
	for rowCount < rowCountLimit && totalBytes < MAX_EXPORT_BYTES_LIMIT {
		spec.Limit = min(CHUNK_SIZE, rowCountLimit-rowCount)
		rangeRequest.CompositeQuery.Queries[0].Spec = spec

		if cursor != "" {
			spec.Cursor = cursor
		}

		response, err := aH.Signoz.Querier.QueryRange(req.Context(), orgID, rangeRequest)
		if err != nil {
			errChan <- err
			break
		}

		for _, result := range response.Data.Results {
			resultData, ok := result.(*qbtypes.RawData)
			if !ok {
				return errors.NewInvalidInputf(errors.CodeInvalidInput, "expected RawData, got %T", result)
			}

			cursor = resultData.NextCursor

			for _, row := range resultData.Rows {
				select {
				case rowChan <- row:
				case <-req.Context().Done():
					return req.Context().Err()
				}
			}

			rowCount += len(resultData.Rows)
		}
		totalBytes += response.Meta.BytesScanned

	}
	rw.Header().Set("X-Total-Rows", strconv.Itoa(rowCount))
	rw.Header().Set("X-Total-Bytes", strconv.FormatUint(totalBytes, 10))
	rw.Header().Set("X-Response-Complete", strconv.FormatBool(rowCount < rowCountLimit))
	close(rowChan)

	// Wait for completion or error
	select {
	case err := <-errChan:
		return err
	case <-doneChan:
		// gzipWriter.Close()
		return nil
	case <-req.Context().Done():
		return req.Context().Err()
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
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid format: must be csv or json")
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
		err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start time format: %s", err.Error())
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

func getExportQueryColumns(queryParams url.Values) (columns []telemetrytypes.TelemetryFieldKey, err error) {
	columnParams := queryParams["columns"]
	if len(columnParams) == 0 {
		return nil, nil
	}

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

	return columns, nil
}
