package tagtypestest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// MockStore is an in-memory tagtypes.MockStore implementation for tests. Most methods
// are inert no-ops; List returns the contents of Tags and increments
// ListCallCount so tests can assert on lookup behavior. Set Tags directly to
// preload fixtures.
type MockStore struct {
	Tags          []*tagtypes.Tag
	ListCallCount int
}

func NewStore() *MockStore {
	return &MockStore{}
}

func (s *MockStore) List(_ context.Context, _ valuer.UUID, _ coretypes.Kind) ([]*tagtypes.Tag, error) {
	s.ListCallCount++
	out := make([]*tagtypes.Tag, len(s.Tags))
	copy(out, s.Tags)
	return out, nil
}

func (s *MockStore) CreateOrGet(_ context.Context, tags []*tagtypes.Tag) ([]*tagtypes.Tag, error) {
	return tags, nil
}

func (s *MockStore) CreateRelations(_ context.Context, _ []*tagtypes.TagRelation) error {
	return nil
}

func (s *MockStore) ListByResource(_ context.Context, _ valuer.UUID, _ coretypes.Kind, _ valuer.UUID) ([]*tagtypes.Tag, error) {
	return []*tagtypes.Tag{}, nil
}

func (s *MockStore) ListByResources(_ context.Context, _ valuer.UUID, _ coretypes.Kind, _ []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, error) {
	return map[valuer.UUID][]*tagtypes.Tag{}, nil
}

func (s *MockStore) DeleteRelationsExcept(_ context.Context, _ valuer.UUID, _ coretypes.Kind, _ valuer.UUID, _ []valuer.UUID) error {
	return nil
}

func (s *MockStore) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return cb(ctx)
}
