package coretypes

type ExtractPhase int

const (
	PhaseRequest ExtractPhase = iota
	PhaseResponse
)

type ResourceIDExtractor struct {
	Phase ExtractPhase
	Fn    func(ExtractorContext) (string, error)
}

func (extractor ResourceIDExtractor) IsPhase(phase ExtractPhase) bool {
	return extractor.Fn != nil && extractor.Phase == phase
}

func (extractor ResourceIDExtractor) RunFor(phase ExtractPhase, ec ExtractorContext) (string, bool) {
	if !extractor.IsPhase(phase) {
		return "", false
	}

	id, _ := extractor.Fn(ec)
	return id, true
}

type ResourceIDsExtractor struct {
	Phase ExtractPhase
	Fn    func(ExtractorContext) ([]string, error)
}
