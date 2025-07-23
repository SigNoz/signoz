package prometheustest

import (
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
	"testing"
)

func TestRemoveExtraLabels(t *testing.T) {

	tests := []struct {
		name    string
		res     *promql.Result
		remove  []string
		wantErr bool
		verify  func(t *testing.T, result *promql.Result, removed []string)
	}{
		{
			name: "vector – label removed",
			res: &promql.Result{
				Value: promql.Vector{
					promql.Sample{
						Metric: labels.FromStrings(
							"__name__", "http_requests_total",
							"job", "demo",
							"drop_me", "dropped",
						),
					},
				},
			},
			remove: []string{"drop_me"},
			verify: func(t *testing.T, result *promql.Result, removed []string) {
				k := result.Value.(promql.Vector)
				for _, str := range removed {
					get := k[0].Metric.Get(str)
					if get != "" {
						t.Fatalf("label not removed")
					}
				}
			},
		},
		{
			name: "scalar – nothing to strip",
			res: &promql.Result{
				Value: promql.Scalar{V: 99, T: 1},
			},
			remove: []string{"irrelevant"},
			verify: func(t *testing.T, result *promql.Result, removed []string) {
				sc := result.Value.(promql.Scalar)
				if sc.V != 99 || sc.T != 1 {
					t.Fatalf("scalar unexpectedly modified: got %+v", sc)
				}
			},
		},
		{
			name: "matrix – label removed",
			res: &promql.Result{
				Value: promql.Matrix{
					promql.Series{
						Metric: labels.FromStrings(
							"__name__", "http_requests_total",
							"pod", "p0",
							"drop_me", "dropped",
						),
						Floats: []promql.FPoint{{T: 0, F: 1}, {T: 1, F: 2}},
					},
					promql.Series{
						Metric: labels.FromStrings(
							"__name__", "http_requests_total",
							"pod", "p0",
							"drop_me", "dropped",
						),
						Floats: []promql.FPoint{{T: 0, F: 1}, {T: 1, F: 2}},
					},
				},
			},
			remove: []string{"drop_me"},
			verify: func(t *testing.T, result *promql.Result, removed []string) {
				mat := result.Value.(promql.Matrix)
				for _, str := range removed {
					for _, k := range mat {
						if k.Metric.Get(str) != "" {
							t.Fatalf("label not removed")
						}
					}
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := prometheus.RemoveExtraLabels(tc.res, tc.remove...)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tc.verify != nil {
				tc.verify(t, tc.res, tc.remove)
			}
		})
	}
}
