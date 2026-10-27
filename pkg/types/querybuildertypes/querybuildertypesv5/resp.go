package querybuildertypesv5

import (
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/swaggest/jsonschema-go"
)

type QBEvent struct {
	Version         string `json:"version"`
	LogsUsed        bool   `json:"logs_used,omitempty"`
	MetricsUsed     bool   `json:"metrics_used,omitempty"`
	TracesUsed      bool   `json:"traces_used,omitempty"`
	Source          string `json:"source,omitempty"`
	FilterApplied   bool   `json:"filter_applied,omitempty"`
	GroupByApplied  bool   `json:"group_by_applied,omitempty"`
	QueryType       string `json:"query_type,omitempty"`
	PanelType       string `json:"panel_type,omitempty"`
	NumberOfQueries int    `json:"number_of_queries,omitempty"`
	HasData         bool   `json:"-"`
}

type QueryWarnData struct {
	Message  string                    `json:"message" description:"A summary of the warnings raised while executing the request."`
	Url      string                    `json:"url,omitempty" description:"A documentation link explaining the warnings."`
	Warnings []QueryWarnDataAdditional `json:"warnings,omitempty" description:"The individual warnings."`
}

type QueryWarnDataAdditional struct {
	Message string `json:"message" description:"The warning text."`
}

type QueryData struct {
	Results []any `json:"results" description:"One result per enabled query, typed by the request type: TimeSeriesData for time_series, ScalarData for scalar and RawData for raw requests."`
}

var _ jsonschema.OneOfExposer = QueryData{}

// JSONSchemaOneOf documents the polymorphic result types in QueryData.Results.
func (QueryData) JSONSchemaOneOf() []any {
	return []any{
		TimeSeriesData{},
		ScalarData{},
		RawData{},
	}
}

type QueryRangeResponse struct {
	Type RequestType `json:"type" description:"The request type the results are shaped for, echoed from the request."`
	Data QueryData   `json:"data" description:"The query results."`
	Meta ExecStats   `json:"meta" description:"Execution statistics for the whole request: a rough measure of how expensive the query was. Use the results, not these numbers, to decide whether data exists; an empty result can still scan many rows."`

	Warning *QueryWarnData `json:"warning,omitempty" description:"Warnings raised while executing the request, if any."`

	QBEvent *QBEvent `json:"-"`
}

// QueryRangePreviewResponse is the dry-run output: one QueryPreview per query,
// keyed by the request's query names.
type QueryRangePreviewResponse struct {
	CompositeQuery map[string]QueryPreview `json:"compositeQuery" required:"true" nullable:"true" description:"The rendered statements for each query, keyed by query name."`
}

// QueryRangePreviewOptions carries per-call options for the dry-run endpoint.
type QueryRangePreviewOptions struct {
	Verbose bool
}

// QueryRangePreviewParams are the query-string parameters of the dry-run endpoint.
type QueryRangePreviewParams struct {
	Verbose string `query:"verbose"`
}

// PrepareJSONSchema adds description to the QueryRangePreviewResponse schema.
func (q *QueryRangePreviewResponse) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Response from the v5 query range preview (dry-run) endpoint. For each query in the composite query, returns the underlying ClickHouse statement(s) it renders to without executing them (one per PromQL metric selector; exactly one for builder/ClickHouse/trace-operator queries), with the optional EXPLAIN ESTIMATE and granule analysis attached per statement when requested.")
	return nil
}

// QueryPreview is the dry-run result for a single query.
type QueryPreview struct {
	Valid      bool               `json:"valid" required:"true" nullable:"false" description:"Whether the query rendered without error."`
	Error      error              `json:"error" required:"true" description:"The rendering error when valid is false, otherwise null."`
	Warnings   []string           `json:"warnings" required:"true" nullable:"false" description:"Warnings raised while rendering the query."`
	Statements []PreviewStatement `json:"statements" required:"true" nullable:"false" description:"The rendered statements, returned only when verbose is true: one per PromQL metric selector, one for builder, ClickHouse SQL and trace operator queries, none for formulas. Empty otherwise."`
}

