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

// ResourceWithID is one (resource, id) the extractor pulls from the request;
// each becomes a single resolved resource to check. ID may be empty for
// collection-level access.
type ResourceWithID struct {
	Resource Resource
	ID       string
}

// ResourceExtractor pulls the resource(s) an operation acts on out of the
// request — with their ids — for cases where the resource itself is
// data-dependent rather than a fixed declaration (e.g. a telemetry query whose
// signal/source pick the resource). It is the resource-level analogue of the id
// extractors.
type ResourceExtractor func(ExtractorContext) ([]ResourceWithID, error)
