package inframonitoringtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestPostableClusters_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     *PostableClusters
		wantErr bool
	}{
		{
			name: "valid request",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: false,
		},
		{
			name:    "nil request",
			req:     nil,
			wantErr: true,
		},
		{
			name: "start time zero",
			req: &PostableClusters{
				Start:  0,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time negative",
			req: &PostableClusters{
				Start:  -1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "end time zero",
			req: &PostableClusters{
				Start:  1000,
				End:    0,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time greater than end time",
			req: &PostableClusters{
				Start:  2000,
				End:    1000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time equal to end time",
			req: &PostableClusters{
				Start:  1000,
				End:    1000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit zero",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  0,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit negative",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  -10,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit exceeds max",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  5001,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "offset negative",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: -5,
			},
			wantErr: true,
		},
		{
			name: "orderBy nil is valid",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key cpu and direction asc",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: ClustersOrderByCPU,
						},
					},
					Direction: qbtypes.OrderDirectionAsc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key cpu_allocatable and direction desc",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: ClustersOrderByCPUAllocatable,
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key memory and direction desc",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: ClustersOrderByMemory,
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key memory_allocatable and direction asc",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: ClustersOrderByMemoryAllocatable,
						},
					},
					Direction: qbtypes.OrderDirectionAsc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with condition key is rejected",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "condition",
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: true,
		},
		{
			name: "orderBy with pod_phase key is rejected",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "pod_phase",
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: true,
		},
		{
			name: "orderBy with invalid key",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "unknown",
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: true,
		},
		{
			name: "orderBy with valid key but invalid direction",
			req: &PostableClusters{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: ClustersOrderByMemory,
						},
					},
					Direction: qbtypes.OrderDirection{String: valuer.NewString("invalid")},
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				require.Error(t, err)
				require.True(t, errors.Ast(err, errors.TypeInvalidInput), "expected error to be of type InvalidInput")
			} else {
				require.NoError(t, err)
			}
		})
	}
}
