package querybuildertypesv5

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestValidateMetricAggregation(t *testing.T) {
	tests := []struct {
		name    string
		agg     MetricAggregation
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid sum aggregation",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.SumType,
				Temporality:      metrictypes.Cumulative,
				TimeAggregation:  metrictypes.TimeAggregationSum,
				SpaceAggregation: metrictypes.SpaceAggregationSum,
			},
			wantErr: false,
		},
		{
			name: "invalid rate on gauge",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.GaugeType,
				Temporality:      metrictypes.Unspecified,
				TimeAggregation:  metrictypes.TimeAggregationRate,
				SpaceAggregation: metrictypes.SpaceAggregationSum,
			},
			wantErr: true,
			errMsg:  "rate/increase aggregation cannot be used with gauge metrics",
		},
		{
			name: "invalid increase on gauge",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.GaugeType,
				Temporality:      metrictypes.Unspecified,
				TimeAggregation:  metrictypes.TimeAggregationIncrease,
				SpaceAggregation: metrictypes.SpaceAggregationSum,
			},
			wantErr: true,
			errMsg:  "rate/increase aggregation cannot be used with gauge metrics",
		},
		{
			name: "valid rate on cumulative",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.SumType,
				Temporality:      metrictypes.Cumulative,
				TimeAggregation:  metrictypes.TimeAggregationRate,
				SpaceAggregation: metrictypes.SpaceAggregationSum,
			},
			wantErr: false,
		},
		{
			name: "valid rate on delta",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.SumType,
				Temporality:      metrictypes.Delta,
				TimeAggregation:  metrictypes.TimeAggregationRate,
				SpaceAggregation: metrictypes.SpaceAggregationSum,
			},
			wantErr: false,
		},
		{
			name: "invalid percentile on non-histogram",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.SumType,
				Temporality:      metrictypes.Cumulative,
				TimeAggregation:  metrictypes.TimeAggregationSum,
				SpaceAggregation: metrictypes.SpaceAggregationPercentile95,
			},
			wantErr: true,
			errMsg:  "percentile aggregation can only be used with histogram",
		},
		{
			name: "valid percentile on histogram",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.HistogramType,
				Temporality:      metrictypes.Delta,
				TimeAggregation:  metrictypes.TimeAggregationSum,
				SpaceAggregation: metrictypes.SpaceAggregationPercentile95,
			},
			wantErr: false,
		},
		{
			name: "valid percentile on exp histogram",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.ExpHistogramType,
				Temporality:      metrictypes.Delta,
				TimeAggregation:  metrictypes.TimeAggregationSum,
				SpaceAggregation: metrictypes.SpaceAggregationPercentile99,
			},
			wantErr: false,
		},
		{
			name: "valid percentile on summary",
			agg: MetricAggregation{
				MetricName:       "test_metric",
				Type:             metrictypes.SummaryType,
				Temporality:      metrictypes.Delta,
				TimeAggregation:  metrictypes.TimeAggregationSum,
				SpaceAggregation: metrictypes.SpaceAggregationPercentile50,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMetricAggregation(tt.agg)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestQueryBuilderQuery_ValidateMetrics(t *testing.T) {
	tests := []struct {
		name    string
		query   QueryBuilderQuery[MetricAggregation]
		reqType RequestType
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid metric query",
			query: QueryBuilderQuery[MetricAggregation]{
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []MetricAggregation{
					{
						MetricName:       "test_metric",
						Type:             metrictypes.SumType,
						Temporality:      metrictypes.Cumulative,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
			},
			reqType: RequestTypeTimeSeries,
			wantErr: false,
		},
		{
			name: "invalid metric query - rate on gauge",
			query: QueryBuilderQuery[MetricAggregation]{
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []MetricAggregation{
					{
						MetricName:       "test_metric",
						Type:             metrictypes.GaugeType,
						Temporality:      metrictypes.Unspecified,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
			},
			reqType: RequestTypeTimeSeries,
			wantErr: true,
			errMsg:  "rate/increase aggregation cannot be used with gauge metrics",
		},
		{
			name: "empty metric name",
			query: QueryBuilderQuery[MetricAggregation]{
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []MetricAggregation{
					{
						MetricName:       "",
						Type:             metrictypes.SumType,
						Temporality:      metrictypes.Cumulative,
						TimeAggregation:  metrictypes.TimeAggregationSum,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
			},
			reqType: RequestTypeTimeSeries,
			wantErr: true,
			errMsg:  "metric name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.query.Validate(tt.reqType)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
