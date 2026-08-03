package implinframonitoring

import (
	"reflect"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/huandu/go-sqlbuilder"
)

func TestApplyPodStatusFilter(t *testing.T) {
	tests := []struct {
		name      string
		statuses  []inframonitoringtypes.PodStatus
		wantWhere bool
		wantArgs  []any
	}{
		{
			name:      "empty set yields no clause",
			statuses:  nil,
			wantWhere: false,
			wantArgs:  nil,
		},
		{
			name:      "single status pushes lowercased arg via IN",
			statuses:  []inframonitoringtypes.PodStatus{inframonitoringtypes.PodStatusRunning},
			wantWhere: true,
			wantArgs:  []any{"running"},
		},
		{
			name: "multiple statuses push lowercased args via IN",
			statuses: []inframonitoringtypes.PodStatus{
				inframonitoringtypes.PodStatusRunning,
				inframonitoringtypes.PodStatusCrashLoopBackOff,
			},
			wantWhere: true,
			wantArgs:  []any{"running", "crashloopbackoff"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cb := sqlbuilder.NewSelectBuilder()
			cb.Select("pod_uid")
			cb.From("pod_status")
			applyPodStatusFilter(cb, tt.statuses)
			sql, args := cb.BuildWithFlavor(sqlbuilder.ClickHouse)

			hasWhere := strings.Contains(sql, "lower(display_status) IN (")
			if hasWhere != tt.wantWhere {
				t.Errorf("applyPodStatusFilter(%v) sql = %q, wantWhere = %v", tt.statuses, sql, tt.wantWhere)
			}
			if len(tt.wantArgs) == 0 {
				if len(args) != 0 {
					t.Errorf("applyPodStatusFilter(%v) args = %v, want none", tt.statuses, args)
				}
			} else if !reflect.DeepEqual(args, tt.wantArgs) {
				t.Errorf("applyPodStatusFilter(%v) args = %v, want %v", tt.statuses, args, tt.wantArgs)
			}
		})
	}
}
