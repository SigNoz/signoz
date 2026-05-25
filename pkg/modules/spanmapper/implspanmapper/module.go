package implspanmapper

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/modules/spanmapper"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
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

	err = module.store.UpdateGroup(ctx, group)
	if err != nil {
		return err
	}
	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (module *module) DeleteGroup(ctx context.Context, orgID, id valuer.UUID) error {
	err := module.store.DeleteGroup(ctx, orgID, id)
	if err != nil {
		return err
	}
	agentConf.NotifyConfigUpdate(ctx)
	return nil
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
	err := module.store.CreateMapper(ctx, mapper)
	if err != nil {
		return err
	}
	agentConf.NotifyConfigUpdate(ctx)
	return nil
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
	err = module.store.UpdateMapper(ctx, mapper)
	if err != nil {
		return err
	}
	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (module *module) DeleteMapper(ctx context.Context, orgID, groupID, id valuer.UUID) error {
	err := module.store.DeleteMapper(ctx, orgID, groupID, id)
	if err != nil {
		return err
	}
	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

func (module *module) AgentFeatureType() agentConf.AgentFeatureType {
	return spantypes.SpanAttrMappingFeatureType
}

func (module *module) RecommendAgentConfig(orgID valuer.UUID, currentConfYaml []byte, configVersion *opamptypes.AgentConfigVersion) ([]byte, string, error) {
	ctx := context.Background()

	enabled, err := module.listEnabledGroupsWithMappers(ctx, orgID)
	if err != nil {
		return nil, "", err
	}

	updatedConf, err := spantypes.GenerateCollectorConfigWithSpanMapperProcessor(currentConfYaml, enabled)
	if err != nil {
		return nil, "", err
	}

	serialized, err := json.Marshal(enabled)
	if err != nil {
		return nil, "", err
	}

	return updatedConf, string(serialized), nil
}

// listEnabledGroupsWithMappers returns groups with their mappers.
func (module *module) listEnabledGroupsWithMappers(ctx context.Context, orgID valuer.UUID) ([]*spantypes.SpanMapperGroupWithMappers, error) {
	enabled := true
	groups, err := module.store.ListGroups(ctx, orgID, &spantypes.ListSpanMapperGroupsQuery{Enabled: &enabled})
	if err != nil {
		return nil, err
	}

	out := make([]*spantypes.SpanMapperGroupWithMappers, 0, len(groups))
	for _, g := range groups {
		mappers, err := module.store.ListMappers(ctx, orgID, g.ID)
		if err != nil {
			return nil, err
		}
		enabledMappers := make([]*spantypes.SpanMapper, 0, len(mappers))
		for _, m := range mappers {
			if m.Enabled {
				enabledMappers = append(enabledMappers, m)
			}
		}
		if len(enabledMappers) == 0 {
			continue
		}
		out = append(out, &spantypes.SpanMapperGroupWithMappers{Group: g, Mappers: enabledMappers})
	}
	return out, nil
}
