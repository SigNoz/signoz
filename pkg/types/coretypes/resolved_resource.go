package coretypes

type resolvedResource struct {
	verb        Verb
	category    ActionCategory
	resource    Resource
	selector    SelectorFunc
	idExtractor ResourceIDExtractor
	ids         []string
}

func NewResolvedResource(
	verb Verb,
	category ActionCategory,
	resource Resource,
	idExtractor ResourceIDExtractor,
	selector SelectorFunc,
	ec ExtractorContext,
) ResolvedResource {
	resolved := &resolvedResource{
		verb:        verb,
		category:    category,
		resource:    resource,
		selector:    selector,
		idExtractor: idExtractor,
	}
	resolved.fill(PhaseRequest, ec)

	return resolved
}

func (resolved *resolvedResource) fill(phase ExtractPhase, ec ExtractorContext) {
	if id, ok := resolved.idExtractor.RunFor(phase, ec); ok && id != "" {
		resolved.ids = []string{id}
	}
}

func (resolved *resolvedResource) Verb() Verb {
	return resolved.verb
}

func (resolved *resolvedResource) Category() ActionCategory {
	return resolved.category
}

func (resolved *resolvedResource) SourceResource() Resource {
	return resolved.resource
}

// An empty id (when none resolved) means collection-level access.
func (resolved *resolvedResource) SourceIDs() []string {
	if len(resolved.ids) == 0 {
		return []string{""}
	}

	return resolved.ids
}

func (resolved *resolvedResource) SourceSelector() SelectorFunc {
	return resolved.selector
}

func (resolved *resolvedResource) ResolveResponse(ec ExtractorContext) {
	resolved.fill(PhaseResponse, ec)
}

func (resolved *resolvedResource) hasResponsePhase() bool {
	return resolved.idExtractor.IsPhase(PhaseResponse)
}
