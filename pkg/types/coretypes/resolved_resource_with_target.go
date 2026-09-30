package coretypes

type resolvedResourceWithTarget struct {
	verb            Verb
	category        ActionCategory
	sourceResource  Resource
	sourceSelector  SelectorFunc
	sourceExtractor ResourceIDsExtractor
	sourceIDs       []string
	targetResource  Resource
	targetSelector  SelectorFunc
	targetExtractor ResourceIDsExtractor
	targetIDs       []string
	parentChild     bool
	noLinks         bool
	err             error
}

func NewResolvedResourceWithTarget(
	verb Verb,
	category ActionCategory,
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
		category:        category,
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
	if err := resolved.fillSide(phase, ec, resolved.sourceExtractor, &resolved.sourceIDs); err != nil {
		resolved.err = err
		return
	}

	if err := resolved.fillSide(phase, ec, resolved.targetExtractor, &resolved.targetIDs); err != nil {
		resolved.err = err
	}
}

func (resolved *resolvedResourceWithTarget) fillSide(phase ExtractPhase, ec ExtractorContext, extractor ResourceIDsExtractor, ids *[]string) error {
	if !extractor.IsPhase(phase) {
		return nil
	}

	extracted, err := extractor.Fn(ec)
	if err != nil {
		if phase == PhaseRequest {
			return err
		}

		return nil
	}

	if len(extracted) == 0 {
		if phase == PhaseRequest {
			resolved.noLinks = true
		}

		return nil
	}

	*ids = extracted
	return nil
}

func (resolved *resolvedResourceWithTarget) Err() error {
	return resolved.err
}

func (resolved *resolvedResourceWithTarget) Verb() Verb {
	return resolved.verb
}

func (resolved *resolvedResourceWithTarget) Category() ActionCategory {
	return resolved.category
}

func (resolved *resolvedResourceWithTarget) SourceResource() Resource {
	return resolved.sourceResource
}

// An empty id (when none resolved) means collection-level access.
func (resolved *resolvedResourceWithTarget) SourceIDs() []string {
	if len(resolved.sourceIDs) == 0 {
		return []string{""}
	}

	return resolved.sourceIDs
}

func (resolved *resolvedResourceWithTarget) SourceSelector() SelectorFunc {
	return resolved.sourceSelector
}

func (resolved *resolvedResourceWithTarget) TargetResource() Resource {
	return resolved.targetResource
}

func (resolved *resolvedResourceWithTarget) TargetIDs() []string {
	if len(resolved.targetIDs) == 0 {
		return []string{""}
	}

	return resolved.targetIDs
}
func (resolved *resolvedResourceWithTarget) TargetSelector() SelectorFunc {
	return resolved.targetSelector
}

func (resolved *resolvedResourceWithTarget) IsParentChild() bool {
	return resolved.parentChild
}

func (resolved *resolvedResourceWithTarget) HasNoLinks() bool {
	return resolved.noLinks
}

func (resolved *resolvedResourceWithTarget) ResolveResponse(ec ExtractorContext) {
	resolved.fill(PhaseResponse, ec)
}

func (resolved *resolvedResourceWithTarget) hasResponsePhase() bool {
	return resolved.sourceExtractor.IsPhase(PhaseResponse) || resolved.targetExtractor.IsPhase(PhaseResponse)
}
