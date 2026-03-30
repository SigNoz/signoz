package auditortypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewEventName(t *testing.T) {
	tests := []struct {
		name         string
		resourceName string
		action       Action
		want         string
	}{
		{
			name:         "dashboard created",
			resourceName: "dashboard",
			action:       ActionCreate,
			want:         "dashboard.created",
		},
		{
			name:         "dashboard updated",
			resourceName: "dashboard",
			action:       ActionUpdate,
			want:         "dashboard.updated",
		},
		{
			name:         "dashboard deleted",
			resourceName: "dashboard",
			action:       ActionDelete,
			want:         "dashboard.deleted",
		},
		{
			name:         "user role updated (sub-resource)",
			resourceName: "user.role",
			action:       ActionUpdate,
			want:         "user.role.updated",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NewEventName(tt.resourceName, tt.action)
			assert.Equal(t, tt.want, got.String())
		})
	}
}
