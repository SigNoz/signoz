package implrawdataexport

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strconv"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/exporttypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	module rawdataexport.Module
}

func NewHandler(module rawdataexport.Module) rawdataexport.Handler {
	return &handler{module: module}
}

func (handler *handler) ExportRawData(rw http.ResponseWriter, r *http.Request) {
	var queryRangeRequest qbtypes.QueryRangeRequest

	var formatParam exporttypes.ExportRawDataFormatQueryParam
	if err := binding.Query.BindQuery(r.URL.Query(), &formatParam); err != nil {
		render.Error(rw, err)
		return
	}
	format := formatParam.Format
	if err := binding.JSON.BindBody(r.Body, &queryRangeRequest); err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}

	if err := validateSpecForExport(&queryRangeRequest); err != nil {
		render.Error(rw, err)
		return
	}

	if err := validateAndApplyDefaultExportLimits(queryRangeRequest.CompositeQuery.Queries); err != nil {
		render.Error(rw, err)
		return
	}

	queryRangeRequest.UseDefaultOrderBy()

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

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

// validateSpecForExport validates query specs
func validateSpecForExport(req *qbtypes.QueryRangeRequest) error {

	queries := req.CompositeQuery.Queries

	// If the trace operator query is not present, and there are multiple queries, return an error
	if req.TraceOperatorQueryIndex() == -1 && len(queries) > 1 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "multiple queries not allowed without a trace operator query")
	}

	for idx := range queries {
		switch spec := queries[idx].Spec.(type) {
		case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
			qbtypes.QueryBuilderTraceOperator:
			// Supported spec types
		default:
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query at index %d type: %T", idx, spec)
		}
	}

	opts := append(qbtypes.GetValidationOptions(req.RequestType), qbtypes.WithSkipLimitOffsetValidation())
	return req.Validate(opts...)
}

func validateAndApplyDefaultExportLimits(queries []qbtypes.QueryEnvelope) error {
	for idx := range queries {
		limit := queries[idx].GetLimit()
		if limit == 0 {
			limit = DefaultExportRowCountLimit
		} else if limit < 0 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be positive")
		} else if limit > MaxExportRowCountLimit {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit cannot be more than %d", MaxExportRowCountLimit)
		}
		queries[idx].SetLimit(limit)
	}
	return nil
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

	var header []string
	headerToIndexMapping := make(map[string]int)

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

// priorityColumns defines the columns that should appear first in the CSV output, in order.
var priorityColumns = []string{"timestamp", "id"}

func constructCSVHeaderFromQueryResponse(data map[string]any) []string {
	header := make([]string, 0, len(data))
	for key := range data {
		header = append(header, key)
	}
	// This is to ensure CSV output is consistent across multiple queries
	slices.SortFunc(header, func(a, b string) int {
		ai, bi := slices.Index(priorityColumns, a), slices.Index(priorityColumns, b)
		switch {
		case ai != -1 && bi != -1:
			return ai - bi
		case ai != -1:
			return -1
		case bi != -1:
			return 1
		default:
			if a < b {
				return -1
			} else if a > b {
				return 1
			}
			return 0
		}
	})
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

func getsizeOfStringSlice(slice []string) uint64 {
	var totalBytes uint64
	for _, str := range slice {
		totalBytes += uint64(len(str))
	}
	return totalBytes
}
