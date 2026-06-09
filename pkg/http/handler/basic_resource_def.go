// Declaration that checks a single resource for one verb (LCRUD).
package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

// BasicResourceDef checks a single resource for one verb. It covers the
// create / read / update / delete / list cases on one resource.
type BasicResourceDef struct {
	Resource coretypes.Resource
	Verb     coretypes.Verb
	ID       coretypes.ResourceIDExtractor
	Selector SelectorFunc
	Category audittypes.ActionCategory
}

func (def BasicResourceDef) resolveRequest(ec coretypes.ExtractorContext) []*ResolvedResource {
	resolved := &ResolvedResource{
		Resource:    def.Resource,
		Verb:        def.Verb,
		Selector:    def.Selector,
		Category:    def.Category,
		idExtractor: def.ID,
	}
	resolved.resolve(coretypes.PhaseRequest, ec)

	return []*ResolvedResource{resolved}
}
