package spanmapper

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Module defines the business logic for span attribute mapping groups and mappers.
type Module interface {
	// Group operations
	ListGroups(ctx context.Context, orgID valuer.UUID, q *spantypes.ListSpanMapperGroupsQuery) ([]*spantypes.SpanMapperGroup, error)
	GetGroup(ctx context.Context, orgID, id valuer.UUID) (*spantypes.SpanMapperGroup, error)
	CreateGroup(ctx context.Context, orgID valuer.UUID, group *spantypes.SpanMapperGroup) error
	UpdateGroup(ctx context.Context, orgID, id valuer.UUID, name *string, condition *spantypes.SpanMapperGroupCondition, enabled *bool, updatedBy string) error
	DeleteGroup(ctx context.Context, orgID, id valuer.UUID) error

	// Mapper operations
	ListMappers(ctx context.Context, orgID, groupID valuer.UUID) ([]*spantypes.SpanMapper, error)
	GetMapper(ctx context.Context, orgID, groupID, id valuer.UUID) (*spantypes.SpanMapper, error)
	CreateMapper(ctx context.Context, orgID, groupID valuer.UUID, mapper *spantypes.SpanMapper) error
	UpdateMapper(ctx context.Context, orgID, groupID, id valuer.UUID, fieldContext spantypes.FieldContext, config *spantypes.SpanMapperConfig, enabled *bool, updatedBy string) error
	DeleteMapper(ctx context.Context, orgID, groupID, id valuer.UUID) error
}

// Handler defines the HTTP handler interface for mapping group and mapper endpoints.
type Handler interface {
	// Group handlers
	ListGroups(rw http.ResponseWriter, r *http.Request)
	CreateGroup(rw http.ResponseWriter, r *http.Request)
	UpdateGroup(rw http.ResponseWriter, r *http.Request)
	DeleteGroup(rw http.ResponseWriter, r *http.Request)

	// Mapper handlers
	ListMappers(rw http.ResponseWriter, r *http.Request)
	CreateMapper(rw http.ResponseWriter, r *http.Request)
	UpdateMapper(rw http.ResponseWriter, r *http.Request)
	DeleteMapper(rw http.ResponseWriter, r *http.Request)
}
