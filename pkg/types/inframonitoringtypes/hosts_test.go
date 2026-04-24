package inframonitoringtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestHostsListRequest_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     *PostableHosts
		wantErr bool
	}{
		{
			name: "valid request",
			req: &PostableHosts{
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
			req: &PostableHosts{
				Start:  0,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time negative",
			req: &PostableHosts{
				Start:  -1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "end time zero",
			req: &PostableHosts{
				Start:  1000,
				End:    0,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time greater than end time",
			req: &PostableHosts{
				Start:  2000,
				End:    1000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "start time equal to end time",
			req: &PostableHosts{
				Start:  1000,
				End:    1000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit zero",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  0,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit negative",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  -10,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "limit exceeds max",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  5001,
				Offset: 0,
			},
			wantErr: true,
		},
		{
			name: "offset negative",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: -5,
			},
			wantErr: true,
		},
		{
			name: "filter by status ACTIVE",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				Filter: &HostFilter{FilterByStatus: HostStatusActive},
			},
			wantErr: false,
		},
		{
			name: "filter by status INACTIVE",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				Filter: &HostFilter{FilterByStatus: HostStatusInactive},
			},
			wantErr: false,
		},
		{
			name: "filter by status empty (zero value)",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: false,
		},
		{
			name: "filter by status invalid value",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				Filter: &HostFilter{FilterByStatus: HostStatus{valuer.NewString("UNKNOWN")}},
			},
			wantErr: true,
		},
		{
			name: "orderBy nil is valid",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
			},
			wantErr: false,
		},
		{
			name: "orderBy with valid key cpu and direction asc",
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: HostsOrderByCPU,
						},
					},
					Direction: qbtypes.OrderDirectionAsc,
				},
			},
			wantErr: false,
		},
		{
			name: "orderBy with invalid key",
			req: &PostableHosts{
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
			req: &PostableHosts{
				Start:  1000,
				End:    2000,
				Limit:  100,
				Offset: 0,
				OrderBy: &qbtypes.OrderBy{
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: HostsOrderByMemory,
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
