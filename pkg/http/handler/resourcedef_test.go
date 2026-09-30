package handler

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAttachDetachSiblingResourceDefResolvesNothingWithoutLinks(t *testing.T) {
	type body struct{ RoleIDs []string }
	def := AttachDetachSiblingResourceDef{
		Verb:           coretypes.VerbAttach,
		Category:       coretypes.ActionCategoryAccessControl,
		SourceResource: coretypes.ResourceUser,
		SourceIDs:      coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
		SourceSelector: coretypes.WildcardSelector,
		TargetResource: coretypes.ResourceRole,
		TargetIDs:      coretypes.BodyFields(func(req *body) []string { return req.RoleIDs }),
		TargetSelector: coretypes.IDSelector,
	}

	testCases := []struct {
		name              string
		roleIDs           []string
		expectedResolved  int
		expectedTargetIDs []string
	}{
		{name: "NoRoles_ResolvesNothing", roleIDs: nil, expectedResolved: 0},
		{name: "OneRole_ResolvesOne", roleIDs: []string{"signoz-viewer"}, expectedResolved: 1, expectedTargetIDs: []string{"signoz-viewer"}},
		{name: "TwoRoles_ResolvesOneWithBothTargets", roleIDs: []string{"signoz-viewer", "signoz-editor"}, expectedResolved: 1, expectedTargetIDs: []string{"signoz-viewer", "signoz-editor"}},
		{name: "EmptyRoleID_KeepsFailingClosed", roleIDs: []string{""}, expectedResolved: 1, expectedTargetIDs: []string{""}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			resolved := ResolveRequest([]ResourceDef{def}, coretypes.ExtractorContext{RequestBody: &body{RoleIDs: testCase.roleIDs}})
			require.Len(t, resolved, testCase.expectedResolved)
			if testCase.expectedResolved == 0 {
				return
			}

			withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
			require.True(t, ok)
			assert.NoError(t, withTarget.Err())
			assert.Equal(t, []string{""}, withTarget.SourceIDs())
			assert.Equal(t, testCase.expectedTargetIDs, withTarget.TargetIDs())
		})
	}
}

func TestAttachDetachSiblingResourceDefKeepsEmptySingleID(t *testing.T) {
	type body struct{ RoleID string }
	def := AttachDetachSiblingResourceDef{
		Verb:           coretypes.VerbAttach,
		Category:       coretypes.ActionCategoryAccessControl,
		SourceResource: coretypes.ResourceUser,
		SourceIDs:      coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
		SourceSelector: coretypes.WildcardSelector,
		TargetResource: coretypes.ResourceRole,
		TargetIDs:      coretypes.OneID(coretypes.BodyField(func(req *body) string { return req.RoleID })),
		TargetSelector: coretypes.IDSelector,
	}

	resolved := ResolveRequest([]ResourceDef{def}, coretypes.ExtractorContext{RequestBody: &body{}})
	require.Len(t, resolved, 1)

	withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
	require.True(t, ok)
	assert.Equal(t, []string{""}, withTarget.TargetIDs())
}
