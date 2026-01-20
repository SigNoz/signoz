package tracefunneltest

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/modules/tracefunnel/impltracefunnel"
	"github.com/SigNoz/signoz/pkg/types"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockStore struct {
	mock.Mock
}

func (m *MockStore) Create(ctx context.Context, funnel *traceFunnels.StorableFunnel) error {
	args := m.Called(ctx, funnel)
	return args.Error(0)
}

func (m *MockStore) Get(ctx context.Context, uuid valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error) {
	args := m.Called(ctx, uuid, orgID)
	return args.Get(0).(*traceFunnels.StorableFunnel), args.Error(1)
}

func (m *MockStore) List(ctx context.Context, orgID valuer.UUID) ([]*traceFunnels.StorableFunnel, error) {
	args := m.Called(ctx, orgID)
	return args.Get(0).([]*traceFunnels.StorableFunnel), args.Error(1)
}

func (m *MockStore) Update(ctx context.Context, funnel *traceFunnels.StorableFunnel) error {
	args := m.Called(ctx, funnel)
	return args.Error(0)
}

func (m *MockStore) Delete(ctx context.Context, uuid valuer.UUID, orgID valuer.UUID) error {
	args := m.Called(ctx, uuid, orgID)
	return args.Error(0)
}

func TestModule_Create(t *testing.T) {
	mockStore := new(MockStore)
	module := impltracefunnel.NewModule(mockStore)

	ctx := context.Background()
	timestamp := time.Now().UnixMilli()
	name := "test-funnel"
	userID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()

	mockStore.On("Create", ctx, mock.MatchedBy(func(f *traceFunnels.StorableFunnel) bool {
		return f.Name == name &&
			f.CreatedBy == userID.String() &&
			f.OrgID == orgID &&
			f.CreatedByUser != nil &&
			f.CreatedByUser.ID == userID &&
			f.CreatedAt.UnixNano()/1000000 == timestamp
	})).Return(nil)

	funnel, err := module.Create(ctx, timestamp, name, userID, orgID)
	assert.NoError(t, err)
	assert.NotNil(t, funnel)
	assert.Equal(t, name, funnel.Name)
	assert.Equal(t, userID.String(), funnel.CreatedBy)
	assert.Equal(t, orgID, funnel.OrgID)
	assert.NotNil(t, funnel.CreatedByUser)
	assert.Equal(t, userID, funnel.CreatedByUser.ID)

	mockStore.AssertExpectations(t)
}

func TestModule_Get(t *testing.T) {
	mockStore := new(MockStore)
	module := impltracefunnel.NewModule(mockStore)

	ctx := context.Background()
	funnelID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()
	expectedFunnel := &traceFunnels.StorableFunnel{
		Name: "test-funnel",
	}

	mockStore.On("Get", ctx, funnelID, orgID).Return(expectedFunnel, nil)

	funnel, err := module.Get(ctx, funnelID, orgID)
	assert.NoError(t, err)
	assert.Equal(t, expectedFunnel, funnel)

	mockStore.AssertExpectations(t)
}

func TestModule_Update(t *testing.T) {
	mockStore := new(MockStore)
	module := impltracefunnel.NewModule(mockStore)

	ctx := context.Background()
	userID := valuer.GenerateUUID()
	funnel := &traceFunnels.StorableFunnel{
		Name: "test-funnel",
	}

	mockStore.On("Update", ctx, funnel).Return(nil)

	err := module.Update(ctx, funnel, userID)
	assert.NoError(t, err)
	assert.Equal(t, userID.String(), funnel.UpdatedBy)

	mockStore.AssertExpectations(t)
}

func TestModule_List(t *testing.T) {
	mockStore := new(MockStore)
	module := impltracefunnel.NewModule(mockStore)

	ctx := context.Background()
	orgID := valuer.GenerateUUID()
	expectedFunnels := []*traceFunnels.StorableFunnel{
		{
			Name:  "funnel-1",
			OrgID: orgID,
		},
		{
			Name:  "funnel-2",
			OrgID: orgID,
		},
	}

	mockStore.On("List", ctx, orgID).Return(expectedFunnels, nil)

	funnels, err := module.List(ctx, orgID)
	assert.NoError(t, err)
	assert.Len(t, funnels, 2)
	assert.Equal(t, expectedFunnels, funnels)

	mockStore.AssertExpectations(t)
}

func TestModule_Delete(t *testing.T) {
	mockStore := new(MockStore)
	module := impltracefunnel.NewModule(mockStore)

	ctx := context.Background()
	funnelID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()

	mockStore.On("Delete", ctx, funnelID, orgID).Return(nil)

	err := module.Delete(ctx, funnelID, orgID)
	assert.NoError(t, err)

	mockStore.AssertExpectations(t)
}

func TestModule_GetFunnelMetadata(t *testing.T) {
	mockStore := new(MockStore)
	module := impltracefunnel.NewModule(mockStore)

	ctx := context.Background()
	funnelID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()
	now := time.Now()
	expectedFunnel := &traceFunnels.StorableFunnel{
		Description: "test description",
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
	}

	mockStore.On("Get", ctx, funnelID, orgID).Return(expectedFunnel, nil)

	createdAt, updatedAt, description, err := module.GetFunnelMetadata(ctx, funnelID, orgID)
	assert.NoError(t, err)
	assert.Equal(t, now.UnixNano()/1000000, createdAt)
	assert.Equal(t, now.UnixNano()/1000000, updatedAt)
	assert.Equal(t, "test description", description)

	mockStore.AssertExpectations(t)
}
