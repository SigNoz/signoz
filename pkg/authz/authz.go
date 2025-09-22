package authz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type AuthZ interface {
	factory.Service

	// Check returns error when the upstream authorization server is unavailable or the subject (s) doesn't have relation (r) on object (o).
	Check(context.Context, *openfgav1.TupleKey) error

	// CheckWithTupleCreation takes upon the responsibility for generating the tuples alongside everything Check does.
	CheckWithTupleCreation(context.Context, authtypes.Claims, authtypes.Relation, authtypes.Typeable, []authtypes.Selector) error

	// writes the tuples to upstream server
	Write(context.Context, *openfgav1.WriteRequest) error

	// lists the selectors for objects assigned to subject (s) with relation (r) on resource (s)
	ListObjects(context.Context, string, authtypes.Relation, authtypes.Typeable) ([]*authtypes.Object, error)
}
