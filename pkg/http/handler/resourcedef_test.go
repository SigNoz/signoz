package handler

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func userRoleAttachDef(optionalTargets bool) AttachDetachSiblingResourceDef {
	return AttachDetachSiblingResourceDef{
		Verb:            coretypes.VerbAttach,
		Category:        coretypes.ActionCategoryAccessControl,
		SourceResource:  coretypes.ResourceUser,
		SourceIDs:       coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
		SourceSelector:  coretypes.WildcardSelector,
		TargetResource:  coretypes.NewResourceRole(),
		TargetIDs:       coretypes.BodyJSONArray("userRoles.#.id"),
		TargetSelector:  coretypes.WildcardSelector,
		OptionalTargets: optionalTargets,
	}
}

func TestAttachDetachSiblingResourceDefOptionalTargets(t *testing.T) {
	t.Run("absent target list resolves to no checks", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: []byte(`{"name":"jane"}`)}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(true)}, ec)
		assert.Empty(t, resolved)
	})

	t.Run("empty target list resolves to no checks", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: []byte(`{"userRoles":[]}`)}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(true)}, ec)
		assert.Empty(t, resolved)
	})

	t.Run("present targets resolve the attach as usual", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: []byte(`{"userRoles":[{"id":"role-a"},{"id":"role-b"}]}`)}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(true)}, ec)
		require.Len(t, resolved, 1)

		withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
		require.True(t, ok)
		assert.NoError(t, resolved[0].Err())
		assert.Equal(t, []string{"role-a", "role-b"}, withTarget.TargetIDs())
	})

	t.Run("malformed target entry still fails closed", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: []byte(`{"userRoles":[{"id":""}]}`)}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(true)}, ec)
		require.Len(t, resolved, 1)

		withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
		require.True(t, ok)
		assert.Equal(t, []string{""}, withTarget.TargetIDs())
	})

	t.Run("without the flag the empty-id contract is preserved", func(t *testing.T) {
		ec := coretypes.ExtractorContext{RequestBody: []byte(`{"name":"jane"}`)}
		resolved := ResolveRequest([]ResourceDef{userRoleAttachDef(false)}, ec)
		require.Len(t, resolved, 1)

		withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
		require.True(t, ok)
		assert.Equal(t, []string{""}, withTarget.TargetIDs())
	})
}
