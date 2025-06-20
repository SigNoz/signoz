package querybuildertypesv5

import (
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type QueryRangeResponse struct {
	Type RequestType `json:"type"`
	Data any         `json:"data"`
	Meta ExecStats   `json:"meta"`
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
	Timestamp time.Time       `json:"timestamp"`
	Data      map[string]*any `json:"data"`
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
		return f
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
		return f
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
	sanitizedData := make(map[string]*any)
	for k, v := range r.Data {
		if v != nil {
			sanitized := sanitizeValue(*v)
			sanitizedData[k] = &sanitized
		} else {
			sanitizedData[k] = nil
		}
	}

	return json.Marshal(&struct {
		*Alias
		Data map[string]*any `json:"data"`
	}{
		Alias: (*Alias)(&r),
		Data:  sanitizedData,
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
