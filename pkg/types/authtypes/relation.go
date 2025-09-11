package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	RelationCreate   = Relation{valuer.NewString("create")}
	RelationRead     = Relation{valuer.NewString("read")}
	RelationUpdate   = Relation{valuer.NewString("update")}
	RelationDelete   = Relation{valuer.NewString("delete")}
	RelationList     = Relation{valuer.NewString("list")}
	RelationBlock    = Relation{valuer.NewString("block")}
	RelationAssignee = Relation{valuer.NewString("assignee")}
)

var (
	typeUserSupportedRelations      = []Relation{RelationRead, RelationUpdate, RelationDelete}
	typeRoleSupportedRelations      = []Relation{RelationAssignee, RelationRead, RelationUpdate, RelationDelete}
	typeResourceSupportedRelations  = []Relation{RelationRead, RelationUpdate, RelationDelete, RelationBlock}
	typeResourcesSupportedRelations = []Relation{RelationCreate, RelationRead, RelationUpdate, RelationDelete, RelationList}
)

type Relation struct{ valuer.String }
