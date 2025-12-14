package tracefunnel

import (
	"strings"
	"testing"
)

func TestBuildFunnelValidationQuery(t *testing.T) {
	tests := []struct {
		name  string
		steps []struct {
			ServiceName   string
			SpanName      string
			ContainsError int
			Clause        string
		}
		startTs      int64
		endTs        int64
		wantContains []string
	}{
		{
			name: "multi step funnel (2 steps)",
			steps: []struct {
				ServiceName   string
				SpanName      string
				ContainsError int
				Clause        string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, Clause: "AND attr1 = 'value1'"},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 1, Clause: "AND attr2 = 'value2'"},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"('service1','span1') AS step1",
				"('service2','span2') AS step2",
				"0 AS contains_error_t1",
				"1 AS contains_error_t2",
				"minIf(timestamp, resource_string_service$$name = step1.1 AND name = step1.2) AS t1_time",
				"minIf(timestamp, resource_string_service$$name = step2.1 AND name = step2.2) AS t2_time",
				"AND attr1 = 'value1'",
				"AND attr2 = 'value2'",
			},
		},
		{
			name: "multi step funnel (3 steps)",
			steps: []struct {
				ServiceName   string
				SpanName      string
				ContainsError int
				Clause        string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 1, Clause: "AND attr2 = 'value2'"},
				{ServiceName: "service3", SpanName: "span3", ContainsError: 0, Clause: "AND attr3 = 'value3'"},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"('service1','span1') AS step1",
				"('service2','span2') AS step2",
				"('service3','span3') AS step3",
				"minIf(timestamp, resource_string_service$$name = step3.1 AND name = step3.2) AS t3_time",
			},
		},
		{
			name: "five step funnel",
			steps: []struct {
				ServiceName   string
				SpanName      string
				ContainsError int
				Clause        string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 0, Clause: ""},
				{ServiceName: "service3", SpanName: "span3", ContainsError: 1, Clause: ""},
				{ServiceName: "service4", SpanName: "span4", ContainsError: 0, Clause: ""},
				{ServiceName: "service5", SpanName: "span5", ContainsError: 1, Clause: ""},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"('service5','span5') AS step5",
				"minIf(timestamp, resource_string_service$$name = step5.1 AND name = step5.2) AS t5_time",
				"1 AS contains_error_t5",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildFunnelValidationQuery(tt.steps, tt.startTs, tt.endTs)

			for _, want := range tt.wantContains {
				if !strings.Contains(got, want) {
					t.Errorf("BuildFunnelValidationQuery() missing expected string: %q", want)
					t.Logf("Got query:\n%s", got)
				}
			}
		})
	}
}

func TestBuildFunnelOverviewQuery(t *testing.T) {
	tests := []struct {
		name  string
		steps []struct {
			ServiceName    string
			SpanName       string
			ContainsError  int
			LatencyPointer string
			Clause         string
		}
		startTs      int64
		endTs        int64
		wantContains []string
	}{
		{
			name: "multi step funnel with latency (2 steps)",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				Clause         string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, LatencyPointer: "start", Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 1, LatencyPointer: "end", Clause: ""},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"'start' AS latency_pointer_t1",
				"'end' AS latency_pointer_t2",
				"count(DISTINCT CASE WHEN t2_time > t1_time THEN trace_id END) AS total_s2_spans",
				"avgIf((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time))/1e6",
				"quantileIf(0.99)((toUnixTimestamp64Nano(t2_time) - toUnixTimestamp64Nano(t1_time))/1e6",
				"round(if(total_s1_spans > 0, total_s2_spans * 100.0 / total_s1_spans, 0), 2) AS conversion_rate",
			},
		},
		{
			name: "four step funnel",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				Clause         string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, LatencyPointer: "start", Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 0, LatencyPointer: "start", Clause: ""},
				{ServiceName: "service3", SpanName: "span3", ContainsError: 0, LatencyPointer: "start", Clause: ""},
				{ServiceName: "service4", SpanName: "span4", ContainsError: 1, LatencyPointer: "end", Clause: ""},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"('service4','span4') AS step4",
				"count(DISTINCT CASE WHEN t2_time > t1_time THEN trace_id END) AS total_s2_spans",
				"count(DISTINCT CASE WHEN t2_time > t1_time AND t3_time > t2_time THEN trace_id END) AS total_s3_spans",
				"count(DISTINCT CASE WHEN t2_time > t1_time AND t3_time > t2_time AND t4_time > t3_time THEN trace_id END) AS total_s4_spans",
				"round(if(total_s1_spans > 0, total_s4_spans * 100.0 / total_s1_spans, 0), 2) AS conversion_rate",
				"avgIf((toUnixTimestamp64Nano(t4_time) - toUnixTimestamp64Nano(t1_time))/1e6",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildFunnelOverviewQuery(tt.steps, tt.startTs, tt.endTs)

			for _, want := range tt.wantContains {
				if !strings.Contains(got, want) {
					t.Errorf("BuildFunnelOverviewQuery() missing expected string: %q", want)
					t.Logf("Got query:\n%s", got)
				}
			}
		})
	}
}