// PreviewStatement is one rendered ClickHouse statement with its args and, when
// requested, its EXPLAIN ESTIMATE and granule breakdown. The query/args JSON
// keys follow the OpenTelemetry db.statement.* convention.
type PreviewStatement struct {
	Query    string                              `json:"db.statement.query" required:"true" nullable:"false" description:"The ClickHouse SQL statement with positional parameter placeholders."`
	Args     []any                               `json:"db.statement.args" required:"true" nullable:"false" description:"The values bound to the statement placeholders, in order."`
	Estimate []telemetrystoretypes.EstimateEntry `json:"estimate" required:"true" nullable:"false" description:"The EXPLAIN ESTIMATE rows for the statement; empty unless verbose was requested."`
	Granules *telemetrystoretypes.Granules       `json:"granules" required:"true" nullable:"true" description:"The granule analysis for the statement; null unless verbose was requested."`
}

// MarshalJSON renders Error in its structured form (code/message/suggestions)
// rather than the empty object a bare error produces. The nullable:"false"
// arrays are non-nil from the producer, so they marshal as [] rather than null.
func (p QueryPreview) MarshalJSON() ([]byte, error) {
	type alias QueryPreview
	out := struct {
		alias
		Error *errors.JSON `json:"error"`
	}{alias: alias(p)}
	out.alias.Error = nil
	// Derive the verdict so the two can't desync.
	out.Valid = p.Error == nil
	if p.Error != nil {
		out.Error = errors.AsJSON(p.Error)
	}
	return json.Marshal(out)
}

var _ jsonschema.Preparer = &QueryRangeResponse{}

// PrepareJSONSchema adds description to the QueryRangeResponse schema.
func (q *QueryRangeResponse) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Response from the v5 query range endpoint. The data.results array contains typed results depending on the requestType: TimeSeriesData for time_series, ScalarData for scalar, or RawData for raw requests.")
	return nil
}

type TimeSeriesData struct {
	QueryName    string               `json:"queryName" description:"The name of the query that produced this result."`
	Aggregations []*AggregationBucket `json:"aggregations" description:"One bucket per aggregation of the query. The order is not guaranteed; match buckets to aggregations by index."`
}

type AggregationBucket struct {
	Index  int             `json:"index" description:"The zero-based position of the aggregation in the query."`
	Alias  string          `json:"alias" description:"The alias of the aggregation, or the internal name __result_N, with N its index, when no alias was given."`
	Meta   AggregationMeta `json:"meta,omitempty" description:"Display metadata for the aggregation."`
	Series []*TimeSeries   `json:"series" description:"One series per group-by combination."`

	PredictedSeries  []*TimeSeries `json:"predictedSeries,omitempty" description:"The predicted values per series; present only when the anomaly function is applied."`
	UpperBoundSeries []*TimeSeries `json:"upperBoundSeries,omitempty" description:"The upper bound of the expected range per series; present only when the anomaly function is applied."`
	LowerBoundSeries []*TimeSeries `json:"lowerBoundSeries,omitempty" description:"The lower bound of the expected range per series; present only when the anomaly function is applied."`
	AnomalyScores    []*TimeSeries `json:"anomalyScores,omitempty" description:"The anomaly score per series; present only when the anomaly function is applied."`
}

// ReindexValuesToNewUpperBounds moves each count to the index its upper bound
// holds in onto, a superset of Meta.Buckets. No count changes, only its position
// in Values.
func (a *AggregationBucket) ReindexValuesToNewUpperBounds(onto []float64) {
	if a == nil {
		return
	}

	from := a.Meta.Buckets
	if len(onto) == 0 || slices.Equal(from, onto) {
		return
	}

	upperBoundToIndex := make(map[float64]int, len(onto))
	for index, upperBound := range onto {
		upperBoundToIndex[upperBound] = index
	}

	for _, series := range a.Series {
		for _, point := range series.Values {
			if len(point.Values) == 0 {
				continue
			}
			reindexed := make([]float64, len(onto)+1)
			for index, count := range point.Values {
				if index >= len(from) {
					reindexed[len(onto)] = count
					break
				}
				if newIndex, ok := upperBoundToIndex[from[index]]; ok {
					reindexed[newIndex] = count
				}
			}
			point.Values = reindexed
		}
	}

	a.Meta.Buckets = onto
}

