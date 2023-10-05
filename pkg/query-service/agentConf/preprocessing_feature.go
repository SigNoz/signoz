package agentConf

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

// Interface for specific signal pre-processing feature implementations

// Strategy for recommending a collector config for
// a particular version of pre-processing settings.
type CollectorConfigGenerator func(
	db *sqlx.DB,

	// Base collector config to build upon
	baseConfYaml []byte,

	// The recommendation should be made based on this
	// version of the feature's settings.
	featureSettings *ConfigVersion,
) (recommendedConfYaml []byte, apiErr *model.ApiError)

// TODO(Raj): Maybe reorganize registry to be like
// https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/operator/registry.go
type PreprocessingFeatureType string

type Registry struct {
	configGenerators map[PreprocessingFeatureType]CollectorConfigGenerator
}

func (r *Registry) Register(
	featureType PreprocessingFeatureType,
	configGenerator CollectorConfigGenerator,
) {
	if r.configGenerators[featureType] != nil {
		panic(fmt.Sprintf(
			"Pre processing feature can't be registered more than once: %s", featureType,
		))
	}
	r.configGenerators[featureType] = configGenerator
}

// NewRegistry creates a new registry
func NewRegistry() *Registry {
	return &Registry{
		configGenerators: make(
			map[PreprocessingFeatureType]CollectorConfigGenerator,
		),
	}
}

// DefaultRegistry is a global registry of Signal Pre-processing features
var DefaultRegistry = NewRegistry()

// Registers an SPF with the default registry
func RegisterSignalPreprocessingFeature(
	featureType PreprocessingFeatureType,
	configGenerator CollectorConfigGenerator,
) {
	DefaultRegistry.Register(featureType, configGenerator)
}
