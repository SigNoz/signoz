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

func (m *module) SyncTags(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID, postable []tagtypes.PostableTag) ([]*tagtypes.Tag, error) {
	var tags []*tagtypes.Tag
	err := m.store.RunInTx(ctx, func(ctx context.Context) error {
		resolved, err := m.createMany(ctx, orgID, kind, postable)
		if err != nil {
			return err
		}
		tagIDs := make([]valuer.UUID, len(resolved))
		for i, t := range resolved {
			tagIDs[i] = t.ID
		}
		if err := m.syncLinksForResource(ctx, orgID, kind, resourceID, tagIDs); err != nil {
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

func (m *module) createMany(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, postable []tagtypes.PostableTag) ([]*tagtypes.Tag, error) {
	if len(postable) == 0 {
		return []*tagtypes.Tag{}, nil
	}

	toCreate, matched, err := m.resolve(ctx, orgID, kind, postable)
	if err != nil {
		return nil, err
	}

	created, err := m.store.CreateOrGet(ctx, toCreate)
	if err != nil {
		return nil, err
	}

	return append(matched, created...), nil
}

func (m *module) syncLinksForResource(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID, tagIDs []valuer.UUID) error {
	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := m.store.CreateRelations(ctx, tagtypes.NewTagRelations(kind, resourceID, tagIDs)); err != nil {
			return err
		}
		return m.store.DeleteRelationsExcept(ctx, orgID, kind, resourceID, tagIDs)
	})
}

func (m *module) ListForResource(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID) ([]*tagtypes.Tag, error) {
	return m.store.ListByResource(ctx, orgID, kind, resourceID)
}

func (m *module) ListForResources(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceIDs []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, error) {
	return m.store.ListByResources(ctx, orgID, kind, resourceIDs)
}
