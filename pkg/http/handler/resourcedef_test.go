package handler

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type testPostableUserRole struct {
	ID string `json:"id"`
}

type testPostableUser struct {
	Name      string                 `json:"name"`
	UserRoles []testPostableUserRole `json:"userRoles"`
}

func userRoleAttachDef(optionalTargets bool) AttachDetachSiblingResourceDef {
	return AttachDetachSiblingResourceDef{
		Verb:           coretypes.VerbAttach,
		Category:       coretypes.ActionCategoryAccessControl,
		SourceResource: coretypes.ResourceUser,
		SourceIDs:      coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
		SourceSelector: coretypes.WildcardSelector,
		TargetResource: coretypes.NewResourceRole(),
		TargetIDs: coretypes.BodyFields(func(req *testPostableUser) []string {
			ids := make([]string, 0, len(req.UserRoles))
			for _, role := range req.UserRoles {
				ids = append(ids, role.ID)
			}
			return ids
		}),
		TargetSelector:  coretypes.WildcardSelector,
		OptionalTargets: optionalTargets,
	}
}

func TestAttachDetachSiblingResourceDefOptionalTargets(t *testing.T) {
	t.Run("absent target list resolves to no checks", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: &testPostableUser{Name: "jane"}}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(true)}, ec)
		assert.Empty(t, resolved)
	})

	t.Run("empty target list resolves to no checks", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: &testPostableUser{Name: "jane", UserRoles: []testPostableUserRole{}}}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(true)}, ec)
		assert.Empty(t, resolved)
	})

	t.Run("present targets resolve the attach as usual", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: &testPostableUser{UserRoles: []testPostableUserRole{{ID: "role-a"}, {ID: "role-b"}}}}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(true)}, ec)
		require.Len(t, resolved, 1)

		withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
		require.True(t, ok)
		assert.NoError(t, resolved[0].Err())
		assert.Equal(t, []string{"role-a", "role-b"}, withTarget.TargetIDs())
	})

	t.Run("malformed target entry still fails closed", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: &testPostableUser{UserRoles: []testPostableUserRole{{ID: ""}}}}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(true)}, ec)
		require.Len(t, resolved, 1)

		withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
		require.True(t, ok)
		assert.Equal(t, []string{""}, withTarget.TargetIDs())
	})

	t.Run("without the flag the empty-id contract is preserved", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: &testPostableUser{Name: "jane"}}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(false)}, ec)
		require.Len(t, resolved, 1)

		withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
		require.True(t, ok)
		assert.Equal(t, []string{""}, withTarget.TargetIDs())
	})
}
