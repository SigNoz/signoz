package ruler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes/alertmanagertypestest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type stubRuler struct {
	Ruler
	maintenanceStore alertmanagertypes.MaintenanceStore
}

func (stub stubRuler) MaintenanceStore() alertmanagertypes.MaintenanceStore {
	return stub.maintenanceStore
}

func TestDiffLinks(t *testing.T) {
	testCases := []struct {
		name         string
		stored       []string
		incoming     []string
		wantAttached []string
		wantDetached []string
	}{
		{
			name:         "BothEmpty_NothingChanges",
			wantAttached: []string{},
			wantDetached: []string{},
		},
		{
			name:         "NoStored_EverythingAttaches",
			incoming:     []string{"slack", "pager"},
			wantAttached: []string{"slack", "pager"},
			wantDetached: []string{},
		},
		{
			name:         "NoIncoming_EverythingDetaches",
			stored:       []string{"slack", "pager"},
			wantAttached: []string{},
			wantDetached: []string{"slack", "pager"},
		},
		{
			name:         "Unchanged_NothingChanges",
			stored:       []string{"slack", "pager"},
			incoming:     []string{"pager", "slack"},
			wantAttached: []string{},
			wantDetached: []string{},
		},
		{
			name:         "OneAddedOneRemoved_BothSidesReported",
			stored:       []string{"slack", "pager"},
			incoming:     []string{"slack", "email"},
			wantAttached: []string{"email"},
			wantDetached: []string{"pager"},
		},
		{
			name:         "DuplicateIncoming_CollapsedOnce",
			incoming:     []string{"slack", "slack"},
			wantAttached: []string{"slack"},
			wantDetached: []string{},
		},
		{
			name:         "DuplicateStored_CollapsedOnce",
			stored:       []string{"pager", "pager"},
			wantAttached: []string{},
			wantDetached: []string{"pager"},
		},
		{
			name:         "IncomingOrderPreserved",
			stored:       []string{"keep"},
			incoming:     []string{"zebra", "keep", "apple"},
			wantAttached: []string{"zebra", "apple"},
			wantDetached: []string{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			attached, detached := diffLinks(testCase.stored, testCase.incoming)

			assert.Equal(t, testCase.wantAttached, attached)
			assert.Equal(t, testCase.wantDetached, detached)
		})
	}
}

func TestDiffDowntimeRuleLinks(t *testing.T) {
	testCases := []struct {
		name         string
		stored       []string
		incoming     []string
		wantAttached []string
		wantDetached []string
	}{
		{
			name:         "AllToAll_NoChange",
			stored:       nil,
			incoming:     []string{"*"},
			wantAttached: []string{},
			wantDetached: []string{},
		},
		{
			name:         "NarrowFromAllToOne_DetachesAllAttachesOne",
			stored:       nil,
			incoming:     []string{"r1"},
			wantAttached: []string{"r1"},
			wantDetached: []string{"*"},
		},
		{
			name:         "WidenFromOneToAll_DetachesOneAttachesAll",
			stored:       []string{"r1"},
			incoming:     []string{"*"},
			wantAttached: []string{"*"},
			wantDetached: []string{"r1"},
		},
		{
			name:         "SwapRules_DiffsIDs",
			stored:       []string{"r1"},
			incoming:     []string{"r2"},
			wantAttached: []string{"r2"},
			wantDetached: []string{"r1"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			attached, detached := diffDowntimeRuleLinks(testCase.stored, testCase.incoming)

			assert.ElementsMatch(t, testCase.wantAttached, attached)
			assert.ElementsMatch(t, testCase.wantDetached, detached)
		})
	}
}

func TestDowntimeRuleIDsExtractor(t *testing.T) {
	testCases := []struct {
		name    string
		body    string
		wantIDs []string
	}{
		{
			name:    "MissingAlertIds_AllRules",
			body:    `{"name": "window"}`,
			wantIDs: []string{"*"},
		},
		{
			name:    "EmptyAlertIds_AllRules",
			body:    `{"alertIds": []}`,
			wantIDs: []string{"*"},
		},
		{
			name:    "ExplicitAlertIds_Kept",
			body:    `{"alertIds": ["r1", "r2"]}`,
			wantIDs: []string{"r1", "r2"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ids, err := DowntimeRuleIDsExtractor.Fn(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})

			require.NoError(t, err)
			assert.Equal(t, testCase.wantIDs, ids)
		})
	}
}

func TestDowntimeDiffExtractorScopesStoreByOrg(t *testing.T) {
	orgID := valuer.GenerateUUID()
	scheduleID := valuer.GenerateUUID()

	testCases := []struct {
		name      string
		side      diffSide
		hasClaims bool
		wantIDs   []string
		wantErr   bool
	}{
		{name: "AttachSide_UsesClaimsOrg", side: attachedSide, hasClaims: true, wantIDs: []string{"r2"}},
		{name: "DetachSide_UsesClaimsOrg", side: detachedSide, hasClaims: true, wantIDs: []string{"r1"}},
		{name: "NoClaims_Error", side: attachedSide, wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			store := alertmanagertypestest.NewMockMaintenanceStore(t)
			if testCase.hasClaims {
				store.EXPECT().GetPlannedMaintenanceByID(mock.Anything, orgID.StringValue(), scheduleID).Return(&alertmanagertypes.PlannedMaintenance{RuleIDs: []string{"r1"}}, nil)
			}

			req := httptest.NewRequest(http.MethodPut, "/api/v1/downtime_schedules/"+scheduleID.StringValue(), nil)
			req = mux.SetURLVars(req, map[string]string{"id": scheduleID.StringValue()})
			if testCase.hasClaims {
				req = req.WithContext(authtypes.NewContextWithClaims(req.Context(), authtypes.Claims{OrgID: orgID.StringValue()}))
			}

			ids, err := newDowntimeDiffExtractor(stubRuler{maintenanceStore: store}, testCase.side).Fn(coretypes.ExtractorContext{Request: req, RequestBody: []byte(`{"alertIds": ["r2"]}`)})
			if testCase.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.wantIDs, ids)
		})
	}
}
