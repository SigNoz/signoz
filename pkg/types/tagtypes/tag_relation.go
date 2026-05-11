package tagtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type EntityType struct{ valuer.String }

func MustNewEntityType(name string) EntityType {
	return EntityType{valuer.NewString(name)}
}

type TagRelation struct {
	bun.BaseModel `bun:"table:tag_relations,alias:tag_relations"`

	EntityType EntityType  `json:"entityType" required:"true" bun:"entity_type,type:text,notnull"`
	EntityID   valuer.UUID `json:"entityId" required:"true" bun:"entity_id,pk,type:text,notnull"`
	TagID      valuer.UUID `json:"tagId" required:"true" bun:"tag_id,pk,type:text,notnull"`
	OrgID      valuer.UUID `json:"orgId" required:"true" bun:"org_id,type:text,notnull"`
}

func NewTagRelation(orgID valuer.UUID, entityType EntityType, entityID valuer.UUID, tagID valuer.UUID) *TagRelation {
	return &TagRelation{
		EntityType: entityType,
		EntityID:   entityID,
		TagID:      tagID,
		OrgID:      orgID,
	}
}

func NewTagRelations(orgID valuer.UUID, entityType EntityType, entityID valuer.UUID, tagIDs []valuer.UUID) []*TagRelation {
	relations := make([]*TagRelation, 0, len(tagIDs))
	for _, tagID := range tagIDs {
		relations = append(relations, NewTagRelation(orgID, entityType, entityID, tagID))
	}
	return relations
}
