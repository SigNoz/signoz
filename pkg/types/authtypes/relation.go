package authtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
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
	TypeUser:         {RelationRead, RelationUpdate, RelationDelete},
	TypeRole:         {RelationAssignee, RelationRead, RelationUpdate, RelationDelete},
	TypeOrganization: {RelationCreate, RelationRead, RelationUpdate, RelationDelete, RelationList},
	TypeResource:     {RelationRead, RelationUpdate, RelationDelete, RelationBlock},
	TypeResources:    {RelationCreate, RelationRead, RelationUpdate, RelationDelete, RelationList},
}

type Relation struct{ valuer.String }
