package tracedetailtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

// mkASpan builds a WaterfallSpan with timing and field data for analytics tests.
func mkASpan(id string, resource map[string]string, attributes map[string]any, startNs, durationNs uint64) *WaterfallSpan {
	return &WaterfallSpan{
		SpanID:       id,
		Resource:     resource,
		Attributes:   attributes,
		TimeUnixNano: startNs,
		DurationNano: durationNs,
		Children:     make([]*WaterfallSpan, 0),
	}
}

func buildTraceFromSpans(spans ...*WaterfallSpan) *WaterfallTrace {
	spanMap := make(map[string]*WaterfallSpan, len(spans))
	for _, s := range spans {
		spanMap[s.SpanID] = s
	}
	return NewWaterfallTrace(0, 0, uint64(len(spanMap)), 0, spanMap, nil, nil, false)
}

var (
	fieldServiceName = telemetrytypes.TelemetryFieldKey{
		Name:         "service.name",
		FieldContext: telemetrytypes.FieldContextResource,
	}
	fieldHTTPMethod = telemetrytypes.TelemetryFieldKey{
		Name:         "http.method",
		FieldContext: telemetrytypes.FieldContextAttribute,
	}
	fieldStatusCode = telemetrytypes.TelemetryFieldKey{
		Name:         "http.status_code",
		FieldContext: telemetrytypes.FieldContextAttribute,
	}
	fieldCached = telemetrytypes.TelemetryFieldKey{
		Name:         "db.cached",
		FieldContext: telemetrytypes.FieldContextAttribute,
	}
)

func TestGetSpanAggregation_SpanCount(t *testing.T) {
	tests := []struct {
		name  string
		trace *WaterfallTrace
		field telemetrytypes.TelemetryFieldKey
		want  map[string]uint64
	}{
		{
			name: "counts by resource field",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "frontend"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": "frontend"}, nil, 10, 5),
				mkASpan("s3", map[string]string{"service.name": "backend"}, nil, 20, 8),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"frontend": 2, "backend": 1},
		},
		{
			name: "counts by string attribute field",
			trace: buildTraceFromSpans(
				mkASpan("s1", nil, map[string]any{"http.method": "GET"}, 0, 10),
				mkASpan("s2", nil, map[string]any{"http.method": "POST"}, 10, 5),
				mkASpan("s3", nil, map[string]any{"http.method": "GET"}, 20, 8),
			),
			field: fieldHTTPMethod,
			want:  map[string]uint64{"GET": 2, "POST": 1},
		},
		{
			name: "counts by numeric attribute field — value formatted as string key",
			trace: buildTraceFromSpans(
				mkASpan("s1", nil, map[string]any{"http.status_code": float64(200)}, 0, 10),
				mkASpan("s2", nil, map[string]any{"http.status_code": float64(500)}, 10, 5),
				mkASpan("s3", nil, map[string]any{"http.status_code": float64(200)}, 20, 8),
			),
			field: fieldStatusCode,
			want:  map[string]uint64{"200": 2, "500": 1},
		},
		{
			name: "counts by boolean attribute field",
			trace: buildTraceFromSpans(
				mkASpan("s1", nil, map[string]any{"db.cached": true}, 0, 10),
				mkASpan("s2", nil, map[string]any{"db.cached": false}, 10, 5),
				mkASpan("s3", nil, map[string]any{"db.cached": true}, 20, 8),
			),
			field: fieldCached,
			want:  map[string]uint64{"true": 2, "false": 1},
		},
		{
			name: "spans missing the field are excluded",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "frontend"}, nil, 0, 10),
				mkASpan("s2", map[string]string{}, nil, 10, 5), // no service.name
				mkASpan("s3", map[string]string{"service.name": "backend"}, nil, 20, 8),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"frontend": 1, "backend": 1},
		},
		{
			name: "all spans missing the field returns empty map",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{}, nil, 0, 10),
				mkASpan("s2", map[string]string{}, nil, 10, 5),
			),
			field: fieldServiceName,
			want:  map[string]uint64{},
		},
		{
			name:  "empty trace returns empty map",
			trace: buildTraceFromSpans(),
			field: fieldServiceName,
			want:  map[string]uint64{},
		},
		{
			name: "unknown field context returns empty map",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),
			),
			field: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			want: map[string]uint64{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.trace.GetSpanAggregation(SpanAggregationSpanCount, tc.field)
			assert.Equal(t, tc.field, result.Field)
			assert.Equal(t, SpanAggregationSpanCount, result.Aggregation)
			assert.Equal(t, tc.want, result.Value)
		})
	}
}