// TrimAxisToCountedBuckets drops the buckets at either end of Meta.Buckets that hold
// no counts, since an axis runs from the lowest value in the window to the highest.
// Call it only when the buckets were chosen from the values. A histogram's `le`
// buckets are fixed, so an empty one of those still has to stay on the axis.
func (a *AggregationBucket) TrimAxisToCountedBuckets() {
	if a == nil || len(a.Meta.Buckets) == 0 {
		return
	}

	lowestCounted, highestCounted := len(a.Meta.Buckets), -1
	for _, series := range a.Series {
		for _, point := range series.Values {
			for slot := 0; slot < len(a.Meta.Buckets) && slot < len(point.Values); slot++ {
				if point.Values[slot] != 0 {
					lowestCounted = min(lowestCounted, slot)
					highestCounted = max(highestCounted, slot)
				}
			}
		}
	}
	if highestCounted < 0 {
		return
	}

	if lowestCounted == 0 && highestCounted == len(a.Meta.Buckets)-1 {
		return
	}

	trimmed := a.Meta.Buckets[lowestCounted : highestCounted+1]
	for _, series := range a.Series {
		for _, point := range series.Values {
			if len(point.Values) == 0 {
				continue
			}
			counts := make([]float64, len(trimmed)+1)
			for slot, count := range point.Values {
				counts[min(max(slot-lowestCounted, 0), len(trimmed))] += count
			}
			point.Values = counts
		}
	}

	a.Meta.Buckets = trimmed
}

type AggregationMeta struct {
	Unit    string    `json:"unit,omitempty" description:"The unit of the aggregated values, taken from metric metadata when known."`
	Buckets []float64 `json:"buckets,omitempty" description:"The ascending upper bounds of the value bands, set only for heatmap results; each point then carries one count per bound plus a trailing overflow count in values."`
}

type TimeSeries struct {
	Labels []*Label           `json:"labels,omitempty" description:"The group-by field values that identify this series."`
	Values []*TimeSeriesValue `json:"values" description:"The data points of the series in ascending timestamp order."`
}

// EvaluableValues returns only the values where Partial is false and value is not NaN or +/- Inf.
// TODO(srikanthccv): should we skip them in the consume.go?
func (ts *TimeSeries) EvaluableValues() []*TimeSeriesValue {
	if ts == nil {
		return nil
	}
	result := make([]*TimeSeriesValue, 0, len(ts.Values))
	for _, v := range ts.Values {
		if !v.Partial && !math.IsNaN(v.Value) && !math.IsInf(v.Value, 0) {
			result = append(result, v)
		}
	}
	return result
}

type Label struct {
	Key   telemetrytypes.TelemetryFieldKey `json:"key" description:"The group-by field this label value belongs to."`
	Value any                              `json:"value" description:"The label value as a string, number or boolean."`
}

var _ jsonschema.Preparer = Label{}

// PrepareJSONSchema types `value` as a string/number/bool scalar instead of an
// untyped {}. The Go field stays `any`; this only shapes the generated schema.
func (Label) PrepareJSONSchema(s *jsonschema.Schema) error {
	if _, ok := s.Properties["value"]; !ok {
		return nil
	}

	value := jsonschema.Schema{}
	value.Description = propertyDescription(s, "value")
	value.OneOf = []jsonschema.SchemaOrBool{
		jsonschema.String.ToSchemaOrBool(),
		jsonschema.Number.ToSchemaOrBool(),
		jsonschema.Boolean.ToSchemaOrBool(),
	}
	s.Properties["value"] = value.ToSchemaOrBool()

	return nil
}

func GetUniqueSeriesKey(labels []*Label) string {
	// Fast path for common cases
	if len(labels) == 0 {
		return ""
	}
	if len(labels) == 1 {
		return fmt.Sprintf("%s=%v,", labels[0].Key.Name, labels[0].Value)
	}

	// Use a map to collect labels for consistent ordering without copying
	labelMap := make(map[string]string, len(labels))
	keys := make([]string, 0, len(labels))

	// Estimate total size for string builder
	estimatedSize := 0
	for _, label := range labels {
		if _, exists := labelMap[label.Key.Name]; !exists {
			keys = append(keys, label.Key.Name)
			estimatedSize += len(label.Key.Name) + 2 // key + '=' + ','
		}
		// get the value as string
		value, ok := label.Value.(string)
		if !ok {
			value = fmt.Sprintf("%v", label.Value)
		}
		estimatedSize += len(value)

		labelMap[label.Key.Name] = value
	}

	// Sort just the keys
	slices.Sort(keys)

	// Build the key using sorted keys with better size estimation
	var key strings.Builder
	key.Grow(estimatedSize)

	for _, k := range keys {
		key.WriteString(k)
		key.WriteByte('=')
		key.WriteString(labelMap[k])
		key.WriteByte(',')
	}

	return key.String()
}

