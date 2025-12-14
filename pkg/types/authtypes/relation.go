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
	TypeUserSupportedRelations         = []Relation{RelationRead, RelationUpdate, RelationDelete}
	TypeRoleSupportedRelations         = []Relation{RelationAssignee, RelationRead, RelationUpdate, RelationDelete}
	TypeOrganizationSupportedRelations = []Relation{RelationCreate, RelationRead, RelationUpdate, RelationDelete, RelationList}
	TypeResourceSupportedRelations     = []Relation{RelationRead, RelationUpdate, RelationDelete, RelationBlock}
	TypeResourcesSupportedRelations    = []Relation{RelationCreate, RelationRead, RelationUpdate, RelationDelete, RelationList}
)

type Relation struct{ valuer.String }
