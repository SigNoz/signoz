// The ResourceDef contract a route declares, its implementations, and the
// request-phase resolver.
package handler

import "github.com/SigNoz/signoz/pkg/types/coretypes"

// ResourceDef is implemented by the explicit declaration types below. A route
// attaches one or more via WithResourceDefs; the resource middleware resolves
// each into a coretypes.ResolvedResource.
type ResourceDef interface {
	// resolveRequest is unexported so the interface is sealed — only the defs
	// declared in this package can satisfy it.
	resolveRequest(ec coretypes.ExtractorContext) coretypes.ResolvedResource
}

// ResolveRequest resolves every def's request-phase ids against ec. Called by
// the resource middleware pre-handler; the audit middleware later finalizes
// response-phase ids via ResolvedResource.ResolveResponse.
func ResolveRequest(defs []ResourceDef, ec coretypes.ExtractorContext) []coretypes.ResolvedResource {
	resolved := make([]coretypes.ResolvedResource, 0, len(defs))
	for _, def := range defs {
		resolved = append(resolved, def.resolveRequest(ec))
	}

	return resolved
}

// BasicResourceDef checks a single resource for one verb. It covers the
// create / read / update / delete / list cases on one resource.
type BasicResourceDef struct {
	Resource coretypes.Resource
	Verb     coretypes.Verb
	Category coretypes.ActionCategory
	ID       coretypes.ResourceIDExtractor
	Selector coretypes.SelectorFunc
}

func (def BasicResourceDef) resolveRequest(ec coretypes.ExtractorContext) coretypes.ResolvedResource {
	return coretypes.NewResolvedResource(def.Verb, def.Category, def.Resource, def.ID, def.Selector, ec)
}

// AttachDetachSiblingResourceDef checks an attach/detach between peer resources.
// Both the source and the target are authz-checked (M+N absolute checks, not
// M×N). Use OneID to feed a single-id side. The target also rides along on the
// resolved value for audit context.
type AttachDetachSiblingResourceDef struct {
	Verb           coretypes.Verb
	Category       coretypes.ActionCategory
	SourceResource coretypes.Resource
	SourceIDs      coretypes.ResourceIDsExtractor
	SourceSelector coretypes.SelectorFunc
	TargetResource coretypes.Resource
	TargetIDs      coretypes.ResourceIDsExtractor
	TargetSelector coretypes.SelectorFunc
}

func (def AttachDetachSiblingResourceDef) resolveRequest(ec coretypes.ExtractorContext) coretypes.ResolvedResource {
	return coretypes.NewResolvedResourceWithTarget(
		def.Verb,
		def.Category,
		def.SourceResource, def.SourceIDs, def.SourceSelector,
		def.TargetResource, def.TargetIDs, def.TargetSelector,
		false,
		ec,
	)
}

// AttachDetachParentChildResourceDef checks the PARENT's attach/detach only. The
// child rides along for audit context and is never authz-checked (its selector
// is nil). The parent is a single resource; the child may be one or many.
type AttachDetachParentChildResourceDef struct {
	Verb           coretypes.Verb
	Category       coretypes.ActionCategory
	ParentResource coretypes.Resource
	ParentID       coretypes.ResourceIDExtractor
	ParentSelector coretypes.SelectorFunc
	ChildResource  coretypes.Resource
	ChildIDs       coretypes.ResourceIDsExtractor
}

func (def AttachDetachParentChildResourceDef) resolveRequest(ec coretypes.ExtractorContext) coretypes.ResolvedResource {
	return coretypes.NewResolvedResourceWithTarget(
		def.Verb,
		def.Category,
		def.ParentResource, OneID(def.ParentID), def.ParentSelector,
		def.ChildResource, def.ChildIDs, nil,
		true,
		ec,
	)
}
