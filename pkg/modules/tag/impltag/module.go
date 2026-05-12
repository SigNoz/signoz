package impltag

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/tag"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store tagtypes.Store
}

func NewModule(store tagtypes.Store) tag.Module {
	return &module{store: store}
}

func (m *module) CreateMany(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, postable []tagtypes.PostableTag, createdBy string) ([]*tagtypes.Tag, error) {
	if len(postable) == 0 {
		return []*tagtypes.Tag{}, nil
	}

	toCreate, matched, err := tagtypes.Resolve(ctx, m.store, orgID, kind, postable, createdBy)
	if err != nil {
		return nil, err
	}

	created, err := m.store.Create(ctx, toCreate)
	if err != nil {
		return nil, err
	}

	return append(matched, created...), nil
}

func (m *module) LinkToEntity(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, entityID valuer.UUID, tagIDs []valuer.UUID) error {
	if len(tagIDs) == 0 {
		return nil
	}
	return m.store.CreateRelations(ctx, tagtypes.NewTagRelations(orgID, kind, entityID, tagIDs))
}

func (m *module) SyncLinksForEntity(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, entityID valuer.UUID, tagIDs []valuer.UUID) error {
	if err := m.store.CreateRelations(ctx, tagtypes.NewTagRelations(orgID, kind, entityID, tagIDs)); err != nil {
		return err
	}
	return m.store.DeleteRelationsExcept(ctx, kind, entityID, tagIDs)
}

func (m *module) ListForEntity(ctx context.Context, kind coretypes.Kind, entityID valuer.UUID) ([]*tagtypes.Tag, error) {
	return m.store.ListByEntity(ctx, kind, entityID)
}

func (m *module) ListForEntities(ctx context.Context, kind coretypes.Kind, entityIDs []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, error) {
	return m.store.ListByEntities(ctx, kind, entityIDs)
}
