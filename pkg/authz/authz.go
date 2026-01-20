package authz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type AuthZ interface {
	factory.Service

	// Check returns error when the upstream authorization server is unavailable or the subject (s) doesn't have relation (r) on object (o).
	Check(context.Context, *openfgav1.TupleKey) error

	// CheckWithTupleCreation takes upon the responsibility for generating the tuples alongside everything Check does.
	CheckWithTupleCreation(context.Context, authtypes.Claims, valuer.UUID, authtypes.Relation, authtypes.Relation, authtypes.Typeable, []authtypes.Selector) error

	CheckWithTupleCreationWithoutClaims(context.Context, valuer.UUID, authtypes.Relation, authtypes.Relation, authtypes.Typeable, []authtypes.Selector) error

	// Batch Check returns error when the upstream authorization server is unavailable or for all the tuples of subject (s) doesn't have relation (r) on object (o).
	BatchCheck(context.Context, []*openfgav1.TupleKey) error

	// Write accepts the insertion tuples and the deletion tuples.
	Write(context.Context, []*openfgav1.TupleKey, []*openfgav1.TupleKey) error

	// Lists the selectors for objects assigned to subject (s) with relation (r) on resource (s)
	ListObjects(context.Context, string, authtypes.Relation, authtypes.Typeable) ([]*authtypes.Object, error)
}
