package implspanmapper

import (
	"context"
	"log/slog"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (module *module) ReconcileSystemGroups(ctx context.Context, orgID valuer.UUID) error {
	for _, definition := range module.registry.List() {
		if err := module.reconcileSystemGroup(ctx, orgID, definition); err != nil {
			return err
		}
	}
	agentConf.NotifyConfigUpdate(ctx)
	return nil
}

// reconcileSystemGroup brings one org's copy of a definition to the shipped
// version in a single transaction. A concurrent provisioner (another replica,
// or the org-creation hook racing the startup sweep) loses on the group's
// unique (org_id, name) index and is treated as a no-op.
func (module *module) reconcileSystemGroup(ctx context.Context, orgID valuer.UUID, definition spantypes.SpanMapperGroupDefinition) error {
	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		group, err := module.store.GetGroupByName(ctx, orgID, definition.Name())
		if err != nil && errors.Ast(err, errors.TypeNotFound) {
			group = newSystemGroup(orgID, definition)
			err = module.store.CreateGroup(ctx, group)
		}
		if err != nil {
			return err
		}

		if group.Origin != spantypes.SpanMapperOriginSystem {
			module.settings.Logger().WarnContext(ctx, "skipping default span mapper group: a user group holds its name", slog.String("name", definition.Name()), slog.String("org_id", orgID.StringValue()))
			return nil
		}
		if group.Version >= definition.Version {
			return nil
		}
		return module.applyDefinition(ctx, orgID, group, definition)
	})
	if err != nil && errors.Ast(err, errors.TypeAlreadyExists) {
		module.settings.Logger().DebugContext(ctx, "default span mapper group provisioned concurrently", slog.String("name", definition.Name()), slog.String("org_id", orgID.StringValue()))
		return nil
	}
	return err
}

// applyDefinition replaces every shipped item with the definition, carrying each
// enabled flag over by identity, and leaves user items untouched. A mapper that
// is no longer shipped is deleted unless the user added sources to it, in which
// case it survives as a user mapper.
func (module *module) applyDefinition(ctx context.Context, orgID valuer.UUID, group *spantypes.SpanMapperGroup, definition spantypes.SpanMapperGroupDefinition) error {
	mappers, err := module.store.ListMappers(ctx, orgID, group.ID)
	if err != nil {
		return err
	}
	byName := make(map[string]*spantypes.SpanMapper, len(mappers))
	for _, m := range mappers {
		byName[m.Name] = m
	}

	now := time.Now()
	for i := range definition.Definition.Mappers {
		pm := &definition.Definition.Mappers[i]
		mapper, exists := byName[pm.Name]
		delete(byName, pm.Name)
		if !exists {
			if err := module.store.CreateMapper(ctx, newSystemMapper(group.ID, definition, pm)); err != nil {
				return err
			}
			continue
		}
		mapper.Config.Sources = mergeShippedSources(mapper.Config.Sources, definition.SystemSources(pm))
		mapper.FieldContext = pm.FieldContext
		mapper.Origin = spantypes.SpanMapperOriginSystem
		mapper.UpdatedAt = now
		mapper.UpdatedBy = spantypes.ProvisionerIdentity
		if err := module.store.UpdateMapper(ctx, mapper); err != nil {
			return err
		}
	}

	// Whatever is left in byName is not shipped any more.
	for _, mapper := range byName {
		if mapper.Origin != spantypes.SpanMapperOriginSystem {
			continue
		}
		mapper.Config.Sources = mergeShippedSources(mapper.Config.Sources, nil)
		if len(mapper.Config.Sources) == 0 {
			if err := module.store.DeleteMapper(ctx, orgID, group.ID, mapper.ID); err != nil {
				return err
			}
			continue
		}
		mapper.Origin = spantypes.SpanMapperOriginUser
		mapper.UpdatedAt = now
		mapper.UpdatedBy = spantypes.ProvisionerIdentity
		if err := module.store.UpdateMapper(ctx, mapper); err != nil {
			return err
		}
	}

	shipped := definition.SystemCondition()
	group.Condition = spantypes.SpanMapperGroupCondition{
		Attributes: mergeShippedConditionKeys(group.Condition.Attributes, shipped.Attributes),
		Resource:   mergeShippedConditionKeys(group.Condition.Resource, shipped.Resource),
	}
	group.Version = definition.Version
	group.UpdatedAt = now
	group.UpdatedBy = spantypes.ProvisionerIdentity
	if err := module.store.UpdateGroup(ctx, group); err != nil {
		return err
	}

	module.settings.Logger().InfoContext(ctx, "applied default span mapper group", slog.String("name", definition.Name()), slog.Int("version", definition.Version), slog.String("org_id", orgID.StringValue()))
	return nil
}

// newSystemGroup is the empty shell applyDefinition fills: version 0 so the
// definition is applied right after the row exists.
func newSystemGroup(orgID valuer.UUID, definition spantypes.SpanMapperGroupDefinition) *spantypes.SpanMapperGroup {
	group := spantypes.NewSpanMapperGroup(orgID, spantypes.ProvisionerIdentity, &definition.Definition.PostableSpanMapperGroup)
	group.Condition = definition.SystemCondition()
	group.Enabled = true
	group.Origin = spantypes.SpanMapperOriginSystem
	return group
}

func newSystemMapper(groupID valuer.UUID, definition spantypes.SpanMapperGroupDefinition, pm *spantypes.PostableSpanMapper) *spantypes.SpanMapper {
	mapper := spantypes.NewSpanMapper(groupID, spantypes.ProvisionerIdentity, pm)
	mapper.Config = spantypes.SpanMapperConfig{Sources: definition.SystemSources(pm)}
	mapper.Enabled = true
	mapper.Origin = spantypes.SpanMapperOriginSystem
	return mapper
}

// mergeShippedConditionKeys returns the shipped keys, each keeping the enabled
// flag of the stored system key with the same value, followed by the stored
// user keys.
func mergeShippedConditionKeys(stored, shipped []spantypes.SpanMapperGroupConditionKey) []spantypes.SpanMapperGroupConditionKey {
	out := make([]spantypes.SpanMapperGroupConditionKey, 0, len(stored)+len(shipped))
	for _, k := range shipped {
		idx := slices.IndexFunc(stored, func(s spantypes.SpanMapperGroupConditionKey) bool {
			return s.Origin == spantypes.SpanMapperOriginSystem && s.Value == k.Value
		})
		if idx != -1 {
			k.Enabled = stored[idx].Enabled
		}
		out = append(out, k)
	}
	for _, k := range stored {
		if k.Origin != spantypes.SpanMapperOriginSystem {
			out = append(out, k)
		}
	}
	return out
}

// mergeShippedSources returns the shipped sources, each keeping the enabled
// flag of the stored system source with the same key and context, followed by
// the stored user sources.
func mergeShippedSources(stored, shipped []spantypes.SpanMapperSource) []spantypes.SpanMapperSource {
	out := make([]spantypes.SpanMapperSource, 0, len(stored)+len(shipped))
	for _, s := range shipped {
		idx := slices.IndexFunc(stored, func(o spantypes.SpanMapperSource) bool {
			return o.Origin == spantypes.SpanMapperOriginSystem && o.Key == s.Key && o.Context == s.Context
		})
		if idx != -1 {
			s.Enabled = stored[idx].Enabled
		}
		out = append(out, s)
	}
	for _, s := range stored {
		if s.Origin != spantypes.SpanMapperOriginSystem {
			out = append(out, s)
		}
	}
	return out
}
