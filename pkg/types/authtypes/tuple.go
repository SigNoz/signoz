package authtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var (
	ErrCodeAuthZUnavailable = errors.MustNewCode("authz_unavailable")
	ErrCodeAuthZForbidden   = errors.MustNewCode("authz_forbidden")
)

func NewTuple(subject string, relation string, object string) *openfgav1.CheckRequestTupleKey {
	return &openfgav1.CheckRequestTupleKey{User: subject, Relation: relation, Object: object}
}
