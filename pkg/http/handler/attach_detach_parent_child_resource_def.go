// Declaration that checks a parent's attach/detach; the child is audit context.
package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

// AttachDetachParentChildResourceDef checks the PARENT's attach/detach only. The
// child rides along for audit context and is never authz-checked, so the parent
// is always checked even when no child id is available yet (e.g. a
// response-derived child). The parent is a single resource; the child may be one
// or many.
type AttachDetachParentChildResourceDef struct {
	Verb           coretypes.Verb
	ParentResource coretypes.Resource
	ParentID       coretypes.ResourceIDExtractor
	ParentSelector SelectorFunc
	ChildResource  coretypes.Resource
	ChildIDs       coretypes.ResourceIDsExtractor
	Category       audittypes.ActionCategory
}

func (def AttachDetachParentChildResourceDef) resolveRequest(ec coretypes.ExtractorContext) []*ResolvedResource {
	var childIDs []string
	if def.ChildIDs.Fn != nil {
		childIDs, _ = def.ChildIDs.Fn(ec)
	}

	// The parent is the only checked resource, so it must produce an entry even
	// when no child id is available yet.
	if len(childIDs) == 0 {
		return []*ResolvedResource{def.parentEntry(ec, nil)}
	}

	resolved := make([]*ResolvedResource, 0, len(childIDs))
	for _, childID := range childIDs {
		resolved = append(resolved, def.parentEntry(ec, &ResolvedRelated{Resource: def.ChildResource, ID: childID}))
	}

	return resolved
}

func (def AttachDetachParentChildResourceDef) parentEntry(ec coretypes.ExtractorContext, child *ResolvedRelated) *ResolvedResource {
	parent := &ResolvedResource{
		Resource:    def.ParentResource,
		Verb:        def.Verb,
		Selector:    def.ParentSelector,
		Category:    def.Category,
		idExtractor: def.ParentID,
		Related:     child,
	}
	parent.resolve(coretypes.PhaseRequest, ec)

	return parent
}
