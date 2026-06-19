package spantypes

import (
	"maps"
	"strings"
)

// resourceSourcePrefix marks a source that reads from resource attributes:
// buildAttributeRule prefixes those keys with "resource." (e.g. "resource.service.name").
var resourceSourcePrefix = FieldContextResource.StringValue() + "."

// SpanMappingPreviewSpan is the sample span a preview runs against. Only its
// attribute and resource maps participate in mapping.
type SpanMappingPreviewSpan struct {
	Attributes map[string]any `json:"attributes" nullable:"true"`
	Resource   map[string]any `json:"resource" nullable:"true"`
}

// SpanMappingPreviewGroup is one group to preview, applied in the order it
// appears in the request. Mappers is nil when the group is unchanged (the API
// loads its saved mappers by name) and non-nil (including empty) when the user
// is editing them, in which case the payload is authoritative.
type SpanMappingPreviewGroup struct {
	Group   PostableSpanMapperGroup `json:"group" required:"true"`
	Mappers *[]PostableSpanMapper   `json:"mappers" nullable:"true"`
}

type SpanMappingPreviewRequest struct {
	Span   SpanMappingPreviewSpan    `json:"span" required:"true"`
	Groups []SpanMappingPreviewGroup `json:"groups" required:"true" nullable:"true"`
}

type SpanMappingPreviewResponse struct {
	Span SpanMappingPreviewSpan `json:"span" required:"true"`
}

func SimulateMappingForAttributes(groups []*SpanMapperGroupWithMappers, resourceAttrs, spanAttrs map[string]any) (outResource, outSpan map[string]any) {
	cfg := buildProcessorConfig(filterEnabledGroupsWithMappers(groups))

	outResource = cloneAttrs(resourceAttrs)
	outSpan = cloneAttrs(spanAttrs)

	applyEnabledGroups(cfg, outSpan, outResource)
	return outResource, outSpan
}

func filterEnabledGroupsWithMappers(groups []*SpanMapperGroupWithMappers) []*SpanMapperGroupWithMappers {
	out := make([]*SpanMapperGroupWithMappers, 0, len(groups))
	for _, gm := range groups {
		if gm == nil || gm.Group == nil || !gm.Group.Enabled {
			continue
		}
		enabled := make([]*SpanMapper, 0, len(gm.Mappers))
		for _, m := range gm.Mappers {
			if m != nil && m.Enabled {
				enabled = append(enabled, m)
			}
		}
		if len(enabled) > 0 {
			out = append(out, &SpanMapperGroupWithMappers{Group: gm.Group, Mappers: enabled})
		}
	}
	return out
}

func cloneAttrs(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}

// The functions below are copied from signoz-otel-collector (processor/signozspanmappingprocessor, PR #796):
// TODO(spanmapper-preview): delete them and call the real processor once that PR merges and the dependency is bumped.
func applyEnabledGroups(cfg *spanMapperProcessorConfig, spanAttrs, resourceAttrs map[string]any) {
	for i := range cfg.Groups {
		g := &cfg.Groups[i]
		if !spanMapperConditionMet(g.ExistsAny, spanAttrs, resourceAttrs) {
			continue
		}
		for j := range g.Attributes {
			applySpanMapperRule(&g.Attributes[j], spanAttrs, resourceAttrs)
		}
	}
}

func spanMapperConditionMet(cond spanMapperProcessorExistsAny, spanAttrs, resourceAttrs map[string]any) bool {
	return anyKeyContains(spanAttrs, cond.Attributes) || anyKeyContains(resourceAttrs, cond.Resource)
}

func anyKeyContains(attrs map[string]any, patterns []string) bool {
	for k := range attrs {
		for _, p := range patterns {
			if strings.Contains(k, p) {
				return true
			}
		}
	}
	return false
}

func applySpanMapperRule(rule *spanMapperProcessorAttribute, spanAttrs, resourceAttrs map[string]any) {
	dst := spanAttrs
	if rule.Context == FieldContextResource.StringValue() {
		dst = resourceAttrs
	}

	for i := range rule.Sources {
		src := &rule.Sources[i]
		sourceKey, isResource := strings.CutPrefix(src.Key, resourceSourcePrefix)

		from := spanAttrs
		if isResource {
			from = resourceAttrs
		}
		val, ok := from[sourceKey]
		if !ok {
			continue
		}

		dst[rule.Target] = val
		if src.Action == SpanMapperOperationMove.StringValue() {
			delete(from, sourceKey)
		}
		return
	}
}
