package impltracefunnel

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockModule struct {
	mock.Mock
}

func (m *MockModule) Create(ctx context.Context, timestamp int64, name string, userID string, orgID string) (*traceFunnels.Funnel, error) {
	args := m.Called(ctx, timestamp, name, userID, orgID)
	return args.Get(0).(*traceFunnels.Funnel), args.Error(1)
}

func (m *MockModule) Get(ctx context.Context, funnelID string) (*traceFunnels.Funnel, error) {
	args := m.Called(ctx, funnelID)
	return args.Get(0).(*traceFunnels.Funnel), args.Error(1)
}

func (m *MockModule) Update(ctx context.Context, funnel *traceFunnels.Funnel, userID string) error {
	args := m.Called(ctx, funnel, userID)
	return args.Error(0)
}

func (m *MockModule) List(ctx context.Context, orgID string) ([]*traceFunnels.Funnel, error) {
	args := m.Called(ctx, orgID)
	return args.Get(0).([]*traceFunnels.Funnel), args.Error(1)
}

func (m *MockModule) Delete(ctx context.Context, funnelID string) error {
	args := m.Called(ctx, funnelID)
	return args.Error(0)
}

func (m *MockModule) Save(ctx context.Context, funnel *traceFunnels.Funnel, userID string, orgID string) error {
	args := m.Called(ctx, funnel, userID, orgID)
	return args.Error(0)
}

func (m *MockModule) GetFunnelMetadata(ctx context.Context, funnelID string) (int64, int64, string, error) {
	args := m.Called(ctx, funnelID)
	return args.Get(0).(int64), args.Get(1).(int64), args.String(2), args.Error(3)
}

