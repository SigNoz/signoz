package auditortypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEventName(t *testing.T) {
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
			name:         "session login",
			resourceName: "session",
			action:       ActionLogin,
			want:         "session.login",
		},
		{
			name:         "session logout",
			resourceName: "session",
			action:       ActionLogout,
			want:         "session.logout",
		},
		{
			name:         "dashboard locked",
			resourceName: "dashboard",
			action:       ActionLock,
			want:         "dashboard.locked",
		},
		{
			name:         "dashboard unlocked",
			resourceName: "dashboard",
			action:       ActionUnlock,
			want:         "dashboard.unlocked",
		},
		{
			name:         "serviceaccount apikey revoked",
			resourceName: "serviceaccount.apikey",
			action:       ActionRevoke,
			want:         "serviceaccount.apikey.revoked",
		},
		{
			name:         "user role changed",
			resourceName: "user.role",
			action:       ActionUpdate,
			want:         "user.role.updated",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := EventName(tt.resourceName, tt.action)
			assert.Equal(t, tt.want, got)
		})
	}
}
