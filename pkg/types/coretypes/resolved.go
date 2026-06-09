package coretypes

// ResolvedResource is the resolved form of a resource def, produced by the
// resource middleware (ResolveRequest) and read by authz and audit. The source
// is the resource the operation acts on — the sole resource for a basic def.
//
// Two-phase: request-phase ids are filled when the value is produced; the audit
// middleware calls ResolveResponse with the response body to fill any
// response-phase ids (e.g. a created resource's id).
type ResolvedResource interface {
	Verb() Verb
	SourceResource() Resource
	SourceIDs() []string
	SourceSelector() SelectorFunc
	ResolveResponse(ec ExtractorContext)
}

// ResolvedResourceWithTargetResource is implemented only by attach/detach defs
// that have a counterpart. A basic def never implements it, so there is no nil
// target to guard against — the absence of a target is the absence of this
// interface.
type ResolvedResourceWithTargetResource interface {
	ResolvedResource
	TargetResource() Resource
	TargetIDs() []string
	TargetSelector() SelectorFunc
	// IsParentChild reports the relationship kind: true means the target is a
	// child that rides along for audit only (authz checks the source alone);
	// false means a sibling peer that is also authz-checked.
	IsParentChild() bool
}
