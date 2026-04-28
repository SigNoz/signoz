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
	var startTime, endTime uint64
	initialized := false
	for _, s := range spans {
		spanMap[s.SpanID] = s
		if !initialized || s.TimeUnixNano < startTime {
			startTime = s.TimeUnixNano
			initialized = true
		}
		if end := s.TimeUnixNano + s.DurationNano; end > endTime {
			endTime = end
		}
	}
	return NewWaterfallTrace(startTime, endTime, uint64(len(spanMap)), 0, spanMap, nil, nil, false)
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
			// empty string is a valid field value — counted under the "" key, unlike a missing field
			name: "span with empty service.name is counted under empty string key",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "frontend"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": ""}, nil, 10, 5),
				mkASpan("s3", map[string]string{"service.name": "backend"}, nil, 20, 8),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"frontend": 1, "backend": 1, "": 1},
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
			name: "non-overlapping spans — merged equals sum",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "frontend"}, nil, 0, 100),
				mkASpan("s2", map[string]string{"service.name": "frontend"}, nil, 100, 50),
				mkASpan("s3", map[string]string{"service.name": "backend"}, nil, 0, 80),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"frontend": 150, "backend": 80},
		},
		{
			name: "non-overlapping attribute groups — merged equals sum",
			trace: buildTraceFromSpans(
				mkASpan("s1", nil, map[string]any{"http.method": "GET"}, 0, 30),
				mkASpan("s2", nil, map[string]any{"http.method": "GET"}, 50, 20),
				mkASpan("s3", nil, map[string]any{"http.method": "POST"}, 0, 70),
			),
			field: fieldHTTPMethod,
			want:  map[string]uint64{"GET": 50, "POST": 70},
		},
		{
			name: "overlapping spans — non-overlapping interval merge",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": "svc"}, nil, 5, 10),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 15}, // [0,10] ∪ [5,15] = [0,15]
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
			// trace [0,30]: svc occupies [0,10]+[20,30]=20 → 20*100/30 = 66%
			name: "non-overlapping spans",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": "svc"}, nil, 20, 10),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 66},
		},
		{
			// trace [0,15]: svc [0,15]=15 → 100%
			name: "partially overlapping spans",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": "svc"}, nil, 5, 10),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 100},
		},
		{
			// trace [0,20]: outer absorbs inner → 100%
			name: "fully contained span",
			trace: buildTraceFromSpans(
				mkASpan("outer", map[string]string{"service.name": "svc"}, nil, 0, 20),
				mkASpan("inner", map[string]string{"service.name": "svc"}, nil, 5, 5),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 100},
		},
		{
			// trace [0,30]: svc [0,15]+[20,30]=25 → 25*100/30 = 83%
			name: "three spans with two merges",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 0, 10),
				mkASpan("s2", map[string]string{"service.name": "svc"}, nil, 5, 10),
				mkASpan("s3", map[string]string{"service.name": "svc"}, nil, 20, 10),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 83},
		},
		{
			// trace [0,28]: frontend [0,15]=15 → 53%, backend [0,5]+[20,28]=13 → 46%
			name: "independent groups are computed separately",
			trace: buildTraceFromSpans(
				mkASpan("a1", map[string]string{"service.name": "frontend"}, nil, 0, 10),
				mkASpan("a2", map[string]string{"service.name": "frontend"}, nil, 5, 10),
				mkASpan("b1", map[string]string{"service.name": "backend"}, nil, 0, 5),
				mkASpan("b2", map[string]string{"service.name": "backend"}, nil, 20, 8),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"frontend": 53, "backend": 46},
		},
		{
			// trace [100,150]: svc [100,150]=50 → 100%
			name: "single span",
			trace: buildTraceFromSpans(
				mkASpan("s1", map[string]string{"service.name": "svc"}, nil, 100, 50),
			),
			field: fieldServiceName,
			want:  map[string]uint64{"svc": 100},
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
