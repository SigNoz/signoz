package featureflag

import (
	"context"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/factory"
)

// Ensure FeatureFlagManager implements FeatureFlagService
var _ factory.Service = (*FeatureFlagManager)(nil)

// FeatureFlagManager implements the FeatureFlagService interface
type FeatureFlagManager struct {
	providers []FeatureFlag
	storage   *FeatureStorage
	features  map[Flag]Feature
}

// NewFeatureFlagManager creates a new FeatureFlagManager instance
func NewFeatureFlagManager(ctx context.Context, sqlxDB *sqlx.DB, factories ...FeatureFlag) *FeatureFlagManager {
	return &FeatureFlagManager{
		providers: factories,
		storage:   NewFeatureStorage(sqlxDB),
		features:  make(map[Flag]Feature),
	}
}

// Start initializes the feature flag manager
func (fm *FeatureFlagManager) Start(ctx context.Context) error {
	fm.InitializeFeatures()
	// save as well
	go fm.SaveAllFeatures()
	return nil
}

// Stop performs any necessary cleanup
func (fm *FeatureFlagManager) Stop(ctx context.Context) error {
	// Implement any cleanup logic if necessary
	return nil
}

// GetAllFeatures returns all features
func (fm *FeatureFlagManager) GetAllFeatures() []Feature {
	var featureList []Feature
	for _, feature := range fm.features {
		featureList = append(featureList, feature)
	}
	return featureList
}

// GetFeature returns a specific feature by flag
func (fm *FeatureFlagManager) GetFeature(flag Flag) Feature {
	return fm.features[flag]
}

// SaveAllFeatures saves all features to storage
func (fm *FeatureFlagManager) SaveAllFeatures() error {
	features := fm.GetAllFeatures()
	return fm.storage.SaveFeatures(features)
}

// InitializeFeatures initializes features from all providers
func (fm *FeatureFlagManager) InitializeFeatures() {
	for _, provider := range fm.providers {
		features := provider.GetFeatures()
		for _, feature := range features {
			fm.features[feature.Name] = feature
		}
	}
}