type TimeSeriesValue struct {
	Timestamp int64   `json:"timestamp" description:"The start of the step as a Unix timestamp in milliseconds."`
	Value     float64 `json:"value" description:"The aggregated value for the step; omitted for heatmap results, which use values."`

	Partial bool `json:"partial,omitempty" description:"True when the step is only partly covered by the requested time range, so the value is incomplete."`

	Values []float64 `json:"values,omitempty" description:"The per-band counts for heatmap results, in the order of meta.buckets plus a trailing overflow count."`
}

type ColumnType struct {
	valuer.String
}

var (
	// for the group by part of the query.
	ColumnTypeGroup = ColumnType{valuer.NewString("group")}
	// for the aggregation part of the query.
	ColumnTypeAggregation = ColumnType{valuer.NewString("aggregation")}
)

// Enum returns the acceptable values for ColumnType.
func (ColumnType) Enum() []any {
	return []any{
		ColumnTypeGroup,
		ColumnTypeAggregation,
	}
}

type ColumnDescriptor struct {
	telemetrytypes.TelemetryFieldKey
	QueryName        string `json:"queryName" description:"The name of the query that produced the column."`
	AggregationIndex int64  `json:"aggregationIndex" description:"The zero-based position of the aggregation in the query for aggregation columns."`
	Meta             struct {
		Unit string `json:"unit,omitempty" description:"The unit of the column values when known."`
	} `json:"meta,omitempty" description:"Display metadata for the column."`
	Type ColumnType `json:"columnType" description:"Whether the column is a group-by field (group) or an aggregated value (aggregation)."`
}

type ScalarData struct {
	QueryName string              `json:"queryName" description:"The name of the query that produced this table."`
	Columns   []*ColumnDescriptor `json:"columns" description:"The column definitions, in the same order as the values in each data row."`
	Data      [][]any             `json:"data" description:"The rows, each a list of values aligned with columns."`
}

type RawData struct {
	QueryName  string    `json:"queryName" description:"The name of the query that produced these rows."`
	NextCursor string    `json:"nextCursor" description:"The cursor to pass in the next request to continue from the last row; empty when there are no more rows."`
	Rows       []*RawRow `json:"rows" description:"The matching records in the requested order."`
}

type RawRow struct {
	Timestamp time.Time      `json:"timestamp" description:"The record timestamp in RFC 3339 format."`
	Data      map[string]any `json:"data" description:"The selected field values keyed by field name."`
}

type RawStream struct {
	Name  string
	Logs  chan *RawRow
	Done  chan *bool
	Error chan error
}

func roundToNonZeroDecimals(val float64, n int) float64 {
	if val == 0 || math.IsNaN(val) || math.IsInf(val, 0) {
		return val
	}

	absVal := math.Abs(val)

	// For numbers >= 1, we want to round to n decimal places total
	if absVal >= 1 {
		// Round to n decimal places
		multiplier := math.Pow(10, float64(n))
		rounded := math.Round(val*multiplier) / multiplier
		if math.IsInf(rounded, 0) {
			// val*multiplier overflowed for near-max float64 values; the
			// finite input must stay finite or the JSON encoder rejects it.
			return val
		}

		// If the result is a whole number, return it as such
		if rounded == math.Trunc(rounded) {
			return rounded
		}

		// Remove trailing zeros by converting to string and back
		str := strconv.FormatFloat(rounded, 'f', -1, 64)
		result, _ := strconv.ParseFloat(str, 64)
		return result
	}

	// For numbers < 1, count n significant figures after first non-zero digit
	order := math.Floor(math.Log10(absVal))
	scale := math.Pow(10, -order+float64(n)-1)
	rounded := math.Round(val*scale) / scale
	if math.IsNaN(rounded) || math.IsInf(rounded, 0) {
		// scale overflowed for subnormal values (order below ~-308); the
		// finite input must stay finite or it serializes as "NaN".
		return val
	}

	// Clean up floating point precision
	str := strconv.FormatFloat(rounded, 'f', -1, 64)
	result, _ := strconv.ParseFloat(str, 64)
	return result
}

