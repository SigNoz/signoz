package authtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeAuthZInvalidRelation = errors.MustNewCode("authz_invalid_relation")
)

var (
	RelationCreate   = Relation{valuer.NewString("create")}
	RelationRead     = Relation{valuer.NewString("read")}
	RelationUpdate   = Relation{valuer.NewString("update")}
	RelationDelete   = Relation{valuer.NewString("delete")}
	RelationList     = Relation{valuer.NewString("list")}
	RelationBlock    = Relation{valuer.NewString("block")}
	RelationAssignee = Relation{valuer.NewString("assignee")}
)

var TypeableRelations = map[Type][]Relation{
	TypeUser:          {RelationRead, RelationUpdate, RelationDelete},
	TypeRole:          {RelationAssignee, RelationRead, RelationUpdate, RelationDelete},
	TypeOrganization:  {RelationCreate, RelationRead, RelationUpdate, RelationDelete, RelationList},
	TypeMetaResource:  {RelationRead, RelationUpdate, RelationDelete, RelationBlock},
	TypeMetaResources: {RelationCreate, RelationList},
}

type Relation struct{ valuer.String }

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
	case "block":
		return RelationBlock, nil
	case "assignee":
		return RelationAssignee, nil
	default:
		return Relation{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidRelation, "invalid relation %s", relation)
	}
}
