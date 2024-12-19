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

func TestCutOffMinCumSum(t *testing.T) {
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
			name: "test funcCutOffMin followed by funcCumulativeSum",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
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
								Value: 0.5,
							},
							{
								Value: 0.5,
							},
							{
								Value: 0.9,
							},
							{
								Value: 1.2,
							},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		newResult := funcCutOffMin(tt.args.result, tt.args.threshold)
		newResult = funcCumSum(newResult)
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

func TestFuncMedian3(t *testing.T) {
	type args struct {
		result *v3.Result
	}

	tests := []struct {
		name string
		args args
		want *v3.Result
	}{
		{
			name: "Values",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: 5}, {Timestamp: 2, Value: 3}, {Timestamp: 3, Value: 8}, {Timestamp: 4, Value: 2}, {Timestamp: 5, Value: 7}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 1, Value: 5}, {Timestamp: 2, Value: 5}, {Timestamp: 3, Value: 3}, {Timestamp: 4, Value: 7}, {Timestamp: 5, Value: 7}},
					},
				},
			},
		},
		{
			name: "NaNHandling",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: math.NaN()}, {Timestamp: 2, Value: 3}, {Timestamp: 3, Value: math.NaN()}, {Timestamp: 4, Value: 7}, {Timestamp: 5, Value: 9}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 1, Value: math.NaN()}, {Timestamp: 2, Value: 3}, {Timestamp: 3, Value: 5}, {Timestamp: 4, Value: 8}, {Timestamp: 5, Value: 9}},
					},
				},
			},
		},
		{
			name: "UniformValues",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: 7}, {Timestamp: 2, Value: 7}, {Timestamp: 3, Value: 7}, {Timestamp: 4, Value: 7}, {Timestamp: 5, Value: 7}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 1, Value: 7}, {Timestamp: 2, Value: 7}, {Timestamp: 3, Value: 7}, {Timestamp: 4, Value: 7}, {Timestamp: 5, Value: 7}},
					},
				},
			},
		},
		{
			name: "SingleValueSeries",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: 9}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 1, Value: 9}},
					},
				},
			},
		},
		{
			name: "EmptySeries",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{},
					},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := funcMedian3(tt.args.result)
			for j, series := range got.Series {
				for k, point := range series.Points {
					if point.Value != tt.want.Series[j].Points[k].Value && !math.IsNaN(tt.want.Series[j].Points[k].Value) {
						t.Errorf("funcMedian3() = %v, want %v", point.Value, tt.want.Series[j].Points[k].Value)
					}
				}
			}
		})
	}
}

func TestFuncMedian5(t *testing.T) {
	type args struct {
		result *v3.Result
	}

	tests := []struct {
		name string
		args args
		want *v3.Result
	}{
		{
			name: "Values",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: 5}, {Timestamp: 2, Value: 3}, {Timestamp: 3, Value: 8}, {Timestamp: 4, Value: 2}, {Timestamp: 5, Value: 7}, {Timestamp: 6, Value: 9}, {Timestamp: 7, Value: 1}, {Timestamp: 8, Value: 4}, {Timestamp: 9, Value: 6}, {Timestamp: 10, Value: 10}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 1, Value: 5}, {Timestamp: 2, Value: 3}, {Timestamp: 3, Value: 5}, {Timestamp: 4, Value: 7}, {Timestamp: 5, Value: 7}, {Timestamp: 6, Value: 4}, {Timestamp: 7, Value: 6}, {Timestamp: 8, Value: 6}, {Timestamp: 9, Value: 6}, {Timestamp: 10, Value: 10}},
					},
				},
			},
		},
		{
			name: "NaNHandling",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: math.NaN()}, {Timestamp: 2, Value: 3}, {Timestamp: 3, Value: math.NaN()}, {Timestamp: 4, Value: 7}, {Timestamp: 5, Value: 9}, {Timestamp: 6, Value: 1}, {Timestamp: 7, Value: 4}, {Timestamp: 8, Value: 6}, {Timestamp: 9, Value: 10}, {Timestamp: 10, Value: 2}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 1, Value: math.NaN()}, {Timestamp: 2, Value: 3}, {Timestamp: 3, Value: 7}, {Timestamp: 4, Value: 5}, {Timestamp: 5, Value: 5.5}, {Timestamp: 6, Value: 6}, {Timestamp: 7, Value: 6}, {Timestamp: 8, Value: 4}, {Timestamp: 9, Value: 10}, {Timestamp: 10, Value: 2}},
					},
				},
			},
		},
		{
			name: "UniformValues",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: 7}, {Timestamp: 2, Value: 7}, {Timestamp: 3, Value: 7}, {Timestamp: 4, Value: 7}, {Timestamp: 5, Value: 7}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 1, Value: 7}, {Timestamp: 2, Value: 7}, {Timestamp: 3, Value: 7}, {Timestamp: 4, Value: 7}, {Timestamp: 5, Value: 7}},
					},
				},
			},
		},
		{
			name: "SingleValueSeries",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: 9}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 1, Value: 9}},
					},
				},
			},
		},
		{
			name: "EmptySeries",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		got := funcMedian5(tt.args.result)
		for j, series := range got.Series {
			for k, point := range series.Points {
				if point.Value != tt.want.Series[j].Points[k].Value && !math.IsNaN(tt.want.Series[j].Points[k].Value) {
					t.Errorf("funcMedian5() = %v, want %v", point.Value, tt.want.Series[j].Points[k].Value)
				}
			}
		}
	}
}

func TestFuncRunningDiff(t *testing.T) {
	type args struct {
		result *v3.Result
	}

	tests := []struct {
		name string
		args args
		want *v3.Result
	}{
		{
			name: "test funcRunningDiff",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: 1}, {Timestamp: 2, Value: 2}, {Timestamp: 3, Value: 3}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 2, Value: 1}, {Timestamp: 3, Value: 1}},
					},
				},
			},
		},
		{
			name: "test funcRunningDiff with start number as 8",
			args: args{
				result: &v3.Result{
					Series: []*v3.Series{
						{
							Points: []v3.Point{{Timestamp: 1, Value: 8}, {Timestamp: 2, Value: 8}, {Timestamp: 3, Value: 8}},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Points: []v3.Point{{Timestamp: 2, Value: 0}, {Timestamp: 3, Value: 0}},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := funcRunningDiff(tt.args.result)
			for j, series := range got.Series {
				if len(series.Points) != len(tt.want.Series[j].Points) {
					t.Errorf("funcRunningDiff() = len(series.Points) %v, len(tt.want.Series[j].Points) %v", len(series.Points), len(tt.want.Series[j].Points))
				}
				for k, point := range series.Points {
					if point.Value != tt.want.Series[j].Points[k].Value {
						t.Errorf("funcRunningDiff() = %v, want %v", point.Value, tt.want.Series[j].Points[k].Value)
					}
				}
			}
		})
	}
}