func TestBuildFunnelCountQuery(t *testing.T) {
	tests := []struct {
		name  string
		steps []struct {
			ServiceName   string
			SpanName      string
			ContainsError int
			Clause        string
		}
		startTs      int64
		endTs        int64
		wantContains []string
	}{
		{
			name: "multi step funnel count (3 steps)",
			steps: []struct {
				ServiceName   string
				SpanName      string
				ContainsError int
				Clause        string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 1, Clause: ""},
				{ServiceName: "service3", SpanName: "span3", ContainsError: 0, Clause: ""},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"count(DISTINCT trace_id) AS total_s1_spans",
				"count(DISTINCT CASE WHEN t1_error = 1 THEN trace_id END) AS total_s1_errored_spans",
				"count(DISTINCT CASE WHEN t2_time > t1_time THEN trace_id END) AS total_s2_spans",
				"count(DISTINCT CASE WHEN t2_time > t1_time AND t2_error = 1 THEN trace_id END) AS total_s2_errored_spans",
				"count(DISTINCT CASE WHEN t2_time > t1_time AND t3_time > t2_time THEN trace_id END) AS total_s3_spans",
				"count(DISTINCT CASE WHEN t2_time > t1_time AND t3_time > t2_time AND t3_error = 1 THEN trace_id END) AS total_s3_errored_spans",
			},
		},
		{
			name: "five step funnel count",
			steps: []struct {
				ServiceName   string
				SpanName      string
				ContainsError int
				Clause        string
			}{
				{ServiceName: "s1", SpanName: "sp1", ContainsError: 0, Clause: ""},
				{ServiceName: "s2", SpanName: "sp2", ContainsError: 0, Clause: ""},
				{ServiceName: "s3", SpanName: "sp3", ContainsError: 0, Clause: ""},
				{ServiceName: "s4", SpanName: "sp4", ContainsError: 0, Clause: ""},
				{ServiceName: "s5", SpanName: "sp5", ContainsError: 1, Clause: ""},
			},
			startTs: 1000000000,
			endTs:   2000000000,
			wantContains: []string{
				"count(DISTINCT CASE WHEN t2_time > t1_time AND t3_time > t2_time AND t4_time > t3_time AND t5_time > t4_time THEN trace_id END) AS total_s5_spans",
				"toUInt8(anyIf(has_error, resource_string_service$$name = step5.1 AND name = step5.2)) AS t5_error",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildFunnelCountQuery(tt.steps, tt.startTs, tt.endTs)

			for _, want := range tt.wantContains {
				if !strings.Contains(got, want) {
					t.Errorf("BuildFunnelCountQuery() missing expected string: %q", want)
					t.Logf("Got query:\n%s", got)
				}
			}
		})
	}
}

