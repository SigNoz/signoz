package impltracefunnel

import (
	"context"
	"fmt"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Test that Create method properly validates duplicate names
func TestModule_Create_DuplicateNameValidation(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	timestamp := int64(1234567890)
	name := "Duplicate Funnel"
	userID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()

	// Mock store to return "already exists" error
	expectedErr := errors.Wrapf(nil, errors.TypeAlreadyExists, traceFunnels.ErrFunnelAlreadyExists, "a funnel with name '%s' already exists in this organization", name)
	mockStore.On("Create", ctx, mock.MatchedBy(func(f *traceFunnels.StorableFunnel) bool {
		return f.Name == name && f.OrgID == orgID
	})).Return(expectedErr)

	funnel, err := module.Create(ctx, timestamp, name, userID, orgID)
	assert.Error(t, err)
	assert.Nil(t, funnel)
	assert.Contains(t, err.Error(), fmt.Sprintf("a funnel with name '%s' already exists in this organization", name))

	mockStore.AssertExpectations(t)
}

// Test that Update method properly validates duplicate names
func TestModule_Update_DuplicateNameValidation(t *testing.T) {
	mockStore := new(MockStore)
	module := NewModule(mockStore)

	ctx := context.Background()
	userID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()
	funnelName := "Duplicate Name"

	funnel := &traceFunnels.StorableFunnel{
		Name:  funnelName,
		OrgID: orgID,
	}
	funnel.ID = valuer.GenerateUUID()

	// Mock store to return "already exists" error
	expectedErr := errors.Wrapf(nil, errors.TypeAlreadyExists, traceFunnels.ErrFunnelAlreadyExists, "a funnel with name '%s' already exists in this organization", funnelName)
	mockStore.On("Update", ctx, funnel).Return(expectedErr)

	err := module.Update(ctx, funnel, userID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), fmt.Sprintf("a funnel with name '%s' already exists in this organization", funnelName))
	assert.Equal(t, userID.String(), funnel.UpdatedBy) // Should still set UpdatedBy

	mockStore.AssertExpectations(t)
}

// MockStore for testing
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
