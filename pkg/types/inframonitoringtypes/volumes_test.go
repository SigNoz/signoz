package inframonitoringtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestPostableVolumes_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     *PostableVolumes
		wantErr bool
	}{
		{
			name: "valid request",
			req: &PostableVolumes{
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
			req: &PostableVolumes{
				Start:  0,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time negative",
			req: &PostableVolumes{
				Start:  -1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "end time zero",
			req: &PostableVolumes{
				Start:  1000,
				End:    0,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time greater than end time",
			req: &PostableVolumes{
				Start:  2000,
				End:    1000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time equal to end time",
			req: &PostableVolumes{
				Start:  1000,
				End:    1000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit zero",
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  0,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit negative",
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  -10,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit exceeds max",
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  5001,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "offset negative",
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: -5,
			},
			wantErr: true,
		},
		{
			name: "orderBy nil is valid",
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key usage and direction desc",
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: VolumesOrderByUsage,
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key available and direction asc",
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: VolumesOrderByAvailable,
						},
					},
					Direction: qbtypes.OrderDirectionAsc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key inodes_free",
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: VolumesOrderByInodesFree,
						},
					},
					Direction: qbtypes.OrderDirectionDesc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with invalid key",
			req: &PostableVolumes{
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
			req: &PostableVolumes{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: VolumesOrderByCapacity,
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
