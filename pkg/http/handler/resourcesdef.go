// Declaration API for a fan-out: many resources of one kind in a single operation.
package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

// ResourcesDef declares many resources of one kind (fan-out). One resolved
// entry is produced per id.
type ResourcesDef struct {
	Resource coretypes.Resource
	Verb     coretypes.Verb
	IDs      ResourceIDsExtractor
	Selector SelectorFunc
	Category audittypes.ActionCategory
	Related  *RelatedResource
}

func (ResourcesDef) sealResourceSpec() {}

func (d ResourcesDef) resolveRequest(ec ExtractorContext) []*ResolvedResource {
	var ids []string
	if d.IDs.fn != nil {
		ids, _ = d.IDs.fn(ec)
	}

	resolved := make([]*ResolvedResource, 0, len(ids))
	for _, id := range ids {
		entry := &ResolvedResource{
			Resource: d.Resource,
			Verb:     d.Verb,
			ID:       id,
			Selector: d.Selector,
			Category: d.Category,
			Related:  newResolvedRelated(d.Related),
		}
		entry.resolve(phaseRequest, ec)
		resolved = append(resolved, entry)
	}

	return resolved
}
