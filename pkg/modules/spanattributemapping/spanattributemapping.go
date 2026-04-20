package spanattributemapping

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/spanattributemappingtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Module defines the business logic for span attribute mapping groups and mappers.
type Module interface {
	// Group operations
	ListGroups(ctx context.Context, orgID valuer.UUID, q *spanattributemappingtypes.ListSpanAttributeMappingGroupsQuery) ([]*spanattributemappingtypes.SpanAttributeMappingGroup, error)
	GetGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*spanattributemappingtypes.SpanAttributeMappingGroup, error)
	CreateGroup(ctx context.Context, orgID valuer.UUID, createdBy string, req *spanattributemappingtypes.PostableSpanAttributeMappingGroup) (*spanattributemappingtypes.SpanAttributeMappingGroup, error)
	UpdateGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, req *spanattributemappingtypes.UpdatableSpanAttributeMappingGroup) (*spanattributemappingtypes.SpanAttributeMappingGroup, error)
	DeleteGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	// Mapper operations
	ListMappers(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID) ([]*spanattributemappingtypes.SpanAttributeMapper, error)
	GetMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) (*spanattributemappingtypes.SpanAttributeMapper, error)
	CreateMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, createdBy string, req *spanattributemappingtypes.PostableSpanAttributeMapper) (*spanattributemappingtypes.SpanAttributeMapper, error)
	UpdateMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID, updatedBy string, req *spanattributemappingtypes.UpdatableSpanAttributeMapper) (*spanattributemappingtypes.SpanAttributeMapper, error)
	DeleteMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) error
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
