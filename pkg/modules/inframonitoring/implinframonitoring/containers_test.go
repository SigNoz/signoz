package implinframonitoring

import (
	"reflect"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
)

func TestContainerStatusFilterClause(t *testing.T) {
	tests := []struct {
		name       string
		status     inframonitoringtypes.ContainerStatus
		wantClause string
		wantArgs   []any
	}{
		{
			name:       "empty status yields no clause",
			status:     inframonitoringtypes.ContainerStatus{},
			wantClause: "",
			wantArgs:   nil,
		},
		{
			name:       "running pushes lowercased arg",
			status:     inframonitoringtypes.ContainerStatusRunning,
			wantClause: " WHERE lower(display_status) = ? ",
			wantArgs:   []any{"running"},
		},
		{
			name:       "crashloopbackoff pushes lowercased arg",
			status:     inframonitoringtypes.ContainerStatusCrashLoopBackOff,
			wantClause: " WHERE lower(display_status) = ? ",
			wantArgs:   []any{"crashloopbackoff"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotClause, gotArgs := containerStatusFilterClause(tt.status)
			if gotClause != tt.wantClause {
				t.Errorf("containerStatusFilterClause(%v) clause = %q, want %q", tt.status, gotClause, tt.wantClause)
			}
			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("containerStatusFilterClause(%v) args = %v, want %v", tt.status, gotArgs, tt.wantArgs)
			}
		})
	}
}
