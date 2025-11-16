package implmetricsmodule

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
)

func TestResolveOrderBy(t *testing.T) {
	tests := []struct {
		name    string
		order   *metricsmoduletypes.OrderBy
		wantCfg orderConfig
		wantErr bool
	}{
		{
			name:  "nil order uses defaults",
			order: nil,
			wantCfg: orderConfig{
				sqlColumn:      orderByColNameTimeSeries,
				direction:      orderByDirectionDesc,
				orderBySamples: false,
			},
		},
		{
			name: "timeseries asc",
			order: &metricsmoduletypes.OrderBy{
				ColumnName: orderByColNameTimeSeries,
				Order:      orderByDirectionAsc,
			},
			wantCfg: orderConfig{
				sqlColumn:      orderByColNameTimeSeries,
				direction:      orderByDirectionAsc,
				orderBySamples: false,
			},
		},
		{
			name: "samples desc (defer real ordering until samples computed)",
			order: &metricsmoduletypes.OrderBy{
				ColumnName: orderByColNameSamples,
				Order:      orderByDirectionDesc,
			},
			wantCfg: orderConfig{
				// Note: sqlColumn remains timeSeries; real ordering done after sample counts exist
				sqlColumn:      orderByColNameTimeSeries,
				direction:      orderByDirectionDesc,
				orderBySamples: true,
			},
		},
		{
			name: "metric_name default direction (desc)",
			order: &metricsmoduletypes.OrderBy{
				ColumnName: orderByColNameMetricName,
				// Order omitted
			},
			wantCfg: orderConfig{
				sqlColumn:      orderByColNameMetricName,
				direction:      orderByDirectionDesc,
				orderBySamples: false,
			},
		},
		{
			name: "invalid column",
			order: &metricsmoduletypes.OrderBy{
				ColumnName: "unknown_col",
				Order:      orderByDirectionAsc,
			},
			wantErr: true,
		},
		{
			name: "invalid direction",
			order: &metricsmoduletypes.OrderBy{
				ColumnName: orderByColNameTimeSeries,
				Order:      "SIDEWAYS",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveOrderBy(tt.order)
			if (err != nil) != tt.wantErr {
				t.Fatalf("resolveOrderBy() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr {
				return
			}
			if got.sqlColumn != tt.wantCfg.sqlColumn {
				t.Errorf("sqlColumn = %q, want %q", got.sqlColumn, tt.wantCfg.sqlColumn)
			}
			if got.direction != tt.wantCfg.direction {
				t.Errorf("direction = %q, want %q", got.direction, tt.wantCfg.direction)
			}
			if got.orderBySamples != tt.wantCfg.orderBySamples {
				t.Errorf("orderBySamples = %v, want %v", got.orderBySamples, tt.wantCfg.orderBySamples)
			}
		})
	}
}
