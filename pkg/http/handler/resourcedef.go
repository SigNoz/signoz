package handler

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

type ResourceDef interface {
	// resolveRequest is unexported to seal the interface. It returns a slice so a
	// single def can fan out (e.g. a telemetry query touching multiple signals).
	resolveRequest(ec coretypes.ExtractorContext) []coretypes.ResolvedResource
}

func ResolveRequest(defs []ResourceDef, ec coretypes.ExtractorContext) []coretypes.ResolvedResource {
	resolved := make([]coretypes.ResolvedResource, 0, len(defs))
	for _, def := range defs {
		resolved = append(resolved, def.resolveRequest(ec)...)
	}

	return resolved
}

// BasicResourceDef checks a single resource for one verb.
type BasicResourceDef struct {
	Resource coretypes.Resource
	Verb     coretypes.Verb
	Category coretypes.ActionCategory
	ID       coretypes.ResourceIDExtractor
	Selector coretypes.SelectorFunc
}

func (def BasicResourceDef) resolveRequest(ec coretypes.ExtractorContext) []coretypes.ResolvedResource {
	return []coretypes.ResolvedResource{
		coretypes.NewResolvedResource(
			def.Verb,
			def.Category,
			def.Resource,
			def.ID,
			def.Selector,
			ec,
		),
	}
}

// AttachDetachSiblingResourceDef checks an attach/detach between peer resources;
// both source and target are authz-checked.
type AttachDetachSiblingResourceDef struct {
	Verb           coretypes.Verb
	Category       coretypes.ActionCategory
	SourceResource coretypes.Resource
	SourceIDs      coretypes.ResourceIDsExtractor
	SourceSelector coretypes.SelectorFunc
	TargetResource coretypes.Resource
	TargetIDs      coretypes.ResourceIDsExtractor
	TargetSelector coretypes.SelectorFunc
	// OptionalTargets drops the def when no target ids resolve, for routes where
	// the target list is legitimately optional in the payload.
	OptionalTargets bool
}

func (def AttachDetachSiblingResourceDef) resolveRequest(ec coretypes.ExtractorContext) []coretypes.ResolvedResource {
	if def.OptionalTargets && def.TargetIDs.IsPhase(coretypes.PhaseRequest) {
		// extractors are pure; on error fall through and let fill record it
		ids, err := def.TargetIDs.Fn(ec)
		if err == nil && len(ids) == 0 {
			return nil
		}
	}

	return []coretypes.ResolvedResource{
		coretypes.NewResolvedResourceWithTarget(
			def.Verb,
			def.Category,
			def.SourceResource,
			def.SourceIDs,
			def.SourceSelector,
			def.TargetResource,
			def.TargetIDs,
			def.TargetSelector,
			false,
			ec,
		),
	}
}

// AttachDetachParentChildResourceDef authz-checks only the parent; the child
// rides along for audit context.
type AttachDetachParentChildResourceDef struct {
	Verb           coretypes.Verb
	Category       coretypes.ActionCategory
	ParentResource coretypes.Resource
	ParentID       coretypes.ResourceIDExtractor
	ParentSelector coretypes.SelectorFunc
	ChildResource  coretypes.Resource
	ChildIDs       coretypes.ResourceIDsExtractor
}

func (def AttachDetachParentChildResourceDef) resolveRequest(ec coretypes.ExtractorContext) []coretypes.ResolvedResource {
	return []coretypes.ResolvedResource{
		coretypes.NewResolvedResourceWithTarget(
			def.Verb,
			def.Category,
			def.ParentResource,
			coretypes.OneID(def.ParentID),
			def.ParentSelector,
			def.ChildResource,
			def.ChildIDs,
			nil,
			true,
			ec,
		),
	}
}

type TelemetryResourceDef struct {
	Verb      coretypes.Verb
	Category  coretypes.ActionCategory
	Selector  coretypes.SelectorFunc
	Resources coretypes.ResourceExtractor
}

func (def TelemetryResourceDef) resolveRequest(ec coretypes.ExtractorContext) []coretypes.ResolvedResource {
	refs, err := def.Resources(ec)
	if err != nil {
		return []coretypes.ResolvedResource{coretypes.NewResolvedResourceWithError(def.Verb, def.Category, err)}
	}
	if len(refs) == 0 {
		return []coretypes.ResolvedResource{coretypes.NewResolvedResourceWithError(
			def.Verb,
			def.Category,
			errors.NewInvalidInputf(errors.CodeInvalidInput, "request resolved to no resources"),
		)}
	}

	resolved := make([]coretypes.ResolvedResource, 0, len(refs))
	for _, ref := range refs {
		resolved = append(resolved, coretypes.NewResolvedResourceWithID(def.Verb, def.Category, ref.Resource, ref.ID, def.Selector))
	}

	return resolved
}
