package coretypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeInvalidRelation = errors.MustNewCode("invalid_relation")
)

var (
	RelationCreate   = Relation{valuer.NewString("create"), "created"}
	RelationRead     = Relation{valuer.NewString("read"), "read"}
	RelationUpdate   = Relation{valuer.NewString("update"), "updated"}
	RelationDelete   = Relation{valuer.NewString("delete"), "deleted"}
	RelationList     = Relation{valuer.NewString("list"), "listed"}
	RelationAssignee = Relation{valuer.NewString("assignee"), "assigned"}
)

type Relation struct {
	valuer.String
	pastTense string
}

func NewRelation(relation string) (Relation, error) {
	switch relation {
	case "create":
		return RelationCreate, nil
	case "read":
		return RelationRead, nil
	case "update":
		return RelationUpdate, nil
	case "delete":
		return RelationDelete, nil
	case "list":
		return RelationList, nil
	case "assignee":
		return RelationAssignee, nil
	default:
		return Relation{}, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidRelation, "relation %s is invalid, valid relations are: %s", relation, Relation{}.Enum())
	}
}

func (Relation) Enum() []any {
	return []any{
		RelationCreate,
		RelationRead,
		RelationUpdate,
		RelationDelete,
		RelationList,
		RelationAssignee,
	}
}

func (r Relation) PastTense() string {
	return r.pastTense
}
