package coretypes

// resolvedResourceWithTarget is the resolved value of an attach/detach def. It
// implements ResolvedResourceWithTargetResource. Both sides carry their ids and
// selector; parentChild reports whether the target is authz-checked.
type resolvedResourceWithTarget struct {
	verb            Verb
	sourceResource  Resource
	sourceSelector  SelectorFunc
	sourceExtractor ResourceIDsExtractor
	sourceIDs       []string
	targetResource  Resource
	targetSelector  SelectorFunc
	targetExtractor ResourceIDsExtractor
	targetIDs       []string
	parentChild     bool
}

// NewResolvedResourceWithTarget builds a relationship resolved value, filling
// request-phase ids immediately. Response-phase ids (e.g. a created child) are
// filled later by ResolveResponse. A parent-child target carries a nil selector
// (it is never authz-checked).
func NewResolvedResourceWithTarget(
	verb Verb,
	sourceResource Resource,
	sourceExtractor ResourceIDsExtractor,
	sourceSelector SelectorFunc,
	targetResource Resource,
	targetExtractor ResourceIDsExtractor,
	targetSelector SelectorFunc,
	parentChild bool,
	ec ExtractorContext,
) ResolvedResourceWithTargetResource {
	resolved := &resolvedResourceWithTarget{
		verb:            verb,
		sourceResource:  sourceResource,
		sourceSelector:  sourceSelector,
		sourceExtractor: sourceExtractor,
		targetResource:  targetResource,
		targetSelector:  targetSelector,
		targetExtractor: targetExtractor,
		parentChild:     parentChild,
	}
	resolved.fill(PhaseRequest, ec)

	return resolved
}

func (resolved *resolvedResourceWithTarget) fill(phase ExtractPhase, ec ExtractorContext) {
	if resolved.sourceExtractor.Phase == phase && resolved.sourceExtractor.Fn != nil {
		if ids, _ := resolved.sourceExtractor.Fn(ec); len(ids) > 0 {
			resolved.sourceIDs = ids
		}
	}
	if resolved.targetExtractor.Phase == phase && resolved.targetExtractor.Fn != nil {
		if ids, _ := resolved.targetExtractor.Fn(ec); len(ids) > 0 {
			resolved.targetIDs = ids
		}
	}
}

func (resolved *resolvedResourceWithTarget) Verb() Verb               { return resolved.verb }
func (resolved *resolvedResourceWithTarget) SourceResource() Resource { return resolved.sourceResource }
func (resolved *resolvedResourceWithTarget) SourceIDs() []string      { return resolved.sourceIDs }
func (resolved *resolvedResourceWithTarget) SourceSelector() SelectorFunc {
	return resolved.sourceSelector
}
func (resolved *resolvedResourceWithTarget) TargetResource() Resource { return resolved.targetResource }
func (resolved *resolvedResourceWithTarget) TargetIDs() []string      { return resolved.targetIDs }
func (resolved *resolvedResourceWithTarget) TargetSelector() SelectorFunc {
	return resolved.targetSelector
}
func (resolved *resolvedResourceWithTarget) IsParentChild() bool { return resolved.parentChild }
func (resolved *resolvedResourceWithTarget) ResolveResponse(ec ExtractorContext) {
	resolved.fill(PhaseResponse, ec)
}
