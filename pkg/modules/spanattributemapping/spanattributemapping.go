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
	ListGroups(ctx context.Context, orgID valuer.UUID, q *spanattributemappingtypes.ListGroupsQuery) ([]*spanattributemappingtypes.Group, error)
	GetGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*spanattributemappingtypes.Group, error)
	CreateGroup(ctx context.Context, orgID valuer.UUID, createdBy string, group *spanattributemappingtypes.Group) (*spanattributemappingtypes.Group, error)
	UpdateGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, group *spanattributemappingtypes.Group) (*spanattributemappingtypes.Group, error)
	DeleteGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	// Mapper operations
	ListMappers(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID) ([]*spanattributemappingtypes.Mapper, error)
	GetMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) (*spanattributemappingtypes.Mapper, error)
	CreateMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, createdBy string, mapper *spanattributemappingtypes.Mapper) (*spanattributemappingtypes.Mapper, error)
	UpdateMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID, updatedBy string, mapper *spanattributemappingtypes.Mapper) (*spanattributemappingtypes.Mapper, error)
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
