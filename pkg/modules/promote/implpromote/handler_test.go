package implpromote

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockModule struct {
	promotePathsCalled bool
}

func (m *mockModule) ListPromotedPaths(ctx context.Context, filters promotetypes.ListPromotedPathsFilters) ([]promotetypes.PromotePath, error) {
	return nil, nil
}

func (m *mockModule) PromotePaths(ctx context.Context, paths ...*promotetypes.PromotePath) error {
	m.promotePathsCalled = true
	return nil
}

func TestPromotePathsRequestValidation(t *testing.T) {
	validPath := &promotetypes.PromotePath{Signal: "logs", Context: "body", Path: "user.name", Promote: true}

	overCap := make([]*promotetypes.PromotePath, maxPathsPerRequest+1)
	for idx := range overCap {
		overCap[idx] = validPath
	}

	testCases := []struct {
		name           string
		body           any
		wantStatus     int
		wantModuleCall bool
	}{
		{
			name:           "ValidRequest_ModuleCalled",
			body:           []*promotetypes.PromotePath{validPath},
			wantStatus:     http.StatusCreated,
			wantModuleCall: true,
		},
		{
			name:       "NullPath_Rejected",
			body:       []*promotetypes.PromotePath{nil},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "BatchOverCap_Rejected",
			body:       overCap,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			body, err := json.Marshal(testCase.body)
			require.NoError(t, err)

			module := &mockModule{}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/promoted_path", strings.NewReader(string(body)))
			req = req.WithContext(authtypes.NewContextWithClaims(req.Context(), authtypes.Claims{}))
			rr := httptest.NewRecorder()

			NewHandler(module).PromotePaths(rr, req)

			assert.Equal(t, testCase.wantStatus, rr.Code)
			assert.Equal(t, testCase.wantModuleCall, module.promotePathsCalled)
		})
	}
}
