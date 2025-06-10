package querybuildertypesv5

import (
	"fmt"
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
	Columns []*ColumnDescriptor `json:"columns"`
	Data    [][]any             `json:"data"`
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
