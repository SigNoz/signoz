package inframonitoringtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestPostableJobs_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     *PostableJobs
		wantErr bool
	}{
		{
			name: "valid request",
			req: &PostableJobs{
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
			req: &PostableJobs{
				Start:  0,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time negative",
			req: &PostableJobs{
				Start:  -1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "end time zero",
			req: &PostableJobs{
				Start:  1000,
				End:    0,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time greater than end time",
			req: &PostableJobs{
				Start:  2000,
				End:    1000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time equal to end time",
			req: &PostableJobs{
				Start:  1000,
				End:    1000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit zero",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  0,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit negative",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  -10,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit exceeds max",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  5001,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "offset negative",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: -5,
			},
			wantErr: true,
		},
		{
			name: "orderBy nil is valid",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key cpu and direction asc",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: JobsOrderByCPU,
						},
					},
					Direction: qbtypes.OrderDirectionAsc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key memory_limit and direction desc",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: JobsOrderByMemoryLimit,
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key desired_successful_pods and direction desc",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: JobsOrderByDesiredSuccessfulPods,
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key active_pods and direction asc",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: JobsOrderByActivePods,
						},
					},
					Direction: qbtypes.OrderDirectionAsc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key failed_pods",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: JobsOrderByFailedPods,
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key successful_pods",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: JobsOrderBySuccessfulPods,
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with restarts key is rejected",
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "restarts",
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: true,
		},
		{
			name: "orderBy with invalid key",
			req: &PostableJobs{
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
			req: &PostableJobs{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: JobsOrderByCPU,
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
