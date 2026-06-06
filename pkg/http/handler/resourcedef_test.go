package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResourceDefValidate(t *testing.T) {
	// Related on a lifecycle verb is rejected.
	err := ResourceDef{Resource: coretypes.ResourceServiceAccount, Verb: coretypes.VerbCreate, Related: &RelatedResource{Resource: coretypes.ResourceRole}}.validate()
	require.Error(t, err)

	// Attach is valid for service account and may carry Related.
	err = ResourceDef{Resource: coretypes.ResourceServiceAccount, Verb: coretypes.VerbAttach, Related: &RelatedResource{Resource: coretypes.ResourceRole}}.validate()
	require.NoError(t, err)

	// Verb not valid for resource: factor-api-key disallows attach.
	err = ResourceDef{Resource: coretypes.ResourceMetaResourceFactorAPIKey, Verb: coretypes.VerbAttach}.validate()
	require.Error(t, err)
}

func TestStandardSelectors(t *testing.T) {
	ctx := context.Background()
	claims := authtypes.Claims{}

	wildcard, err := WildcardSelector(ctx, coretypes.ResourceServiceAccount, "ignored", claims)
	require.NoError(t, err)
	require.Len(t, wildcard, 1)
	assert.Equal(t, coretypes.WildCardSelectorString, wildcard[0].String())

	// IDSelector errors on a missing id — no silent wildcard fallback.
	_, err = IDSelector(ctx, coretypes.ResourceServiceAccount, "", claims)
	require.Error(t, err)

	id := "0199c47d-f61b-7833-bc5f-c0730f12f046"
	selectors, err := IDSelector(ctx, coretypes.ResourceServiceAccount, id, claims)
	require.NoError(t, err)
	require.Len(t, selectors, 2)
	assert.Equal(t, id, selectors[0].String())
	assert.Equal(t, coretypes.WildCardSelectorString, selectors[1].String())
}

func TestResolveRequestAndFinalize(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/x", nil)
	req = mux.SetURLVars(req, map[string]string{"id": "sa-1"})
	body := []byte(`{"id":"role-1","channels":["c1","c2"]}`)

	defs := []ResourceSpec{
		ResourceDef{
			Resource: coretypes.ResourceServiceAccount, Verb: coretypes.VerbAttach,
			ID: PathParam("id"), Selector: IDSelector,
			Related: &RelatedResource{Resource: coretypes.ResourceRole, ID: BodyJSONPath("id")},
		},
		ResourceDef{
			Resource: coretypes.ResourceMetaResourceFactorAPIKey, Verb: coretypes.VerbCreate,
			ID: ResponseJSONPath("data.id"), Selector: WildcardSelector,
		},
		ResourcesDef{
			Resource: coretypes.ResourceMetaResourceNotificationChannel, Verb: coretypes.VerbAttach,
			IDs: BodyJSONArray("channels"), Selector: IDSelector,
		},
	}

	resolved := ResolveRequest(defs, ExtractorContext{Request: req, RequestBody: body})

	// 1 service account + 1 create + 2 channels (fan-out).
	require.Len(t, resolved, 4)
	assert.Equal(t, "sa-1", resolved[0].ID)
	require.NotNil(t, resolved[0].Related)
	assert.Equal(t, "role-1", resolved[0].Related.ID)
	assert.Equal(t, "", resolved[1].ID, "response-phase id is empty pre-handler")
	assert.Equal(t, "c1", resolved[2].ID)
	assert.Equal(t, "c2", resolved[3].ID)

	assert.True(t, HasResponseIDs(resolved))

	// Audit finalizes the response-phase id once the response body is present.
	FinalizeResponseIDs(resolved, ExtractorContext{ResponseBody: []byte(`{"data":{"id":"key-9"}}`)})
	assert.Equal(t, "key-9", resolved[1].ID)
}

func TestExtractorPhases(t *testing.T) {
	assert.Equal(t, phaseRequest, PathParam("id").phase)
	assert.Equal(t, phaseRequest, BodyJSONPath("id").phase)
	assert.Equal(t, phaseRequest, BodyJSONArray("ids").phase)
	assert.Equal(t, phaseResponse, ResponseJSONPath("data.id").phase)

	// ResponseJSONPath yields "" when the response body is absent (pre-handler).
	id, err := ResponseJSONPath("data.id").fn(ExtractorContext{})
	require.NoError(t, err)
	assert.Equal(t, "", id)
}
