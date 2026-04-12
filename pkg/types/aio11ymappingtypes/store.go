package aio11ymappingtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// Group operations
	ListGroups(ctx context.Context, orgID valuer.UUID, q *ListMappingGroupsQuery) ([]*StorableMappingGroup, error)
	GetGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*StorableMappingGroup, error)
	CreateGroup(ctx context.Context, group *StorableMappingGroup) error
	UpdateGroup(ctx context.Context, group *StorableMappingGroup) error
	DeleteGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	// Mapper operations
	ListMappers(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, q *ListMappersQuery) ([]*StorableMapper, error)
	GetMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) (*StorableMapper, error)
	CreateMapper(ctx context.Context, mapper *StorableMapper) error
	UpdateMapper(ctx context.Context, mapper *StorableMapper) error
	DeleteMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) error
}
