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
	Check(context.Context, *openfgav1.CheckRequestTupleKey) error

	// CheckWithTupleCreation takes upon the responsibility for generating the tuples alongside everything Check does.
	CheckWithTupleCreation(context.Context, authtypes.Claims, authtypes.Relation, authtypes.Typeable, authtypes.Selector, authtypes.Typeable, ...authtypes.Selector) error
}
