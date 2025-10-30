package tracefunnel

import (
	"testing"

	tracev4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
)

func TestValidateTracesMultipleSteps(t *testing.T) {
	tests := []struct {
		name        string
		funnel      *tracefunneltypes.StorableFunnel
		timeRange   tracefunneltypes.TimeRange
		expectError bool
	}{
		{
			name: "multi step funnel validation (4 steps)",
			funnel: &tracefunneltypes.StorableFunnel{
				Steps: []*tracefunneltypes.FunnelStep{
					{
						ServiceName: "service1",
						SpanName:    "span1",
						HasErrors:   false,
						Filters:     &v3.FilterSet{},
					},
					{
						ServiceName: "service2",
						SpanName:    "span2",
						HasErrors:   true,
						Filters:     &v3.FilterSet{},
					},
					{
						ServiceName: "service3",
						SpanName:    "span3",
						HasErrors:   false,
						Filters:     &v3.FilterSet{},
					},
					{
						ServiceName: "service4",
						SpanName:    "span4",
						HasErrors:   true,
						Filters:     &v3.FilterSet{},
					},
				},
			},
			timeRange: tracefunneltypes.TimeRange{
				StartTime: 1000000000,
				EndTime:   2000000000,
			},
			expectError: false,
		},
		{
			name: "single step funnel validation (1 step)",
			funnel: &tracefunneltypes.StorableFunnel{
				Steps: []*tracefunneltypes.FunnelStep{
					{
						ServiceName: "service1",
						SpanName:    "span1",
						HasErrors:   false,
						Filters:     &v3.FilterSet{},
					},
				},
			},
			timeRange: tracefunneltypes.TimeRange{
				StartTime: 1000000000,
				EndTime:   2000000000,
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ValidateTraces(tt.funnel, tt.timeRange)

			if tt.expectError && err == nil {
				t.Errorf("ValidateTraces() expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("ValidateTraces() unexpected error: %v", err)
			}
			if !tt.expectError && result == nil {
				t.Errorf("ValidateTraces() expected result but got nil")
			}
			if !tt.expectError && result != nil && result.Query == "" {
				t.Errorf("ValidateTraces() expected non-empty query")
			}
		})
	}
}

func TestGetFunnelAnalyticsMultipleSteps(t *testing.T) {
	tests := []struct {
		name        string
		funnel      *tracefunneltypes.StorableFunnel
		timeRange   tracefunneltypes.TimeRange
		expectError bool
	}{
		{
			name: "multi step funnel analytics (5 steps)",
			funnel: &tracefunneltypes.StorableFunnel{
				Steps: []*tracefunneltypes.FunnelStep{
					{
						ServiceName:    "service1",
						SpanName:       "span1",
						HasErrors:      false,
						LatencyPointer: "start",
						Filters:        &v3.FilterSet{},
					},
					{
						ServiceName:    "service2",
						SpanName:       "span2",
						HasErrors:      true,
						LatencyPointer: "end",
						Filters:        &v3.FilterSet{},
					},
					{
						ServiceName:    "service3",
						SpanName:       "span3",
						HasErrors:      false,
						LatencyPointer: "start",
						Filters:        &v3.FilterSet{},
					},
					{
						ServiceName:    "service4",
						SpanName:       "span4",
						HasErrors:      false,
						LatencyPointer: "end",
						Filters:        &v3.FilterSet{},
					},
					{
						ServiceName:    "service5",
						SpanName:       "span5",
						HasErrors:      true,
						LatencyPointer: "start",
						Filters:        &v3.FilterSet{},
					},
				},
			},
			timeRange: tracefunneltypes.TimeRange{
				StartTime: 1000000000,
				EndTime:   2000000000,
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := GetFunnelAnalytics(tt.funnel, tt.timeRange)

			if tt.expectError && err == nil {
				t.Errorf("GetFunnelAnalytics() expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("GetFunnelAnalytics() unexpected error: %v", err)
			}
			if !tt.expectError && result == nil {
				t.Errorf("GetFunnelAnalytics() expected result but got nil")
			}
			if !tt.expectError && result != nil && result.Query == "" {
				t.Errorf("GetFunnelAnalytics() expected non-empty query")
			}
		})
	}
}

func TestGetStepAnalyticsMultipleSteps(t *testing.T) {
	funnel := &tracefunneltypes.StorableFunnel{
		Steps: []*tracefunneltypes.FunnelStep{
			{ServiceName: "s1", SpanName: "sp1", HasErrors: false, Filters: &v3.FilterSet{}},
			{ServiceName: "s2", SpanName: "sp2", HasErrors: true, Filters: &v3.FilterSet{}},
			{ServiceName: "s3", SpanName: "sp3", HasErrors: false, Filters: &v3.FilterSet{}},
			{ServiceName: "s4", SpanName: "sp4", HasErrors: false, Filters: &v3.FilterSet{}},
			{ServiceName: "s5", SpanName: "sp5", HasErrors: true, Filters: &v3.FilterSet{}},
		},
	}

	timeRange := tracefunneltypes.TimeRange{
		StartTime: 1000000000,
		EndTime:   2000000000,
	}

	result, err := GetStepAnalytics(funnel, timeRange)

	if err != nil {
		t.Errorf("GetStepAnalytics() unexpected error: %v", err)
	}
	if result == nil {
		t.Errorf("GetStepAnalytics() expected result but got nil")
	}
	if result != nil && result.Query == "" {
		t.Errorf("GetStepAnalytics() expected non-empty query")
	}
}

func TestGetFunnelStepAnalyticsMultipleSteps(t *testing.T) {
	tests := []struct {
		name        string
		funnel      *tracefunneltypes.StorableFunnel
		timeRange   tracefunneltypes.TimeRange
		stepStart   int64
		stepEnd     int64
		expectError bool
	}{
		{
			name: "step 2 to 4 in 6-step funnel",
			funnel: &tracefunneltypes.StorableFunnel{
				Steps: []*tracefunneltypes.FunnelStep{
					{ServiceName: "s1", SpanName: "sp1", HasErrors: false, LatencyPointer: "start", LatencyType: "", Filters: &v3.FilterSet{}},
					{ServiceName: "s2", SpanName: "sp2", HasErrors: false, LatencyPointer: "start", LatencyType: "p90", Filters: &v3.FilterSet{}},
					{ServiceName: "s3", SpanName: "sp3", HasErrors: true, LatencyPointer: "end", LatencyType: "", Filters: &v3.FilterSet{}},
					{ServiceName: "s4", SpanName: "sp4", HasErrors: false, LatencyPointer: "start", LatencyType: "p95", Filters: &v3.FilterSet{}},
					{ServiceName: "s5", SpanName: "sp5", HasErrors: false, LatencyPointer: "end", LatencyType: "", Filters: &v3.FilterSet{}},
					{ServiceName: "s6", SpanName: "sp6", HasErrors: true, LatencyPointer: "start", LatencyType: "", Filters: &v3.FilterSet{}},
				},
			},
			timeRange: tracefunneltypes.TimeRange{
				StartTime: 1000000000,
				EndTime:   2000000000,
			},
			stepStart:   2,
			stepEnd:     4,
			expectError: false,
		},
		{
			name: "invalid same step range",
			funnel: &tracefunneltypes.StorableFunnel{
				Steps: []*tracefunneltypes.FunnelStep{
					{ServiceName: "s1", SpanName: "sp1", HasErrors: false, LatencyPointer: "start", Filters: &v3.FilterSet{}},
					{ServiceName: "s2", SpanName: "sp2", HasErrors: false, LatencyPointer: "start", Filters: &v3.FilterSet{}},
				},
			},
			timeRange: tracefunneltypes.TimeRange{
				StartTime: 1000000000,
				EndTime:   2000000000,
			},
			stepStart:   1,
			stepEnd:     1,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := GetFunnelStepAnalytics(tt.funnel, tt.timeRange, tt.stepStart, tt.stepEnd)

			if tt.expectError && err == nil {
				t.Errorf("GetFunnelStepAnalytics() expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("GetFunnelStepAnalytics() unexpected error: %v", err)
			}
			if !tt.expectError && result == nil {
				t.Errorf("GetFunnelStepAnalytics() expected result but got nil")
			}
			if !tt.expectError && result != nil && result.Query == "" {
				t.Errorf("GetFunnelStepAnalytics() expected non-empty query")
			}
		})
	}
}

// Mock the tracev4.BuildTracesFilterQuery function since it's external
func init() {
	// This would normally be handled by the actual implementation
	// For testing purposes, we'll assume it returns an empty string
	_ = tracev4.BuildTracesFilterQuery
}