func TestHandler_New(t *testing.T) {
	mockModule := new(MockModule)
	handler := NewHandler(mockModule)

	reqBody := traceFunnels.FunnelRequest{
		Name:      "test-funnel",
		Timestamp: time.Now().UnixMilli(),
	}

	jsonBody, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/trace-funnels/new", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	orgID := valuer.GenerateUUID().String()
	claims := authtypes.Claims{
		UserID: "user-123",
		OrgID:  orgID,
		Email:  "test@example.com",
	}
	req = req.WithContext(authtypes.NewContextWithClaims(req.Context(), claims))

	rr := httptest.NewRecorder()

	funnelID := valuer.GenerateUUID()
	expectedFunnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Identifiable: types.Identifiable{
				ID: funnelID,
			},
			Name:  reqBody.Name,
			OrgID: valuer.MustNewUUID(orgID),
		},
	}

	mockModule.On("List", req.Context(), orgID).Return([]*traceFunnels.Funnel{}, nil)
	mockModule.On("Create", req.Context(), reqBody.Timestamp, reqBody.Name, "user-123", orgID).Return(expectedFunnel, nil)

	handler.New(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Status string                      `json:"status"`
		Data   traceFunnels.FunnelResponse `json:"data"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response.Status)
	assert.Equal(t, reqBody.Name, response.Data.FunnelName)
	assert.Equal(t, orgID, response.Data.OrgID)
	assert.Equal(t, "test@example.com", response.Data.UserEmail)

	mockModule.AssertExpectations(t)
}

func TestHandler_Update(t *testing.T) {
	mockModule := new(MockModule)
	handler := NewHandler(mockModule)

	// Create a valid UUID for the funnel ID
	funnelID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID().String()

	reqBody := traceFunnels.FunnelRequest{
		FunnelID: funnelID,
		Name:     "updated-funnel",
		Steps: []traceFunnels.FunnelStep{
			{
				ID:          valuer.GenerateUUID(),
				Name:        "Step 1",
				ServiceName: "test-service",
				SpanName:    "test-span",
				Order:       1,
			},
			{
				ID:          valuer.GenerateUUID(),
				Name:        "Step 2",
				ServiceName: "test-service",
				SpanName:    "test-span-2",
				Order:       2,
			},
		},
		Timestamp: time.Now().UnixMilli(),
	}

	body, err := json.Marshal(reqBody)
	assert.NoError(t, err)

	req, err := http.NewRequest(http.MethodPut, "/api/v1/trace-funnels/steps/update", bytes.NewBuffer(body))
	assert.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	// Set up context with claims
	claims := authtypes.Claims{
		UserID: "user-123",
		OrgID:  orgID,
		Email:  "test@example.com",
	}
	ctx := authtypes.NewContextWithClaims(req.Context(), claims)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	// Set up mock expectations
	existingFunnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Identifiable: types.Identifiable{
				ID: funnelID,
			},
			Name:  "test-funnel",
			OrgID: valuer.MustNewUUID(orgID),
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: "user-123",
				UpdatedBy: "user-123",
			},
		},
		CreatedByUser: &types.User{
			ID:    "user-123",
			Email: "test@example.com",
		},
	}

	updatedFunnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Identifiable: types.Identifiable{
				ID: funnelID,
			},
			Name:  reqBody.Name,
			OrgID: valuer.MustNewUUID(orgID),
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Unix(0, reqBody.Timestamp*1000000),
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: "user-123",
				UpdatedBy: "user-123",
			},
		},
		Steps: reqBody.Steps,
		CreatedByUser: &types.User{
			ID:    "user-123",
			Email: "test@example.com",
		},
	}

	// First Get call to validate the funnel exists
	mockModule.On("Get", req.Context(), funnelID.String()).Return(existingFunnel, nil).Once()
	// List call to check for name conflicts
	mockModule.On("List", req.Context(), orgID).Return([]*traceFunnels.Funnel{}, nil).Once()
	// Update call to save the changes
	mockModule.On("Update", req.Context(), mock.MatchedBy(func(f *traceFunnels.Funnel) bool {
		return f.Name == reqBody.Name &&
			f.ID.String() == funnelID.String() &&
			len(f.Steps) == len(reqBody.Steps) &&
			f.Steps[0].Name == reqBody.Steps[0].Name &&
			f.Steps[0].ServiceName == reqBody.Steps[0].ServiceName &&
			f.Steps[0].SpanName == reqBody.Steps[0].SpanName &&
			f.Steps[1].Name == reqBody.Steps[1].Name &&
			f.Steps[1].ServiceName == reqBody.Steps[1].ServiceName &&
			f.Steps[1].SpanName == reqBody.Steps[1].SpanName &&
			f.UpdatedAt.UnixNano()/1000000 == reqBody.Timestamp &&
			f.UpdatedBy == "user-123"
	}), "user-123").Return(nil).Once()
	// Second Get call to get the updated funnel for the response
	mockModule.On("Get", req.Context(), funnelID.String()).Return(updatedFunnel, nil).Once()

	handler.UpdateSteps(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Status string                      `json:"status"`
		Data   traceFunnels.FunnelResponse `json:"data"`
	}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response.Status)
	assert.Equal(t, "updated-funnel", response.Data.FunnelName)
	assert.Equal(t, funnelID.String(), response.Data.FunnelID)
	assert.Equal(t, "test@example.com", response.Data.UserEmail)

	mockModule.AssertExpectations(t)
}

func TestHandler_List(t *testing.T) {
	mockModule := new(MockModule)
	handler := NewHandler(mockModule)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/trace-funnels/list", nil)

	orgID := valuer.GenerateUUID().String()
	claims := authtypes.Claims{
		OrgID: orgID,
	}
	req = req.WithContext(authtypes.NewContextWithClaims(req.Context(), claims))

	rr := httptest.NewRecorder()

	funnel1ID := valuer.GenerateUUID()
	funnel2ID := valuer.GenerateUUID()
	expectedFunnels := []*traceFunnels.Funnel{
		{
			BaseMetadata: traceFunnels.BaseMetadata{
				Identifiable: types.Identifiable{
					ID: funnel1ID,
				},
				Name:  "funnel-1",
				OrgID: valuer.MustNewUUID(orgID),
			},
		},
		{
			BaseMetadata: traceFunnels.BaseMetadata{
				Identifiable: types.Identifiable{
					ID: funnel2ID,
				},
				Name:  "funnel-2",
				OrgID: valuer.MustNewUUID(orgID),
			},
		},
	}

	mockModule.On("List", req.Context(), orgID).Return(expectedFunnels, nil)

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Status string                        `json:"status"`
		Data   []traceFunnels.FunnelResponse `json:"data"`
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
	req := httptest.NewRequest(http.MethodGet, "/api/v1/trace-funnels/"+funnelID.String(), nil)
	req = mux.SetURLVars(req, map[string]string{"funnel_id": funnelID.String()})

	rr := httptest.NewRecorder()

	expectedFunnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Identifiable: types.Identifiable{
				ID: funnelID,
			},
			Name:  "test-funnel",
			OrgID: valuer.GenerateUUID(),
		},
	}

	mockModule.On("Get", req.Context(), funnelID.String()).Return(expectedFunnel, nil)

	handler.Get(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Status string                      `json:"status"`
		Data   traceFunnels.FunnelResponse `json:"data"`
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
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/trace-funnels/"+funnelID.String(), nil)
	req = mux.SetURLVars(req, map[string]string{"funnel_id": funnelID.String()})

	rr := httptest.NewRecorder()

	mockModule.On("Delete", req.Context(), funnelID.String()).Return(nil)

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	mockModule.AssertExpectations(t)
}

func TestHandler_Save(t *testing.T) {
	mockModule := new(MockModule)
	handler := NewHandler(mockModule)

	reqBody := traceFunnels.FunnelRequest{
		FunnelID:    valuer.GenerateUUID(),
		Description: "updated description",
		Timestamp:   time.Now().UnixMilli(),
		UserID:      "user-123",
	}

	jsonBody, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/trace-funnels/save", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	orgID := valuer.GenerateUUID().String()
	claims := authtypes.Claims{
		UserID: "user-123",
		OrgID:  orgID,
	}
	req = req.WithContext(authtypes.NewContextWithClaims(req.Context(), claims))

	rr := httptest.NewRecorder()

	existingFunnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Identifiable: types.Identifiable{
				ID: reqBody.FunnelID,
			},
			Name:  "test-funnel",
			OrgID: valuer.MustNewUUID(orgID),
		},
	}

	mockModule.On("Get", req.Context(), reqBody.FunnelID.String()).Return(existingFunnel, nil)
	mockModule.On("Save", req.Context(), mock.MatchedBy(func(f *traceFunnels.Funnel) bool {
		return f.ID.String() == reqBody.FunnelID.String() &&
			f.Name == existingFunnel.Name &&
			f.Description == reqBody.Description &&
			f.UpdatedBy == "user-123" &&
			f.OrgID.String() == orgID
	}), "user-123", orgID).Return(nil)
	mockModule.On("GetFunnelMetadata", req.Context(), reqBody.FunnelID.String()).Return(int64(0), int64(0), reqBody.Description, nil)

	handler.Save(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response struct {
		Status string                      `json:"status"`
		Data   traceFunnels.FunnelResponse `json:"data"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response.Status)
	assert.Equal(t, reqBody.Description, response.Data.Description)

	mockModule.AssertExpectations(t)
}
