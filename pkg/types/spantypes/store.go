package spantypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// Group operations
	ListSpanMapperGroups(ctx context.Context, orgID valuer.UUID, q *ListSpanMapperGroupsQuery) ([]*StorableSpanMapperGroup, error)
	GetSpanMapperGroup(ctx context.Context, orgID, id valuer.UUID) (*StorableSpanMapperGroup, error)
	CreateSpanMapperGroup(ctx context.Context, group *StorableSpanMapperGroup) error
	UpdateSpanMapperGroup(ctx context.Context, group *StorableSpanMapperGroup) error
	DeleteSpanMapperGroup(ctx context.Context, orgID, id valuer.UUID) error

	// Mapper operations
	ListSpanMappers(ctx context.Context, orgID, groupID valuer.UUID) ([]*StorableSpanMapper, error)
	GetSpanMapper(ctx context.Context, orgID, groupID, id valuer.UUID) (*StorableSpanMapper, error)
	CreateSpanMapper(ctx context.Context, mapper *StorableSpanMapper) error
	UpdateSpanMapper(ctx context.Context, mapper *StorableSpanMapper) error
	DeleteSpanMapper(ctx context.Context, orgID, groupID, id valuer.UUID) error
}
