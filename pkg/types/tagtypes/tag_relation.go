package tagtypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type TagRelation struct {
	bun.BaseModel `bun:"table:tag_relation,alias:tag_relation"`

	types.Identifiable
	Kind       coretypes.Kind `json:"kind" required:"true" bun:"kind,type:text,notnull"`
	ResourceID valuer.UUID    `json:"resourceId" required:"true" bun:"resource_id,type:text,notnull"`
	TagID      valuer.UUID    `json:"tagId" required:"true" bun:"tag_id,type:text,notnull"`
	CreatedAt  time.Time      `json:"createdAt" bun:"created_at,notnull"`
}

func NewTagRelation(kind coretypes.Kind, resourceID valuer.UUID, tagID valuer.UUID) *TagRelation {
	return &TagRelation{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		Kind:         kind,
		ResourceID:   resourceID,
		TagID:        tagID,
		CreatedAt:    time.Now(),
	}
}

func NewTagRelations(kind coretypes.Kind, resourceID valuer.UUID, tagIDs []valuer.UUID) []*TagRelation {
	relations := make([]*TagRelation, 0, len(tagIDs))
	for _, tagID := range tagIDs {
		relations = append(relations, NewTagRelation(kind, resourceID, tagID))
	}
	return relations
}
