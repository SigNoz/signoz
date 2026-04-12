package aio11ymapping

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/aio11ymappingtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Module defines the business logic for span attribute mapping groups and mappers.
type Module interface {
	// Group operations

	ListGroups(ctx context.Context, orgID valuer.UUID, q *aio11ymappingtypes.ListMappingGroupsQuery) ([]*aio11ymappingtypes.MappingGroup, error)
	GetGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*aio11ymappingtypes.MappingGroup, error)
	CreateGroup(ctx context.Context, orgID valuer.UUID, createdBy string, req *aio11ymappingtypes.PostableMappingGroup) (*aio11ymappingtypes.MappingGroup, error)
	UpdateGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, req *aio11ymappingtypes.UpdatableMappingGroup) (*aio11ymappingtypes.MappingGroup, error)
	DeleteGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	// Mapper operations

	ListMappers(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, q *aio11ymappingtypes.ListMappersQuery) ([]*aio11ymappingtypes.Mapper, error)
	GetMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) (*aio11ymappingtypes.Mapper, error)
	CreateMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, createdBy string, req *aio11ymappingtypes.PostableMapper) (*aio11ymappingtypes.Mapper, error)
	UpdateMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID, updatedBy string, req *aio11ymappingtypes.UpdatableMapper) (*aio11ymappingtypes.Mapper, error)
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
