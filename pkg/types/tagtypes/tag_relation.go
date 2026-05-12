package tagtypes

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type TagRelation struct {
	bun.BaseModel `bun:"table:tag_relation,alias:tag_relation"`

	Kind     coretypes.Kind `json:"kind" required:"true" bun:"kind,pk,type:text,notnull"`
	EntityID valuer.UUID    `json:"entityId" required:"true" bun:"entity_id,pk,type:text,notnull"`
	TagID    valuer.UUID    `json:"tagId" required:"true" bun:"tag_id,pk,type:text,notnull"`
}

func NewTagRelation(kind coretypes.Kind, entityID valuer.UUID, tagID valuer.UUID) *TagRelation {
	return &TagRelation{
		Kind:     kind,
		EntityID: entityID,
		TagID:    tagID,
	}
}

func NewTagRelations(kind coretypes.Kind, entityID valuer.UUID, tagIDs []valuer.UUID) []*TagRelation {
	relations := make([]*TagRelation, 0, len(tagIDs))
	for _, tagID := range tagIDs {
		relations = append(relations, NewTagRelation(kind, entityID, tagID))
	}
	return relations
}
