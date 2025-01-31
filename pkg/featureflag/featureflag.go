package featureflag

// FeatureFlag is the interface that all feature flag providers must implement
type FeatureFlag interface {
	//pass context
	GetFeatures() []Feature
}

// Feature is the struct that holds the feature flag data
type Feature struct {
	Name        Flag
	Description string
	Stage       Stage
	IsActive    bool

	// For future use
	// eg:- from OSS to enterprise
	RequiresRestart bool
}

// It represents the stage of the feature
type Stage struct {
	s string
}

func NewStage(s string) Stage {
	return Stage{s: s}
}

func (s Stage) String() string {
	return s.s
}

var (
	StageAlpha = NewStage("alpha")
	StageBeta  = NewStage("beta")
	StageGA    = NewStage("GA")
)
