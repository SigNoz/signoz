package authz

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type AuthZ interface {
	factory.ServiceWithHealthy

	// CheckWithTupleCreation takes upon the responsibility for generating the tuples alongside everything Check does.
	CheckWithTupleCreation(context.Context, authtypes.Claims, valuer.UUID, authtypes.Relation, coretypes.Resource, []coretypes.Selector, []coretypes.Selector) error

	// CheckWithTupleCreationWithoutClaims checks permissions for anonymous users.
	CheckWithTupleCreationWithoutClaims(context.Context, valuer.UUID, authtypes.Relation, coretypes.Resource, []coretypes.Selector, []coretypes.Selector) error

	// BatchCheck accepts a map of ID → tuple and returns a map of ID → authorization result.
	BatchCheck(context.Context, map[string]*openfgav1.TupleKey) (map[string]*authtypes.TupleKeyAuthorization, error)

	// CheckTransactions checks whether the given subject is authorized for the given transactions.
	// Returns results in the same order as the input transactions.
	CheckTransactions(ctx context.Context, subject string, orgID valuer.UUID, transactions []*authtypes.Transaction) ([]*authtypes.TransactionWithAuthorization, error)

	// Write accepts the insertion tuples and the deletion tuples.
	Write(context.Context, []*openfgav1.TupleKey, []*openfgav1.TupleKey) error

	// ReadTuples reads tuples from the authorization server matching the given tuple key filter.
	ReadTuples(context.Context, *openfgav1.ReadRequestTupleKey) ([]*openfgav1.TupleKey, error)

	// Creates the role with its transaction groups.
	Create(context.Context, valuer.UUID, *authtypes.Role) error

	// Updates the role's metadata and reconciles its transaction groups.
	Update(context.Context, valuer.UUID, *authtypes.Role) error

	// Deletes the role and tuples in authorization server.
	Delete(context.Context, valuer.UUID, valuer.UUID) error

	// Gets the role
	Get(context.Context, valuer.UUID, valuer.UUID) (*authtypes.Role, error)

	// Gets the role by org_id and name
	GetByOrgIDAndName(context.Context, valuer.UUID, string) (*authtypes.Role, error)

	// Lists all the roles for the organization.
	List(context.Context, valuer.UUID) ([]*authtypes.Role, error)

	// Collect returns per-org role usage stats for the stats reporter.
	Collect(context.Context, valuer.UUID) (map[string]any, error)

	//  Lists all the roles for the organization filtered by name
	ListByOrgIDAndNames(context.Context, valuer.UUID, []string) ([]*authtypes.Role, error)

	//  Lists all the roles for the organization filtered by ids
	ListByOrgIDAndIDs(context.Context, valuer.UUID, []valuer.UUID) ([]*authtypes.Role, error)

	// Grants a role to the subject based on role name.
	Grant(context.Context, valuer.UUID, []string, string) error

	// Revokes a granted role from the subject based on role name.
	Revoke(context.Context, valuer.UUID, []string, string) error

	// Changes the granted role for the subject based on role name.
	ModifyGrant(context.Context, valuer.UUID, []string, []string, string) error

	// Bootstrap the managed roles.
	CreateManagedRoles(context.Context, valuer.UUID, []*authtypes.Role) error

	// Bootstrap managed roles transactions and user assignments
	CreateManagedUserRoleTransactions(context.Context, valuer.UUID, valuer.UUID) error
}

// OnBeforeRoleDelete is a callback invoked before a role is deleted.
type OnBeforeRoleDelete func(ctx context.Context, orgID valuer.UUID, roleID valuer.UUID, roleName string) error

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Update(http.ResponseWriter, *http.Request)

	Check(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)
}
