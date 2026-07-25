package implinframonitoring

import (
	"reflect"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
)

func TestPodStatusFilterClause(t *testing.T) {
	tests := []struct {
		name       string
		status     inframonitoringtypes.PodStatus
		wantClause string
		wantArgs   []any
	}{
		{
			name:       "empty status yields no clause",
			status:     inframonitoringtypes.PodStatus{},
			wantClause: "",
			wantArgs:   nil,
		},
		{
			name:       "crashloopbackoff pushes lowercased arg",
			status:     inframonitoringtypes.PodStatusCrashLoopBackOff,
			wantClause: " WHERE lower(display_status) = ? ",
			wantArgs:   []any{"crashloopbackoff"},
		},
		{
			name:       "running pushes lowercased arg",
			status:     inframonitoringtypes.PodStatusRunning,
			wantClause: " WHERE lower(display_status) = ? ",
			wantArgs:   []any{"running"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotClause, gotArgs := podStatusFilterClause(tt.status)
			if gotClause != tt.wantClause {
				t.Errorf("podStatusFilterClause(%v) clause = %q, want %q", tt.status, gotClause, tt.wantClause)
			}
			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("podStatusFilterClause(%v) args = %v, want %v", tt.status, gotArgs, tt.wantArgs)
			}
		})
	}
}
