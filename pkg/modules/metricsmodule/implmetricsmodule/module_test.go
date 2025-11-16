package implmetricsmodule

import (
	"reflect"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
)

func TestPostProcessStatsResp_FiltersEnrichesAndOrders(t *testing.T) {
	tests := []struct {
		name             string
		input            *metricsmoduletypes.StatsResponse
		updatedMeta      map[string]*metricsmoduletypes.MetricMetadata
		samplesCount     map[string]uint64
		orderBySamples   bool
		orderByDirection string
		want             []metricsmoduletypes.MetricStat
	}{
		{
			name: "filters out metrics with no samples",
			input: &metricsmoduletypes.StatsResponse{
				Metrics: []metricsmoduletypes.MetricStat{
					{MetricName: "m1", TimeSeries: 2},
					{MetricName: "m2", TimeSeries: 3},
				},
			},
			samplesCount: map[string]uint64{"m2": 7},
			want: []metricsmoduletypes.MetricStat{
				{MetricName: "m2", TimeSeries: 3, Samples: 7},
			},
		},
		{
			name: "enriches metadata when present",
			input: &metricsmoduletypes.StatsResponse{
				Metrics: []metricsmoduletypes.MetricStat{
					{MetricName: "m1", TimeSeries: 4},
				},
			},
			samplesCount: map[string]uint64{"m1": 5},
			updatedMeta: map[string]*metricsmoduletypes.MetricMetadata{
				"m1": {Description: "latency", MetricType: "histogram", MetricUnit: "ms"},
			},
			want: []metricsmoduletypes.MetricStat{
				{MetricName: "m1", TimeSeries: 4, Samples: 5, Description: "latency", MetricType: "histogram", MetricUnit: "ms"},
			},
		},
		{
			name: "orders by samples ASC when requested",
			input: &metricsmoduletypes.StatsResponse{
				Metrics: []metricsmoduletypes.MetricStat{
					{MetricName: "a", TimeSeries: 2},
					{MetricName: "b", TimeSeries: 5},
					{MetricName: "c", TimeSeries: 3},
				},
			},
			samplesCount:     map[string]uint64{"a": 10, "b": 1, "c": 3},
			orderBySamples:   true,
			orderByDirection: orderByDirectionAsc,
			want: []metricsmoduletypes.MetricStat{
				{MetricName: "b", TimeSeries: 5, Samples: 1},
				{MetricName: "c", TimeSeries: 3, Samples: 3},
				{MetricName: "a", TimeSeries: 2, Samples: 10},
			},
		},
		{
			name: "orders by samples DESC when requested",
			input: &metricsmoduletypes.StatsResponse{
				Metrics: []metricsmoduletypes.MetricStat{
					{MetricName: "a", TimeSeries: 2},
					{MetricName: "b", TimeSeries: 5},
					{MetricName: "c", TimeSeries: 3},
				},
			},
			samplesCount:     map[string]uint64{"a": 10, "b": 1, "c": 3},
			orderBySamples:   true,
			orderByDirection: orderByDirectionDesc,
			want: []metricsmoduletypes.MetricStat{
				{MetricName: "a", TimeSeries: 2, Samples: 10},
				{MetricName: "c", TimeSeries: 3, Samples: 3},
				{MetricName: "b", TimeSeries: 5, Samples: 1},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := cloneStatsResp(tt.input)
			m := &module{}
			m.postProcessStatsResp(resp, tt.updatedMeta, tt.samplesCount, tt.orderBySamples, tt.orderByDirection)
			if !reflect.DeepEqual(resp.Metrics, tt.want) {
				t.Fatalf("postProcessStatsResp() = %+v, want %+v", resp.Metrics, tt.want)
			}
		})
	}
}

func cloneStatsResp(in *metricsmoduletypes.StatsResponse) *metricsmoduletypes.StatsResponse {
	if in == nil {
		return nil
	}
	out := &metricsmoduletypes.StatsResponse{
		Metrics: make([]metricsmoduletypes.MetricStat, len(in.Metrics)),
		Total:   in.Total,
	}
	copy(out.Metrics, in.Metrics)
	return out
}
