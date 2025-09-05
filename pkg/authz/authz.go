package authz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type AuthZ interface {
	factory.Service

	// Check returns error when the upstream authorization server is unavailable or the subject (s) doesn't have relation (r) on object (o).
	Check(context.Context, *openfgav1.CheckRequestTupleKey) error
}
