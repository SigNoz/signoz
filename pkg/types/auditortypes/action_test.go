package auditortypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestActionPastTense(t *testing.T) {
	tests := []struct {
		action Action
		want   string
	}{
		{ActionCreate, "created"},
		{ActionUpdate, "updated"},
		{ActionDelete, "deleted"},
		{ActionLogin, "login"},
		{ActionLogout, "logout"},
		{ActionLock, "locked"},
		{ActionUnlock, "unlocked"},
		{ActionRevoke, "revoked"},
	}

	for _, tt := range tests {
		t.Run(tt.action.StringValue(), func(t *testing.T) {
			assert.Equal(t, tt.want, tt.action.PastTense())
		})
	}
}

func TestActionEnum(t *testing.T) {
	values := Action{}.Enum()
	assert.Len(t, values, 8)
	assert.Contains(t, values, ActionCreate)
	assert.Contains(t, values, ActionUpdate)
	assert.Contains(t, values, ActionDelete)
	assert.Contains(t, values, ActionLogin)
	assert.Contains(t, values, ActionLogout)
	assert.Contains(t, values, ActionLock)
	assert.Contains(t, values, ActionUnlock)
	assert.Contains(t, values, ActionRevoke)
}

func TestOutcomeEnum(t *testing.T) {
	values := Outcome{}.Enum()
	assert.Len(t, values, 2)
	assert.Contains(t, values, OutcomeSuccess)
	assert.Contains(t, values, OutcomeFailure)
}

func TestPrincipalTypeEnum(t *testing.T) {
	values := PrincipalType{}.Enum()
	assert.Len(t, values, 4)
	assert.Contains(t, values, PrincipalTypeUser)
	assert.Contains(t, values, PrincipalTypeServiceAccount)
	assert.Contains(t, values, PrincipalTypeSystem)
	assert.Contains(t, values, PrincipalTypeAnonymous)
}

func TestActionCategoryEnum(t *testing.T) {
	values := ActionCategory{}.Enum()
	assert.Len(t, values, 4)
	assert.Contains(t, values, CategoryAccessControl)
	assert.Contains(t, values, CategoryConfigurationChange)
	assert.Contains(t, values, CategoryDataAccess)
	assert.Contains(t, values, CategorySystemEvent)
}
