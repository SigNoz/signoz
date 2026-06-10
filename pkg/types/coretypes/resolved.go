package coretypes

// ResolvedResource is the resolved form of a resource def, produced by the
// resource middleware and read by authz and audit.
type ResolvedResource interface {
	Verb() Verb
	Category() ActionCategory
	SourceResource() Resource
	SourceIDs() []string
	SourceSelector() SelectorFunc
	ResolveResponse(ec ExtractorContext)
}

type ResolvedResourceWithTargetResource interface {
	ResolvedResource
	TargetResource() Resource
	TargetIDs() []string
	TargetSelector() SelectorFunc
	// IsParentChild true: the target is a child audited along but not authz-checked
	// (only the source is); false: a sibling peer that is also authz-checked.
	IsParentChild() bool
}
