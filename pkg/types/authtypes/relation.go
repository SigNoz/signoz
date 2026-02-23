package authtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeAuthZInvalidRelation = errors.MustNewCode("authz_invalid_relation")
	ErrCodeInvalidPatchObject   = errors.MustNewCode("authz_invalid_patch_objects")
)

var (
	RelationCreate   = Relation{valuer.NewString("create")}
	RelationRead     = Relation{valuer.NewString("read")}
	RelationUpdate   = Relation{valuer.NewString("update")}
	RelationDelete   = Relation{valuer.NewString("delete")}
	RelationList     = Relation{valuer.NewString("list")}
	RelationAssignee = Relation{valuer.NewString("assignee")}
)

var TypeableRelations = map[Type][]Relation{
	TypeUser:          {RelationRead, RelationUpdate, RelationDelete},
	TypeRole:          {RelationAssignee, RelationRead, RelationUpdate, RelationDelete},
	TypeOrganization:  {RelationRead, RelationUpdate, RelationDelete},
	TypeMetaResource:  {RelationRead, RelationUpdate, RelationDelete},
	TypeMetaResources: {RelationCreate, RelationList},
}

var RelationsTypeable = map[Relation][]Type{
	RelationCreate: {TypeMetaResources},
	RelationRead:   {TypeUser, TypeRole, TypeOrganization, TypeMetaResource},
	RelationList:   {TypeMetaResources},
	RelationUpdate: {TypeUser, TypeRole, TypeOrganization, TypeMetaResource},
	RelationDelete: {TypeUser, TypeRole, TypeOrganization, TypeMetaResource},
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
	case "assignee":
		return RelationAssignee, nil
	default:
		return Relation{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidRelation, "invalid relation %s", relation)
	}
}
