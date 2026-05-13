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

func (m *module) SyncTags(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID, postable []tagtypes.PostableTag, createdBy string) ([]*tagtypes.Tag, error) {
	var tags []*tagtypes.Tag
	err := m.store.RunInTx(ctx, func(ctx context.Context) error {
		resolved, err := m.CreateMany(ctx, orgID, kind, postable, createdBy)
		if err != nil {
			return err
		}
		tagIDs := make([]valuer.UUID, len(resolved))
		for i, t := range resolved {
			tagIDs[i] = t.ID
		}
		if err := m.SyncLinksForResource(ctx, kind, resourceID, tagIDs); err != nil {
			return err
		}
		tags = resolved
		return nil
	})
	if err != nil {
		return nil, err
	}
	return tags, nil
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

func (m *module) LinkToResource(ctx context.Context, kind coretypes.Kind, resourceID valuer.UUID, tagIDs []valuer.UUID) error {
	if len(tagIDs) == 0 {
		return nil
	}
	return m.store.CreateRelations(ctx, tagtypes.NewTagRelations(kind, resourceID, tagIDs))
}

func (m *module) SyncLinksForResource(ctx context.Context, kind coretypes.Kind, resourceID valuer.UUID, tagIDs []valuer.UUID) error {
	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := m.store.CreateRelations(ctx, tagtypes.NewTagRelations(kind, resourceID, tagIDs)); err != nil {
			return err
		}
		return m.store.DeleteRelationsExcept(ctx, kind, resourceID, tagIDs)
	})
}

func (m *module) ListForResource(ctx context.Context, kind coretypes.Kind, resourceID valuer.UUID) ([]*tagtypes.Tag, error) {
	return m.store.ListByResource(ctx, kind, resourceID)
}

func (m *module) ListForResources(ctx context.Context, kind coretypes.Kind, resourceIDs []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, error) {
	return m.store.ListByResources(ctx, kind, resourceIDs)
}
