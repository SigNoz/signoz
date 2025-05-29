package impltracefunnel

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockModule struct {
	mock.Mock
}

func (m *MockModule) Create(ctx context.Context, timestamp int64, name string, userID valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error) {
	args := m.Called(ctx, timestamp, name, userID, orgID)
	return args.Get(0).(*traceFunnels.StorableFunnel), args.Error(1)
}

func (m *MockModule) Get(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error) {
	args := m.Called(ctx, funnelID, orgID)
	return args.Get(0).(*traceFunnels.StorableFunnel), args.Error(1)
}

func (m *MockModule) Update(ctx context.Context, funnel *traceFunnels.StorableFunnel, userID valuer.UUID) error {
	args := m.Called(ctx, funnel, userID)
	return args.Error(0)
}

func (m *MockModule) List(ctx context.Context, orgID valuer.UUID) ([]*traceFunnels.StorableFunnel, error) {
	args := m.Called(ctx, orgID)
	return args.Get(0).([]*traceFunnels.StorableFunnel), args.Error(1)
}

func (m *MockModule) Delete(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) error {
	args := m.Called(ctx, funnelID, orgID)
	return args.Error(0)
}

func (m *MockModule) Save(ctx context.Context, funnel *traceFunnels.StorableFunnel, userID valuer.UUID, orgID valuer.UUID) error {
	args := m.Called(ctx, funnel, userID, orgID)
	return args.Error(0)
}

func (m *MockModule) GetFunnelMetadata(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) (int64, int64, string, error) {
	args := m.Called(ctx, funnelID, orgID)
	return args.Get(0).(int64), args.Get(1).(int64), args.String(2), args.Error(3)
}

func TestHandler_List(t *testing.T) {
	mockModule := new(MockModule)
	handler := NewHandler(mockModule)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/trace-funnels/list", nil)

	orgID := valuer.GenerateUUID()
	claims := authtypes.Claims{
		OrgID: orgID.String(),
	}
	req = req.WithContext(authtypes.NewContextWithClaims(req.Context(), claims))

	rr := httptest.NewRecorder()

	funnel1ID := valuer.GenerateUUID()
	funnel2ID := valuer.GenerateUUID()
	expectedFunnels := []*traceFunnels.StorableFunnel{
		{
			Identifiable: types.Identifiable{
				ID: funnel1ID,
			},
			Name:  "funnel-1",
			OrgID: orgID,
		},
		{
			Identifiable: types.Identifiable{
				ID: funnel2ID,
			},
			Name:  "funnel-2",
			OrgID: orgID,
		},
	}

	mockModule.On("List", req.Context(), orgID).Return(expectedFunnels, nil)

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Status string                        `json:"status"`
		Data   []traceFunnels.GettableFunnel `json:"data"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response.Status)
	assert.Len(t, response.Data, 2)
	assert.Equal(t, "funnel-1", response.Data[0].FunnelName)
	assert.Equal(t, "funnel-2", response.Data[1].FunnelName)

	mockModule.AssertExpectations(t)
}

func TestHandler_Get(t *testing.T) {
	mockModule := new(MockModule)
	handler := NewHandler(mockModule)

	funnelID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/trace-funnels/"+funnelID.String(), nil)
	req = mux.SetURLVars(req, map[string]string{"funnel_id": funnelID.String()})
	req = req.WithContext(authtypes.NewContextWithClaims(req.Context(), authtypes.Claims{
		OrgID: orgID.String(),
	}))

	rr := httptest.NewRecorder()

	expectedFunnel := &traceFunnels.StorableFunnel{
		Identifiable: types.Identifiable{
			ID: funnelID,
		},
		Name:  "test-funnel",
		OrgID: orgID,
	}

	mockModule.On("Get", req.Context(), funnelID, orgID).Return(expectedFunnel, nil)

	handler.Get(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Status string                      `json:"status"`
		Data   traceFunnels.GettableFunnel `json:"data"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response.Status)
	assert.Equal(t, "test-funnel", response.Data.FunnelName)
	assert.Equal(t, expectedFunnel.OrgID.String(), response.Data.OrgID)

	mockModule.AssertExpectations(t)
}

func TestHandler_Delete(t *testing.T) {
	mockModule := new(MockModule)
	handler := NewHandler(mockModule)

	funnelID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/trace-funnels/"+funnelID.String(), nil)
	req = mux.SetURLVars(req, map[string]string{"funnel_id": funnelID.String()})
	req = req.WithContext(authtypes.NewContextWithClaims(req.Context(), authtypes.Claims{
		OrgID: orgID.String(),
	}))

	rr := httptest.NewRecorder()

	mockModule.On("Delete", req.Context(), funnelID, orgID).Return(nil)

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	mockModule.AssertExpectations(t)
}