func sanitizeValue(v any) any {
	if v == nil {
		return nil
	}

	if f, ok := v.(float64); ok {
		if math.IsNaN(f) {
			return "NaN"
		} else if math.IsInf(f, 1) {
			return "Inf"
		} else if math.IsInf(f, -1) {
			return "-Inf"
		}
		return roundToNonZeroDecimals(f, 3)
	}

	if f, ok := v.(float32); ok {
		f64 := float64(f)
		if math.IsNaN(f64) {
			return "NaN"
		} else if math.IsInf(f64, 1) {
			return "Inf"
		} else if math.IsInf(f64, -1) {
			return "-Inf"
		}
		return float32(roundToNonZeroDecimals(f64, 3)) // ADD ROUNDING HERE
	}

	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Slice:
		result := make([]any, rv.Len())
		for i := 0; i < rv.Len(); i++ {
			result[i] = sanitizeValue(rv.Index(i).Interface())
		}
		return result
	case reflect.Map:
		result := make(map[string]any)
		for _, key := range rv.MapKeys() {
			keyStr := key.String()
			result[keyStr] = sanitizeValue(rv.MapIndex(key).Interface())
		}
		return result
	case reflect.Pointer:
		if rv.IsNil() {
			return nil
		}
		return sanitizeValue(rv.Elem().Interface())
	case reflect.Struct:
		return v
	default:
		return v
	}
}

func (q QueryRangeResponse) MarshalJSON() ([]byte, error) {
	type Alias QueryRangeResponse
	return json.Marshal(&struct {
		*Alias
		Data any `json:"data"`
	}{
		Alias: (*Alias)(&q),
		Data:  sanitizeValue(q.Data),
	})
}

func (s ScalarData) MarshalJSON() ([]byte, error) {
	type Alias ScalarData
	sanitizedData := make([][]any, len(s.Data))
	for i, row := range s.Data {
		sanitizedData[i] = make([]any, len(row))
		for j, val := range row {
			sanitizedData[i][j] = sanitizeValue(val)
		}
	}

	return json.Marshal(&struct {
		*Alias
		Data [][]any `json:"data"`
	}{
		Alias: (*Alias)(&s),
		Data:  sanitizedData,
	})
}

func (r RawRow) MarshalJSON() ([]byte, error) {
	type Alias RawRow
	sanitizedData := make(map[string]any)
	for k, v := range r.Data {
		sanitizedData[k] = sanitizeValue(v)
	}

	var timestamp *time.Time
	if !r.Timestamp.IsZero() {
		timestamp = &r.Timestamp
	}

	return json.Marshal(&struct {
		*Alias
		Data      map[string]any `json:"data"`
		Timestamp *time.Time     `json:"timestamp,omitempty"`
	}{
		Alias:     (*Alias)(&r),
		Data:      sanitizedData,
		Timestamp: timestamp,
	})
}

func (t TimeSeriesValue) MarshalJSON() ([]byte, error) {
	type Alias TimeSeriesValue

	var sanitizedValues any
	if t.Values != nil {
		sanitizedValues = sanitizeValue(t.Values)
		// If original was empty slice, ensure we return empty slice not nil
		if len(t.Values) == 0 {
			sanitizedValues = []any{}
		}
	}

	// a heatmap point's counts are spread across Values, so there is no one
	// number Value could carry
	var sanitizedValue any
	if t.Values == nil {
		sanitizedValue = sanitizeValue(t.Value)
	}

	return json.Marshal(&struct {
		*Alias
		Value  any `json:"value,omitempty"`
		Values any `json:"values,omitempty"`
	}{
		Alias:  (*Alias)(&t),
		Value:  sanitizedValue,
		Values: sanitizedValues,
	})
}

func (r RawData) MarshalJSON() ([]byte, error) {
	type Alias RawData
	return json.Marshal((*Alias)(&r))
}