func TestGetSpanAggregation_Duration(t *testing.T) {
	tests := []struct {
		name  string
		trace *WaterfallTrace
		field telemetrytypes.TelemetryFieldKey
		want  map[string]uint64
	}{
		{
			name: "sums DurationNano per resource group",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "frontend"}, nil, 0, 100),
				mkASpan("s2", map[string]string{"service.name": "frontend"}, nil, 100, 50),
				mkASpan("s3", map[string]string{"service.name": "backend"}, nil, 0, 80),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"frontend": 150, "backend": 80},
		},
		{
			name: "sums DurationNano per attribute group",
			trace: buildTraceFromSpans(
				mkASpan("s1", nil, map[string]any{"http.method": "GET"}, 0, 30),
				mkASpan("s2", nil, map[string]any{"http.method": "GET"}, 50, 20),
				mkASpan("s3", nil, map[string]any{"http.method": "POST"}, 0, 70),
			),
			field: fieldHTTPMethod,
			want:  map[string]uint64{"GET": 50, "POST": 70},
		},
		{
			name: "overlapping spans are summed independently — no interval merge",
			trace: buildTraceFromSpans(
				// Both in group A but the intervals overlap; duration sums raw, not merged
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": "svc"}, nil, 5, 10),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 20}, // 10 + 10, no overlap merging
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.trace.GetSpanAggregation(SpanAggregationDuration, tc.field)
			assert.Equal(t, tc.field, result.Field)
			assert.Equal(t, SpanAggregationDuration, result.Aggregation)
			assert.Equal(t, tc.want, result.Value)
		})
	}
}

func TestGetSpanAggregation_ExecutionTimePercentage(t *testing.T) {
	tests := []struct {
		name  string
		trace *WaterfallTrace
		field telemetrytypes.TelemetryFieldKey
		want  map[string]uint64
	}{
		{
			name: "non-overlapping spans — result is sum of durations",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": "svc"}, nil, 20, 10),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 20}, // [0,10] + [20,30] = 20
		},
		{
			name: "partially overlapping spans — union of intervals",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": "svc"}, nil, 5, 10),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 15}, // [0,10] ∪ [5,15] = [0,15]
		},
		{
			name: "fully contained span — outer span absorbs inner",
			trace: buildTraceFromSpans(
				mkASpan("outer", map[string]string{"service.name": "svc"}, nil, 0, 20),
				mkASpan("inner", map[string]string{"service.name": "svc"}, nil, 5, 5),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 20}, // [0,20] ∪ [5,10] = [0,20]
		},
		{
			name: "three spans with two merges",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),  // [0,10]
				mkASpan("s2", map[string]string{"service.name": "svc"}, nil, 5, 10),  // [5,15]
				mkASpan("s3", map[string]string{"service.name": "svc"}, nil, 20, 10), // [20,30]
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 25}, // [0,15] + [20,30] = 15+10
		},
		{
			name: "independent groups are computed separately",
			trace: buildTraceFromSpans(
				mkASpan("a1", map[string]string{"service.name": "frontend"}, nil, 0, 10),
				mkASpan("a2", map[string]string{"service.name": "frontend"}, nil, 5, 10),
				mkASpan("b1", map[string]string{"service.name": "backend"}, nil, 0, 5),
				mkASpan("b2", map[string]string{"service.name": "backend"}, nil, 20, 8),
			),
			field: fieldServiceName,
			want: map[string]uint64{
				"frontend": 15, // [0,10] ∪ [5,15] = [0,15]
				"backend":  13, // [0,5] + [20,28] = 5+8
			},
		},
		{
			name: "single span — result equals its duration",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 100, 50),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 50},
		},
		{
			name: "result is in nanoseconds before unit conversion by the caller",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 1_000_000_000), // 1 second
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 1_000_000_000}, // raw nanoseconds, not millis
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.trace.GetSpanAggregation(SpanAggregationExecutionTimePercentage, tc.field)
			assert.Equal(t, tc.field, result.Field)
			assert.Equal(t, SpanAggregationExecutionTimePercentage, result.Aggregation)
			assert.Equal(t, tc.want, result.Value)
		})
	}
}
