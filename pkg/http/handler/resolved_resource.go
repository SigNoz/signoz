// The resolved output of a resource def, consumed by authz and audit.
package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

// ResolvedResource is the uniform output of resolution (after fan-out). ID is a
// resolved string: request-phase ids are filled by the resource middleware;
// response-phase ids stay "" until FinalizeResponseIDs runs in the audit
// middleware. idExtractor is retained so resolve can run it in its phase.
type ResolvedResource struct {
	Resource    coretypes.Resource
	Verb        coretypes.Verb
	ID          string
	Selector    SelectorFunc
	Category    audittypes.ActionCategory
	Related     *ResolvedRelated
	idExtractor coretypes.ResourceIDExtractor
}

// ResolvedRelated is the resolved counterpart for audit context.
type ResolvedRelated struct {
	Resource    coretypes.Resource
	ID          string
	idExtractor coretypes.ResourceIDExtractor
}

// newResolvedRelated wires a related counterpart's structure. Its id is resolved
// later by ResolvedResource.resolve, in the extractor's declared phase.
func newResolvedRelated(related *RelatedResource) *ResolvedRelated {
	if related == nil {
		return nil
	}

	return &ResolvedRelated{Resource: related.Resource, idExtractor: related.ID}
}

// resolve fills this entry's ids whose extractor belongs to phase. Called once
// per phase: coretypes.PhaseRequest by the resource middleware, coretypes.PhaseResponse by the audit
// middleware. An extractor from a different phase is left untouched.
func (resolved *ResolvedResource) resolve(phase coretypes.ExtractPhase, ec coretypes.ExtractorContext) {
	if id, ok := resolved.idExtractor.RunFor(phase, ec); ok {
		resolved.ID = id
	}

	if resolved.Related != nil {
		if id, ok := resolved.Related.idExtractor.RunFor(phase, ec); ok {
			resolved.Related.ID = id
		}
	}
}

// FinalizeResponseIDs runs the carried response-phase extractors against ec to
// fill the ids that were unknown pre-handler. Called by the audit middleware
// post-handler. Mutates the entries in place.
func FinalizeResponseIDs(resolved []*ResolvedResource, ec coretypes.ExtractorContext) {
	for _, entry := range resolved {
		entry.resolve(coretypes.PhaseResponse, ec)
	}
}

// HasResponseIDs reports whether any resolved entry needs the response body to
// finalize its id. The audit middleware uses this to decide whether to capture
// the success response body.
func HasResponseIDs(resolved []*ResolvedResource) bool {
	for _, entry := range resolved {
		if entry.idExtractor.IsPhase(coretypes.PhaseResponse) {
			return true
		}

		if entry.Related != nil && entry.Related.idExtractor.IsPhase(coretypes.PhaseResponse) {
			return true
		}
	}

	return false
}
