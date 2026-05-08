package implspanmapper

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/modules/spanmapper"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store spantypes.Store
}

func NewModule(store spantypes.Store) spanmapper.Module {
	return &module{store: store}
}

func (m *module) ListGroups(ctx context.Context, orgID valuer.UUID, q *spantypes.ListSpanMapperGroupsQuery) ([]*spantypes.SpanMapperGroup, error) {
	storables, err := m.store.ListSpanMapperGroups(ctx, orgID, q)
	if err != nil {
		return nil, err
	}
	return spantypes.NewSpanMapperGroupsFromStorableGroups(storables), nil
}

func (m *module) GetGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*spantypes.SpanMapperGroup, error) {
	s, err := m.store.GetSpanMapperGroup(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	return spantypes.NewSpanMapperGroupFromStorable(s), nil
}

func (m *module) CreateGroup(ctx context.Context, orgID valuer.UUID, createdBy string, group *spantypes.SpanMapperGroup) error {
	now := time.Now()
	group.ID = valuer.GenerateUUID()
	group.OrgID = orgID
	group.CreatedAt = now
	group.UpdatedAt = now
	group.CreatedBy = createdBy
	group.UpdatedBy = createdBy

	storable := &spantypes.StorableSpanMapperGroup{
		Identifiable:  types.Identifiable{ID: group.ID},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		OrgID:         orgID,
		Name:          group.Name,
		Category:      group.Category,
		Condition:     group.Condition,
		Enabled:       group.Enabled,
	}

	if err := m.store.CreateSpanMapperGroup(ctx, storable); err != nil {
		return err
	}

	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (m *module) UpdateGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, group *spantypes.SpanMapperGroup) error {
	existing, err := m.store.GetSpanMapperGroup(ctx, orgID, id)
	if err != nil {
		return err
	}

	if group.Name != "" {
		existing.Name = group.Name
	}
	if len(group.Condition.Attributes) > 0 || len(group.Condition.Resource) > 0 {
		existing.Condition = group.Condition
	}
	existing.Enabled = group.Enabled
	existing.UpdatedAt = time.Now()
	existing.UpdatedBy = updatedBy

	if err := m.store.UpdateSpanMapperGroup(ctx, existing); err != nil {
		return err
	}

	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (m *module) DeleteGroup(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	if err := m.store.DeleteSpanMapperGroup(ctx, orgID, id); err != nil {
		return err
	}

	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (m *module) ListMappers(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID) ([]*spantypes.SpanMapper, error) {
	storables, err := m.store.ListSpanMappers(ctx, orgID, groupID)
	if err != nil {
		return nil, err
	}
	return spantypes.NewSpanMappersFromStorableSpanMappers(storables), nil
}

func (m *module) GetMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) (*spantypes.SpanMapper, error) {
	s, err := m.store.GetSpanMapper(ctx, orgID, groupID, id)
	if err != nil {
		return nil, err
	}
	return spantypes.NewSpanMapperFromStorable(s), nil
}

func (m *module) CreateMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, createdBy string, mapper *spantypes.SpanMapper) error {
	// Ensure the group belongs to the org before inserting the child row.
	if _, err := m.store.GetSpanMapperGroup(ctx, orgID, groupID); err != nil {
		return err
	}

	now := time.Now()
	mapper.ID = valuer.GenerateUUID()
	mapper.GroupID = groupID
	mapper.CreatedAt = now
	mapper.UpdatedAt = now
	mapper.CreatedBy = createdBy
	mapper.UpdatedBy = createdBy

	storable := &spantypes.StorableSpanMapper{
		Identifiable:  types.Identifiable{ID: mapper.ID},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		GroupID:       groupID,
		Name:          mapper.Name,
		FieldContext:  mapper.FieldContext,
		Config:        mapper.Config,
		Enabled:       mapper.Enabled,
	}

	if err := m.store.CreateSpanMapper(ctx, storable); err != nil {
		return err
	}

	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (m *module) UpdateMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID, updatedBy string, mapper *spantypes.SpanMapper) error {
	existing, err := m.store.GetSpanMapper(ctx, orgID, groupID, id)
	if err != nil {
		return err
	}

	if mapper.FieldContext != (spantypes.FieldContext{}) {
		existing.FieldContext = mapper.FieldContext
	}
	if mapper.Config.Sources != nil {
		existing.Config = mapper.Config
	}
	existing.Enabled = mapper.Enabled
	existing.UpdatedAt = time.Now()
	existing.UpdatedBy = updatedBy

	if err := m.store.UpdateSpanMapper(ctx, existing); err != nil {
		return err
	}

	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (m *module) DeleteMapper(ctx context.Context, orgID valuer.UUID, groupID valuer.UUID, id valuer.UUID) error {
	if err := m.store.DeleteSpanMapper(ctx, orgID, groupID, id); err != nil {
		return err
	}

	agentConf.NotifyConfigUpdate(ctx)
	return nil
}
