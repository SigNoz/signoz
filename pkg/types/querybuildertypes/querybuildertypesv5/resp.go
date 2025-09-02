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

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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
	Message  string                    `json:"message"`
	Url      string                    `json:"url,omitempty"`
	Warnings []QueryWarnDataAdditional `json:"warnings,omitempty"`
}

type QueryWarnDataAdditional struct {
	Message string `json:"message"`
}

type QueryData struct {
	Results []any `json:"results"`
}

type QueryRangeResponse struct {
	Type RequestType `json:"type"`
	Data QueryData   `json:"data"`
	Meta ExecStats   `json:"meta"`

	Warning *QueryWarnData `json:"warning,omitempty"`

	QBEvent *QBEvent `json:"-"`
}

type TimeSeriesData struct {
	QueryName    string               `json:"queryName"`
	Aggregations []*AggregationBucket `json:"aggregations"`
}

type AggregationBucket struct {
	Index int    `json:"index"` // or string Alias
	Alias string `json:"alias"`
	Meta  struct {
		Unit string `json:"unit,omitempty"`
	} `json:"meta,omitempty"`
	Series []*TimeSeries `json:"series"` // no extra nesting

	PredictedSeries  []*TimeSeries `json:"predictedSeries,omitempty"`
	UpperBoundSeries []*TimeSeries `json:"upperBoundSeries,omitempty"`
	LowerBoundSeries []*TimeSeries `json:"lowerBoundSeries,omitempty"`
	AnomalyScores    []*TimeSeries `json:"anomalyScores,omitempty"`
}

type TimeSeries struct {
	Labels []*Label           `json:"labels,omitempty"`
	Values []*TimeSeriesValue `json:"values"`
}

type Label struct {
	Key   telemetrytypes.TelemetryFieldKey `json:"key"`
	Value any                              `json:"value"`
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
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value"`

	// true if the value is "partial", i.e doesn't cover the complete interval.
	// for instance, if the query start time is 3:14:15 PM, and the step is 1 minute,
	// the ts is rounded to 3:14 but the value only covers 3:14:15 PM to 3:15:00 PM
	// this partial result cannot be cached and should be ignored.
	// on the client side, these partial values are rendered differently.
	Partial bool `json:"partial,omitempty"`

	// for the heatmap type chart
	Values []float64 `json:"values,omitempty"`
	Bucket *Bucket   `json:"bucket,omitempty"`
}

type Bucket struct {
	Step float64 `json:"step"`
}

type ColumnType struct {
	valuer.String
}

var (
	// for the group by part of the query
	ColumnTypeGroup = ColumnType{valuer.NewString("group")}
	// for the aggregation part of the query
	ColumnTypeAggregation = ColumnType{valuer.NewString("aggregation")}
)

type ColumnDescriptor struct {
	telemetrytypes.TelemetryFieldKey
	QueryName        string `json:"queryName"`
	AggregationIndex int64  `json:"aggregationIndex"`
	Meta             struct {
		Unit string `json:"unit,omitempty"`
	} `json:"meta,omitempty"`
	Type ColumnType `json:"columnType"`
}

type ScalarData struct {
	QueryName string              `json:"queryName"`
	Columns   []*ColumnDescriptor `json:"columns"`
	Data      [][]any             `json:"data"`
}

type RawData struct {
	QueryName  string    `json:"queryName"`
	NextCursor string    `json:"nextCursor"`
	Rows       []*RawRow `json:"rows"`
}

type RawRow struct {
	Timestamp time.Time      `json:"timestamp"`
	Data      map[string]any `json:"data"`
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
	case reflect.Ptr:
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

	return json.Marshal(&struct {
		*Alias
		Value  any `json:"value"`
		Values any `json:"values,omitempty"`
	}{
		Alias:  (*Alias)(&t),
		Value:  sanitizeValue(t.Value),
		Values: sanitizedValues,
	})
}

func (r RawData) MarshalJSON() ([]byte, error) {
	type Alias RawData
	return json.Marshal((*Alias)(&r))
}
