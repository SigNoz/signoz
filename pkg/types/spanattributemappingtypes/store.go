package spanattributemappingtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// Group operations
	ListGroups(ctx context.Context, orgID valuer.UUID, q *ListGroupsQuery) ([]*StorableGroup, error)
	GetGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*StorableGroup, error)
	CreateGroup(ctx context.Context, group *StorableGroup) error
	UpdateGroup(ctx context.Context, group *StorableGroup) error
	DeleteGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	// Mapper operations
	ListMappers(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID) ([]*StorableMapper, error)
	GetMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) (*StorableMapper, error)
	CreateMapper(ctx context.Context, mapper *StorableMapper) error
	UpdateMapper(ctx context.Context, mapper *StorableMapper) error
	DeleteMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) error
}
