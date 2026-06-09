// Declaration that checks an attach/detach between peer (sibling) resources.
package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

// AttachDetachSiblingResourceDef checks an attach/detach between peer resources
// (M sources × N targets). Every source AND every target is authz-checked
// (mutual). For audit, each side of every (source, target) pair is emitted with
// the other as its Related counterpart. Use OneID to feed a single-id side.
type AttachDetachSiblingResourceDef struct {
	Verb           coretypes.Verb
	SourceResource coretypes.Resource
	SourceIDs      coretypes.ResourceIDsExtractor
	SourceSelector SelectorFunc
	TargetResource coretypes.Resource
	TargetIDs      coretypes.ResourceIDsExtractor
	TargetSelector SelectorFunc
	Category       audittypes.ActionCategory
}

func (def AttachDetachSiblingResourceDef) resolveRequest(ec coretypes.ExtractorContext) []*ResolvedResource {
	var sourceIDs, targetIDs []string
	if def.SourceIDs.Fn != nil {
		sourceIDs, _ = def.SourceIDs.Fn(ec)
	}
	if def.TargetIDs.Fn != nil {
		targetIDs, _ = def.TargetIDs.Fn(ec)
	}

	resolved := make([]*ResolvedResource, 0, 2*len(sourceIDs)*len(targetIDs))
	for _, sourceID := range sourceIDs {
		for _, targetID := range targetIDs {
			resolved = append(resolved,
				&ResolvedResource{
					Resource: def.SourceResource,
					Verb:     def.Verb,
					ID:       sourceID,
					Selector: def.SourceSelector,
					Category: def.Category,
					Related:  &ResolvedRelated{Resource: def.TargetResource, ID: targetID},
				},
				&ResolvedResource{
					Resource: def.TargetResource,
					Verb:     def.Verb,
					ID:       targetID,
					Selector: def.TargetSelector,
					Category: def.Category,
					Related:  &ResolvedRelated{Resource: def.SourceResource, ID: sourceID},
				},
			)
		}
	}

	return resolved
}