func TestBuildFunnelStepOverviewQuery(t *testing.T) {
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
		startTs      int64
		endTs        int64
		stepStart    int64
		stepEnd      int64
		wantContains []string
		wantFallback bool
	}{
		{
			name: "step 1 to 2 transition",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				LatencyType    string
				Clause         string
			}{
				{ServiceName: "service1", SpanName: "span1", ContainsError: 0, LatencyPointer: "start", LatencyType: "", Clause: ""},
				{ServiceName: "service2", SpanName: "span2", ContainsError: 1, LatencyPointer: "end", LatencyType: "p95", Clause: ""},
				{ServiceName: "service3", SpanName: "span3", ContainsError: 0, LatencyPointer: "start", LatencyType: "", Clause: ""},
			},
			startTs:   1000000000,
			endTs:     2000000000,
			stepStart: 1,
			stepEnd:   2,
			wantContains: []string{
				"round(total_s2_spans * 100.0 / total_s1_spans, 2) AS conversion_rate",
				"quantileIf(0.95)",
				"t2_time > t1_time",
			},
		},
		{
			name: "step 2 to 4 transition in 5-step funnel",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				LatencyType    string
				Clause         string
			}{
				{ServiceName: "s1", SpanName: "sp1", ContainsError: 0, LatencyPointer: "start", LatencyType: "", Clause: ""},
				{ServiceName: "s2", SpanName: "sp2", ContainsError: 0, LatencyPointer: "start", LatencyType: "", Clause: ""},
				{ServiceName: "s3", SpanName: "sp3", ContainsError: 0, LatencyPointer: "start", LatencyType: "", Clause: ""},
				{ServiceName: "s4", SpanName: "sp4", ContainsError: 0, LatencyPointer: "start", LatencyType: "p90", Clause: ""},
				{ServiceName: "s5", SpanName: "sp5", ContainsError: 0, LatencyPointer: "start", LatencyType: "", Clause: ""},
			},
			startTs:   1000000000,
			endTs:     2000000000,
			stepStart: 2,
			stepEnd:   4,
			wantContains: []string{
				"round(total_s4_spans * 100.0 / total_s2_spans, 2) AS conversion_rate",
				"t3_time > t2_time AND t4_time > t3_time",
				"quantileIf(0.90)",
			},
		},
		{
			name: "invalid step range",
			steps: []struct {
				ServiceName    string
				SpanName       string
				ContainsError  int
				LatencyPointer string
				LatencyType    string
				Clause         string
			}{
				{ServiceName: "s1", SpanName: "sp1", ContainsError: 0, LatencyPointer: "start", LatencyType: "", Clause: ""},
				{ServiceName: "s2", SpanName: "sp2", ContainsError: 0, LatencyPointer: "start", LatencyType: "", Clause: ""},
			},
			startTs:      1000000000,
			endTs:        2000000000,
			stepStart:    2,
			stepEnd:      2, // same step - invalid
			wantFallback: true,
			wantContains: []string{
				"SELECT 0 AS conversion_rate, 0 AS avg_rate, 0 AS errors, 0 AS avg_duration, 0 AS latency;",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildFunnelStepOverviewQuery(tt.steps, tt.startTs, tt.endTs, tt.stepStart, tt.stepEnd)

			for _, want := range tt.wantContains {
				if !strings.Contains(got, want) {
					t.Errorf("BuildFunnelStepOverviewQuery() missing expected string: %q", want)
					t.Logf("Got query:\n%s", got)
				}
			}

			if tt.wantFallback && !strings.Contains(got, "SELECT 0 AS conversion_rate") {
				t.Errorf("BuildFunnelStepOverviewQuery() expected fallback query for invalid step range")
			}
		})
	}
}

func TestTemporalOrderingLogic(t *testing.T) {
	// Test that temporal ordering is correctly built for multiple steps
	query := BuildFunnelOverviewQuery([]struct {
		ServiceName    string
		SpanName       string
		ContainsError  int
		LatencyPointer string
		Clause         string
	}{
		{ServiceName: "s1", SpanName: "sp1", ContainsError: 0, LatencyPointer: "start", Clause: ""},
		{ServiceName: "s2", SpanName: "sp2", ContainsError: 0, LatencyPointer: "start", Clause: ""},
		{ServiceName: "s3", SpanName: "sp3", ContainsError: 0, LatencyPointer: "start", Clause: ""},
		{ServiceName: "s4", SpanName: "sp4", ContainsError: 0, LatencyPointer: "start", Clause: ""},
	}, 1000000000, 2000000000)

	// Check that each step has proper temporal ordering (cumulative format)
	temporalChecks := []string{
		"t2_time > t1_time",
		"t2_time > t1_time AND t3_time > t2_time",
		"t2_time > t1_time AND t3_time > t2_time AND t4_time > t3_time",
	}

	for _, check := range temporalChecks {
		if !strings.Contains(query, check) {
			t.Errorf("Missing temporal ordering check: %s", check)
		}
	}
}
