package coretypes

// ExtractPhase marks whether an extractor reads request-side data (resolved
// pre-handler by the resource middleware) or response-side data (resolved
// post-handler by the audit middleware).
type ExtractPhase int

const (
	PhaseRequest ExtractPhase = iota
	PhaseResponse
)

// ResourceIDExtractor resolves a single resource id. Phase-tagged so the
// resolver runs it exactly once in the right phase. The handler package exposes
// only constructors (PathParam, BodyJSONPath, ...) so the phase stays internal
// to the declaration API.
type ResourceIDExtractor struct {
	Phase ExtractPhase
	Fn    func(ExtractorContext) (string, error)
}

// IsPhase reports whether this extractor is runnable in the given phase.
func (extractor ResourceIDExtractor) IsPhase(phase ExtractPhase) bool {
	return extractor.Fn != nil && extractor.Phase == phase
}

// RunFor runs the extractor against ec when it belongs to phase, reporting
// whether it ran.
func (extractor ResourceIDExtractor) RunFor(phase ExtractPhase, ec ExtractorContext) (string, bool) {
	if !extractor.IsPhase(phase) {
		return "", false
	}

	id, _ := extractor.Fn(ec)
	return id, true
}

// ResourceIDsExtractor resolves multiple resource ids (fan-out). Always
// request-phase — arrays come from the request body.
type ResourceIDsExtractor struct {
	Phase ExtractPhase
	Fn    func(ExtractorContext) ([]string, error)
}
