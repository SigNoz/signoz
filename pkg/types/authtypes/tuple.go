package authtypes

import (
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

func NewTuple(subject string, relation string, object string) *openfgav1.CheckRequestTupleKey {
	return &openfgav1.CheckRequestTupleKey{User: subject, Relation: relation, Object: object}
}
