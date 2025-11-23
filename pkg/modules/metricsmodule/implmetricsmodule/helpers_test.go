package implmetricsmodule

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestResolveOrderBy(t *testing.T) {
	tests := []struct {
		name    string
		order   *qbtypes.OrderBy
		wantCfg orderConfig
		wantErr bool
	}{
		{
			name:  "nil order uses defaults",
			order: nil,
			wantCfg: orderConfig{
				sqlColumn:      metrictypes.OrderByTimeSeries.StringValue(),
				direction:      strings.ToUpper(qbtypes.OrderDirectionDesc.StringValue()),
				orderBySamples: false,
			},
		},
		{
			name: "timeseries asc",
			order: &qbtypes.OrderBy{
				Key: qbtypes.OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: metrictypes.OrderByTimeSeries.StringValue(),
					},
				},
				Direction: qbtypes.OrderDirectionAsc,
			},
			wantCfg: orderConfig{
				sqlColumn:      metrictypes.OrderByTimeSeries.StringValue(),
				direction:      strings.ToUpper(qbtypes.OrderDirectionAsc.StringValue()),
				orderBySamples: false,
			},
		},
		{
			name: "samples desc (defer real ordering until samples computed)",
			order: &qbtypes.OrderBy{
				Key: qbtypes.OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: metrictypes.OrderBySamples.StringValue(),
					},
				},
				Direction: qbtypes.OrderDirectionDesc,
			},
			wantCfg: orderConfig{
				// Note: sqlColumn remains timeSeries; real ordering done after sample counts exist
				sqlColumn:      metrictypes.OrderByTimeSeries.StringValue(),
				direction:      strings.ToUpper(qbtypes.OrderDirectionDesc.StringValue()),
				orderBySamples: true,
			},
		},
		{
			name: "invalid column",
			order: &qbtypes.OrderBy{
				Key: qbtypes.OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: "unknown_col",
					},
				},
				Direction: qbtypes.OrderDirectionAsc,
			},
			wantErr: true,
		},
		{
			name: "invalid direction",
			order: &qbtypes.OrderBy{
				Key: qbtypes.OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: metrictypes.OrderByTimeSeries.StringValue(),
					},
				},
				Direction: qbtypes.OrderDirection{valuer.NewString("SIDEWAYS")},
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
