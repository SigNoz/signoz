package implspanmapper

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/spanmapper"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store spantypes.SpanMapperStore
}

func NewModule(store spantypes.SpanMapperStore) spanmapper.Module {
	return &module{store: store}
}

func (module *module) ListGroups(ctx context.Context, orgID valuer.UUID, q *spantypes.ListSpanMapperGroupsQuery) ([]*spantypes.SpanMapperGroup, error) {
	return module.store.ListGroups(ctx, orgID, q)
}

func (module *module) GetGroup(ctx context.Context, orgID, id valuer.UUID) (*spantypes.SpanMapperGroup, error) {
	return module.store.GetGroup(ctx, orgID, id)
}

func (module *module) CreateGroup(ctx context.Context, orgID valuer.UUID, group *spantypes.SpanMapperGroup) error {
	return module.store.CreateGroup(ctx, group)
}

func (module *module) UpdateGroup(ctx context.Context, orgID, id valuer.UUID, name *string, condition *spantypes.SpanMapperGroupCondition, enabled *bool, updatedBy string) error {
	group, err := module.store.GetGroup(ctx, orgID, id)
	if err != nil {
		return err
	}
	group.Update(name, condition, enabled, updatedBy)
	return module.store.UpdateGroup(ctx, group)
}

func (module *module) DeleteGroup(ctx context.Context, orgID, id valuer.UUID) error {
	return module.store.DeleteGroup(ctx, orgID, id)
}

func (module *module) ListMappers(ctx context.Context, orgID, groupID valuer.UUID) ([]*spantypes.SpanMapper, error) {
	return module.store.ListMappers(ctx, orgID, groupID)
}

func (module *module) GetMapper(ctx context.Context, orgID, groupID, id valuer.UUID) (*spantypes.SpanMapper, error) {
	return module.store.GetMapper(ctx, orgID, groupID, id)
}

func (module *module) CreateMapper(ctx context.Context, orgID, groupID valuer.UUID, mapper *spantypes.SpanMapper) error {
	// Ensure the group belongs to the org before inserting the child row.
	if _, err := module.store.GetGroup(ctx, orgID, groupID); err != nil {
		return err
	}
	return module.store.CreateMapper(ctx, mapper)
}

func (module *module) UpdateMapper(ctx context.Context, orgID, groupID, id valuer.UUID, fieldContext spantypes.FieldContext, config *spantypes.SpanMapperConfig, enabled *bool, updatedBy string) error {
	if _, err := module.store.GetGroup(ctx, orgID, groupID); err != nil {
		return err
	}
	mapper, err := module.store.GetMapper(ctx, orgID, groupID, id)
	if err != nil {
		return err
	}
	mapper.Update(fieldContext, config, enabled, updatedBy)
	return module.store.UpdateMapper(ctx, mapper)
}

func (module *module) DeleteMapper(ctx context.Context, orgID, groupID, id valuer.UUID) error {
	return module.store.DeleteMapper(ctx, orgID, groupID, id)
}
