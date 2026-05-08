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

const SpanAttrMappingFeatureType agentConf.AgentFeatureType = "span_attr_mapping"

// SpanAttrMappingFeature implements agentConf.AgentFeature. It reads enabled
// mapping groups and mappers from the module and generates the
// signozspanmappingprocessor config for deployment via OpAMP.
type SpanAttrMappingFeature struct {
	module spanmapper.Module
}

func NewSpanAttrMappingFeature(module spanmapper.Module) *SpanAttrMappingFeature {
	return &SpanAttrMappingFeature{module: module}
}

func (f *SpanAttrMappingFeature) AgentFeatureType() agentConf.AgentFeatureType {
	return SpanAttrMappingFeatureType
}

func (f *SpanAttrMappingFeature) RecommendAgentConfig(
	orgId valuer.UUID,
	currentConfYaml []byte,
	configVersion *opamptypes.AgentConfigVersion,
) ([]byte, string, error) {
	ctx := context.Background()

	groups, err := f.getEnabled(ctx, orgId)
	if err != nil {
		return nil, "", err
	}

	updatedConf, err := generateCollectorConfigWithSpanMapping(currentConfYaml, groups)
	if err != nil {
		return nil, "", err
	}

	serialized, err := json.Marshal(groups)
	if err != nil {
		return nil, "", err
	}

	return updatedConf, string(serialized), nil
}

// getEnabled returns enabled groups alongside their enabled mappers. Groups
// with no enabled mappers are still included so the collector sees the
// exists_any condition, even if the attributes list is empty.
func (f *SpanAttrMappingFeature) getEnabled(ctx context.Context, orgId valuer.UUID) ([]enabledGroup, error) {
	if f.module == nil {
		return nil, nil
	}

	enabled := true
	groups, err := f.module.ListGroups(ctx, orgId, &spantypes.ListSpanMapperGroupsQuery{Enabled: &enabled})
	if err != nil {
		return nil, err
	}

	out := make([]enabledGroup, 0, len(groups))
	for _, g := range groups {
		mappers, err := f.module.ListMappers(ctx, orgId, g.ID)
		if err != nil {
			return nil, err
		}
		enabledMappers := make([]*spantypes.SpanMapper, 0, len(mappers))
		for _, m := range mappers {
			if m.Enabled {
				enabledMappers = append(enabledMappers, m)
			}
		}
		out = append(out, enabledGroup{group: g, mappers: enabledMappers})
	}
	return out, nil
}
