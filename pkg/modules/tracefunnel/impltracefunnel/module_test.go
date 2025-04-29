package impltracefunnel

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockStore struct {
	mock.Mock
}

func (m *MockStore) Create(ctx context.Context, funnel *traceFunnels.Funnel) error {
	args := m.Called(ctx, funnel)
	return args.Error(0)
}

func (m *MockStore) Get(ctx context.Context, uuid valuer.UUID) (*traceFunnels.Funnel, error) {
	args := m.Called(ctx, uuid)
	return args.Get(0).(*traceFunnels.Funnel), args.Error(1)
}

func (m *MockStore) List(ctx context.Context) ([]*traceFunnels.Funnel, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*traceFunnels.Funnel), args.Error(1)
}

func (m *MockStore) Update(ctx context.Context, funnel *traceFunnels.Funnel) error {
	args := m.Called(ctx, funnel)
	return args.Error(0)
}

func (m *MockStore) Delete(ctx context.Context, uuid valuer.UUID) error {
	args := m.Called(ctx, uuid)
	return args.Error(0)
}

func TestModule_Create(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	timestamp := time.Now().UnixMilli()
	name := "test-funnel"
	userID := "user-123"
	orgID := valuer.GenerateUUID().String()

	mockStore.On("Create", ctx, mock.AnythingOfType("*tracefunnels.Funnel")).Return(nil)

	funnel, err := module.Create(ctx, timestamp, name, userID, orgID)
	assert.NoError(t, err)
	assert.NotNil(t, funnel)
	assert.Equal(t, name, funnel.Name)
	assert.Equal(t, userID, funnel.CreatedBy)
	assert.Equal(t, orgID, funnel.OrgID.String())

	mockStore.AssertExpectations(t)
}

func TestModule_Get(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	funnelID := valuer.GenerateUUID().String()
	expectedFunnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Name: "test-funnel",
		},
	}

	mockStore.On("Get", ctx, mock.AnythingOfType("valuer.UUID")).Return(expectedFunnel, nil)

	funnel, err := module.Get(ctx, funnelID)
	assert.NoError(t, err)
	assert.Equal(t, expectedFunnel, funnel)

	mockStore.AssertExpectations(t)
}

func TestModule_Update(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	userID := "user-123"
	funnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Name: "test-funnel",
		},
	}

	mockStore.On("Update", ctx, funnel).Return(nil)

	err := module.Update(ctx, funnel, userID)
	assert.NoError(t, err)
	assert.Equal(t, userID, funnel.UpdatedBy)

	mockStore.AssertExpectations(t)
}

func TestModule_List(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	orgID := valuer.GenerateUUID().String()
	expectedFunnels := []*traceFunnels.Funnel{
		{
			BaseMetadata: traceFunnels.BaseMetadata{
				Name:  "funnel-1",
				OrgID: valuer.MustNewUUID(orgID),
			},
		},
		{
			BaseMetadata: traceFunnels.BaseMetadata{
				Name:  "funnel-2",
				OrgID: valuer.MustNewUUID(orgID),
			},
		},
	}

	mockStore.On("List", ctx).Return(expectedFunnels, nil)

	funnels, err := module.List(ctx, orgID)
	assert.NoError(t, err)
	assert.Len(t, funnels, 2)
	assert.Equal(t, expectedFunnels, funnels)

	mockStore.AssertExpectations(t)
}

func TestModule_Delete(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	funnelID := valuer.GenerateUUID().String()

	mockStore.On("Delete", ctx, mock.AnythingOfType("valuer.UUID")).Return(nil)

	err := module.Delete(ctx, funnelID)
	assert.NoError(t, err)

	mockStore.AssertExpectations(t)
}

func TestModule_Save(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	userID := "user-123"
	orgID := valuer.GenerateUUID().String()
	funnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Name: "test-funnel",
		},
	}

	mockStore.On("Update", ctx, funnel).Return(nil)

	err := module.Save(ctx, funnel, userID, orgID)
	assert.NoError(t, err)
	assert.Equal(t, userID, funnel.UpdatedBy)
	assert.Equal(t, orgID, funnel.OrgID.String())

	mockStore.AssertExpectations(t)
}

func TestModule_GetFunnelMetadata(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	funnelID := valuer.GenerateUUID().String()
	now := time.Now()
	expectedFunnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Description: "test description",
			TimeAuditable: types.TimeAuditable{
				CreatedAt: now,
				UpdatedAt: now,
			},
		},
	}

	mockStore.On("Get", ctx, mock.AnythingOfType("valuer.UUID")).Return(expectedFunnel, nil)

	createdAt, updatedAt, description, err := module.GetFunnelMetadata(ctx, funnelID)
	assert.NoError(t, err)
	assert.Equal(t, now.UnixNano()/1000000, createdAt)
	assert.Equal(t, now.UnixNano()/1000000, updatedAt)
	assert.Equal(t, "test description", description)

	mockStore.AssertExpectations(t)
}
