package handler

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAttachDetachSiblingResourceDefResolvesNothingWithoutLinks(t *testing.T) {
	def := AttachDetachSiblingResourceDef{
		Verb:           coretypes.VerbAttach,
		Category:       coretypes.ActionCategoryAccessControl,
		SourceResource: coretypes.ResourceUser,
		SourceIDs:      coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
		SourceSelector: coretypes.WildcardSelector,
		TargetResource: coretypes.ResourceRole,
		TargetIDs:      coretypes.BodyJSONArray("userRoles.#.id"),
		TargetSelector: coretypes.IDSelector,
	}

	testCases := []struct {
		name              string
		body              string
		expectedResolved  int
		expectedTargetIDs []string
	}{
		{name: "NoRolesKey_ResolvesNothing", body: `{"email":"jane@example.com"}`, expectedResolved: 0},
		{name: "EmptyRoles_ResolvesNothing", body: `{"userRoles":[]}`, expectedResolved: 0},
		{name: "OneRole_ResolvesOne", body: `{"userRoles":[{"id":"signoz-viewer"}]}`, expectedResolved: 1, expectedTargetIDs: []string{"signoz-viewer"}},
		{name: "TwoRoles_ResolvesOneWithBothTargets", body: `{"userRoles":[{"id":"signoz-viewer"},{"id":"signoz-editor"}]}`, expectedResolved: 1, expectedTargetIDs: []string{"signoz-viewer", "signoz-editor"}},
		{name: "EmptyRoleID_KeepsFailingClosed", body: `{"userRoles":[{"id":""}]}`, expectedResolved: 1, expectedTargetIDs: []string{""}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			resolved := ResolveRequest([]ResourceDef{def}, coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
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
	def := AttachDetachSiblingResourceDef{
		Verb:           coretypes.VerbAttach,
		Category:       coretypes.ActionCategoryAccessControl,
		SourceResource: coretypes.ResourceUser,
		SourceIDs:      coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
		SourceSelector: coretypes.WildcardSelector,
		TargetResource: coretypes.ResourceRole,
		TargetIDs:      coretypes.OneID(coretypes.BodyJSONPath("roleId")),
		TargetSelector: coretypes.IDSelector,
	}

	resolved := ResolveRequest([]ResourceDef{def}, coretypes.ExtractorContext{RequestBody: []byte(`{"userId":"u1"}`)})
	require.Len(t, resolved, 1)

	withTarget, ok := resolved[0].(coretypes.ResolvedResourceWithTargetResource)
	require.True(t, ok)
	assert.Equal(t, []string{""}, withTarget.TargetIDs())
}
