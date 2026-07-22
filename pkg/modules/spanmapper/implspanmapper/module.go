package implspanmapper

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/spanmapper"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store   spantypes.SpanMapperStore
	flagger flagger.Flagger
}

func NewModule(store spantypes.SpanMapperStore, flagger flagger.Flagger) spanmapper.Module {
	return &module{store: store, flagger: flagger}
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

// maxTestSpans bounds the input size: every test request boots a full
// in-memory collector pipeline and is reachable with viewer access.
const maxTestSpans = 100

func (module *module) TestMappers(ctx context.Context, orgID valuer.UUID, spans []spantypes.SpanMapperTestSpan, groups []*spantypes.SpanMapperGroupWithMappers) ([]spantypes.SpanMapperTestSpan, []string, error) {
	if len(spans) == 0 {
		return nil, nil, errors.New(errors.TypeInvalidInput, spantypes.ErrCodeMappingInvalidInput, "'spans' must contain at least one span")
	}
	if len(spans) > maxTestSpans {
		return nil, nil, errors.Newf(errors.TypeInvalidInput, spantypes.ErrCodeMappingInvalidInput, "'spans' must contain at most %d spans", maxTestSpans)
	}

	resolved, err := module.backfillMappers(ctx, orgID, groups)
	if err != nil {
		return nil, nil, err
	}

	out, collectorLogs, err := spantypes.SimulateSpanMappersProcessing(ctx, resolved, spans)
	if err != nil {
		return nil, nil, err
	}
	return out, collectorLogs, nil
}

// backfillMappers loads saved mappers for any enabled group whose Mappers is
// nil. Disabled groups are skipped: the simulation filters them out anyway,
// so there is no point loading their mappers or failing on their names.
func (module *module) backfillMappers(ctx context.Context, orgID valuer.UUID, groups []*spantypes.SpanMapperGroupWithMappers) ([]*spantypes.SpanMapperGroupWithMappers, error) {
	savedGroups, err := module.store.ListGroups(ctx, orgID, nil)
	if err != nil {
		return nil, err
	}
	savedByName := make(map[string]*spantypes.SpanMapperGroup, len(savedGroups))
	for _, g := range savedGroups {
		savedByName[g.Name] = g
	}

	// For each group in the request, if Mappers is nil, load the saved mappers for that group name.
	for _, g := range groups {
		if g.Mappers != nil || !g.Group.Enabled {
			continue
		}
		saved, ok := savedByName[g.Group.Name]
		if !ok {
			return nil, errors.Newf(errors.TypeNotFound, spantypes.ErrCodeMappingGroupNotFound, "no saved group named %q to load mappers from; send 'mappers' for new or edited groups", g.Group.Name)
		}
		loaded, err := module.store.ListMappers(ctx, orgID, saved.ID)
		if err != nil {
			return nil, err
		}
		g.Mappers = loaded
	}
	return groups, nil
}

func (module *module) AgentFeatureType() agentConf.AgentFeatureType {
	return spantypes.SpanAttrMappingFeatureType
}

func (module *module) RecommendAgentConfig(orgID valuer.UUID, currentConfYaml []byte, configVersion *opamptypes.AgentConfigVersion) ([]byte, string, error) {
	ctx := context.Background()

	// Skip the llm pricing processor unless AI observability is enabled for the org.
	evalCtx := featuretypes.NewFlaggerEvaluationContext(orgID)
	enabled, err := module.flagger.Boolean(ctx, flagger.FeatureEnableAIObservability, evalCtx)
	if err != nil {
		return nil, "", err
	}
	if !enabled {
		return currentConfYaml, "", nil
	}

	enabledMappers, err := module.listEnabledGroupsWithMappers(ctx, orgID)
	if err != nil {
		return nil, "", err
	}

	updatedConf, err := spantypes.GenerateCollectorConfigWithSpanMapperProcessor(currentConfYaml, enabledMappers)
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
