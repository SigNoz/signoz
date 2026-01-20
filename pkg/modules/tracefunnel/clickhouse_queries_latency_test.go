package tracefunnel

import (
	"strings"
	"testing"
)

func TestBuildFunnelOverviewQuery_WithLatencyPointer(t *testing.T) {
	tests := []struct {
		name  string
		steps []struct {
			ServiceName    string
			SpanName       string
			ContainsError  int
			LatencyPointer string
			Clause         string
		}
		startTs         int64
		endTs           int64
		wantContains    []string
		wantNotContains []string
	}{
		{
			name: "latency pointer end for first step only",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				Clause         string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, LatencyPointer: "end", Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 0, LatencyPointer: "start", Clause: ""},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step1.1 AND name = step1.2)) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) AS t2_time",
			},
		},
		{
			name: "latency pointer end for all steps",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				Clause         string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, LatencyPointer: "end", Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 0, LatencyPointer: "end", Clause: ""},
				{ServiceName: "service3", SpanName: "span3", ContainsError: 0, LatencyPointer: "end", Clause: ""},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step1.1 AND name = step1.2)) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step2.1 AND name = step2.2)) AS t2_time",
				"minIf(timestamp, resource_string_service$$name = step3.1 AND name = step3.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step3.1 AND name = step3.2)) AS t3_time",
			},
		},
		{
			name: "mixed latency pointers",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				Clause         string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, LatencyPointer: "start", Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 0, LatencyPointer: "end", Clause: ""},
				{ServiceName: "service3", SpanName: "span3", ContainsError: 0, LatencyPointer: "start", Clause: ""},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step2.1 AND name = step2.2)) AS t2_time",
				"minIf(timestamp, resource_string_service$$name = step3.1 AND name = step3.2) AS t3_time",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := BuildFunnelOverviewQuery(tt.steps, tt.startTs, tt.endTs)

			for _, want := range tt.wantContains {
				if !strings.Contains(query, want) {
					t.Errorf("Query missing expected content: %s", want)
				}
			}

			for _, notWant := range tt.wantNotContains {
				if strings.Contains(query, notWant) {
					t.Errorf("Query contains unexpected content: %s", notWant)
				}
			}
		})
	}
}

func TestBuildFunnelStepOverviewQuery_WithLatencyPointer(t *testing.T) {
	tests := []struct {
		name  string
		steps []struct {
			ServiceName    string
			SpanName       string
			ContainsError  int
			LatencyPointer string
			LatencyType    string
			Clause         string
		}
		stepStart    int64
		stepEnd      int64
		wantContains []string
	}{
		{
			name: "step 1 to 2 with end latency pointers",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				LatencyType    string
				Clause         string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, LatencyPointer: "end", LatencyType: "p99", Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 0, LatencyPointer: "end", LatencyType: "p99", Clause: ""},
			},
			stepStart: 1,
			stepEnd:   2,
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step1.1 AND name = step1.2)) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step2.1 AND name = step2.2)) AS t2_time",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := BuildFunnelStepOverviewQuery(tt.steps, 1000000000, 2000000000, tt.stepStart, tt.stepEnd)

			for _, want := range tt.wantContains {
				if !strings.Contains(query, want) {
					t.Errorf("Query missing expected content: %s", want)
				}
			}
		})
	}
}

func TestBuildFunnelTopSlowTracesQuery_WithLatencyPointer(t *testing.T) {
	tests := []struct {
		name             string
		latencyPointerT1 string
		latencyPointerT2 string
		wantContains     []string
	}{
		{
			name:             "both steps with end latency",
			latencyPointerT1: "end",
			latencyPointerT2: "end",
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step1.1 AND name = step1.2)) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step2.1 AND name = step2.2)) AS t2_time",
			},
		},
		{
			name:             "first step end, second step start",
			latencyPointerT1: "end",
			latencyPointerT2: "start",
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step1.1 AND name = step1.2)) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) AS t2_time",
			},
		},
		{
			name:             "both steps with start latency",
			latencyPointerT1: "start",
			latencyPointerT2: "start",
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) AS t2_time",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := BuildFunnelTopSlowTracesQuery(
				0, 0,
				1000000000, 2000000000,
				"service1", "span1",
				"service2", "span2",
				"", "",
				tt.latencyPointerT1,
				tt.latencyPointerT2,
			)

			for _, want := range tt.wantContains {
				if !strings.Contains(query, want) {
					t.Errorf("Query missing expected content: %s", want)
				}
			}
		})
	}
}

func TestBuildFunnelTopSlowErrorTracesQuery_WithLatencyPointer(t *testing.T) {
	tests := []struct {
		name             string
		latencyPointerT1 string
		latencyPointerT2 string
		wantContains     []string
	}{
		{
			name:             "both steps with end latency",
			latencyPointerT1: "end",
			latencyPointerT2: "end",
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step1.1 AND name = step1.2)) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step2.1 AND name = step2.2)) AS t2_time",
			},
		},
		{
			name:             "mixed latency pointers",
			latencyPointerT1: "start",
			latencyPointerT2: "end",
			wantContains: []string{
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) + toIntervalNanosecond(minIf(duration_nano, resource_string_service$$name = step2.1 AND name = step2.2)) AS t2_time",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := BuildFunnelTopSlowErrorTracesQuery(
				0, 0,
				1000000000, 2000000000,
				"service1", "span1",
				"service2", "span2",
				"", "",
				tt.latencyPointerT1,
				tt.latencyPointerT2,
			)

			for _, want := range tt.wantContains {
				if !strings.Contains(query, want) {
					t.Errorf("Query missing expected content: %s", want)
				}
			}
		})
	}
}
