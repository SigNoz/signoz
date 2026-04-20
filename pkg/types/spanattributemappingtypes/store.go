package spanattributemappingtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// Group operations
	ListGroups(ctx context.Context, orgID valuer.UUID, q *ListSpanAttributeMappingGroupsQuery) ([]*StorableSpanAttributeMappingGroup, error)
	GetGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*StorableSpanAttributeMappingGroup, error)
	CreateGroup(ctx context.Context, group *StorableSpanAttributeMappingGroup) error
	UpdateGroup(ctx context.Context, group *StorableSpanAttributeMappingGroup) error
	DeleteGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	// Mapper operations
	ListMappers(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID) ([]*StorableSpanAttributeMapper, error)
	GetMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) (*StorableSpanAttributeMapper, error)
	CreateMapper(ctx context.Context, mapper *StorableSpanAttributeMapper) error
	UpdateMapper(ctx context.Context, mapper *StorableSpanAttributeMapper) error
	DeleteMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) error
}
