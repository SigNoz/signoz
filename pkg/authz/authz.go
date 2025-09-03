package authz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

type AuthZ interface {
	factory.Service
	Check(context.Context, *openfgav1.CheckRequestTupleKey) error
}
