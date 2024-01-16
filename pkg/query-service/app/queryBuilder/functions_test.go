package queryBuilder

import (
	"math"
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestFuncCutOffMin(t *testing.T) {
	type args struct {
		result    *v3.Result
		threshold float64
	}
	tests := []struct {
		name string
		args args
		want *v3.Result
	}{
		{
			name: "test funcCutOffMin",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
				threshold: 0.3,
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{
							{
								Value: 0.5,
							},
							{
								Value: 0.4,
							},
							{
								Value: 0.3,
							},
							{
								Value: math.NaN(),
							},
							{
								Value: math.NaN(),
							},
						},
					},
				},
			},
		},
		{
			name: "test funcCutOffMin with threshold 0",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
				threshold: 0,
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{
							{
								Value: 0.5,
							},
							{
								Value: 0.4,
							},
							{
								Value: 0.3,
							},
							{
								Value: 0.2,
							},
							{
								Value: 0.1,
							},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		newResult := funcCutOffMin(tt.args.result, tt.args.threshold)
		for j, series := range newResult.Series {
			for k, point := range series.Points {

				if math.IsNaN(tt.want.Series[j].Points[k].Value) {
					if !math.IsNaN(point.Value) {
						t.Errorf("funcCutOffMin() = %v, want %v", point.Value, tt.want.Series[j].Points[k].Value)
					}
					continue
				}

				if point.Value != tt.want.Series[j].Points[k].Value {
					t.Errorf("funcCutOffMin() = %v, want %v", point.Value, tt.want.Series[j].Points[k].Value)
				}
			}
		}
	}
}

func TestFuncCutOffMax(t *testing.T) {
	type args struct {
		result    *v3.Result
		threshold float64
	}
	tests := []struct {
		name string
		args args
		want *v3.Result
	}{
		{
			name: "test funcCutOffMax",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
				threshold: 0.3,
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{
							{
								Value: math.NaN(),
							},
							{
								Value: math.NaN(),
							},
							{
								Value: 0.3,
							},
							{
								Value: 0.2,
							},
							{
								Value: 0.1,
							},
						},
					},
				},
			},
		},
		{
			name: "test funcCutOffMax with threshold 0",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
				threshold: 0,
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{
							{
								Value: math.NaN(),
							},
							{
								Value: math.NaN(),
							},
							{
								Value: math.NaN(),
							},
							{
								Value: math.NaN(),
							},
							{
								Value: math.NaN(),
							},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		newResult := funcCutOffMax(tt.args.result, tt.args.threshold)
		for j, series := range newResult.Series {
			for k, point := range series.Points {

				if math.IsNaN(tt.want.Series[j].Points[k].Value) {
					if !math.IsNaN(point.Value) {
						t.Errorf("funcCutOffMax() = %v, want %v", point.Value, tt.want.Series[j].Points[k].Value)
					}
					continue
				}

				if point.Value != tt.want.Series[j].Points[k].Value {
					t.Errorf("funcCutOffMax() = %v, want %v", point.Value, tt.want.Series[j].Points[k].Value)
				}
			}
		}
	}
}
