package implinframonitoring

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
)

func TestApplyContainerStatusFilter(t *testing.T) {
	tests := []struct {
		name      string
		statuses  []inframonitoringtypes.ContainerStatus
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
			statuses:  []inframonitoringtypes.ContainerStatus{inframonitoringtypes.ContainerStatusRunning},
			wantWhere: true,
			wantArgs:  []any{"running"},
		},
		{
			name: "multiple statuses push lowercased args via IN",
			statuses: []inframonitoringtypes.ContainerStatus{
				inframonitoringtypes.ContainerStatusRunning,
				inframonitoringtypes.ContainerStatusCrashLoopBackOff,
			},
			wantWhere: true,
			wantArgs:  []any{"running", "crashloopbackoff"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cb := sqlbuilder.NewSelectBuilder()
			cb.Select("pod_uid")
			cb.From("container_status")
			applyContainerStatusFilter(cb, tt.statuses)
			sql, args := cb.BuildWithFlavor(sqlbuilder.ClickHouse)

			hasWhere := strings.Contains(sql, "lower(display_status) IN (")
			assert.Equal(t, tt.wantWhere, hasWhere)
			if len(tt.wantArgs) == 0 {
				assert.Empty(t, args)
			} else {
				assert.Equal(t, tt.wantArgs, args)
			}
		})
	}
}
