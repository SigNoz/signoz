package featureflag

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/factory"
)

// Ensure FeatureFlagManager implements FeatureFlagService
var _ factory.Service = (*FeatureFlagManager)(nil)

// FeatureFlagManager implements the FeatureFlagService interface
type FeatureFlagManager struct {
	logger    *slog.Logger
	providers []FeatureFlag
	storage   Store
	ticker    *time.Ticker
	cancel    context.CancelFunc
}

// NewFeatureFlagManager creates a new FeatureFlagManager instance
func NewFeatureFlagManager(ctx context.Context, logger *slog.Logger, bunDB *bun.DB, factories ...FeatureFlag) *FeatureFlagManager {
	ctx, cancel := context.WithCancel(ctx)
	return &FeatureFlagManager{
		logger:    logger,
		providers: factories,
		storage:   NewFeatureStorage(bunDB),
		ticker:    time.NewTicker(24 * time.Hour), // not taking from config
		cancel:    cancel,
	}
}

// Start initializes the feature flag manager
func (fm *FeatureFlagManager) Start(ctx context.Context) error {
	// Run RefreshFeatureFlags once at the start
	fm.RefreshFeatureFlags()

	// Set up a ticker to run RefreshFeatureFlags periodically
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-fm.ticker.C:
				fm.RefreshFeatureFlags()
			}
		}
	}()

	return nil
}

// Stop performs any necessary cleanup
func (fm *FeatureFlagManager) Stop(ctx context.Context) error {
	// Stop the ticker
	fm.ticker.Stop()

	// idempotent call to make sure we stop the context
	fm.cancel()
	return nil
}

func (fm *FeatureFlagManager) RefreshFeatureFlags() {
	var wg sync.WaitGroup
	orgIDs, err := fm.storage.ListOrgIDs(context.Background())
	if err != nil {
		fm.logger.Error("Error listing orgIDs", "error", err)
		return
	}
	for _, orgID := range orgIDs {
		wg.Add(1)
		go func(orgID string) {
			defer wg.Done()
			// Create a map to store features by their flag or identifier
			featureMap := make(map[string]Feature)

			for _, provider := range fm.providers {
				features := provider.GetFeatures(orgID)
				for _, feature := range features {
					// Assuming feature has a method or field `Flag` to identify it
					featureMap[feature.Name.String()] = feature
				}
			}

			// Convert the map back to a slice
			mergedFeatures := make([]Feature, 0, len(featureMap))
			for _, feature := range featureMap {
				mergedFeatures = append(mergedFeatures, feature)
			}

			// Save the merged features
			err := fm.storage.SaveFeatureFlags(context.Background(), orgID, mergedFeatures)
			if err != nil {
				fm.logger.Error("Failed to save features", "orgID", orgID, "error", err)
			}
		}(orgID)
	}
	wg.Wait()
}

// GetFeatureFlags returns all features for an org
func (fm *FeatureFlagManager) ListFeatureFlags(ctx context.Context, orgID string) ([]Feature, error) {
	return fm.storage.ListFeatureFlags(ctx, orgID)
}

// GetFeatureFlag returns a specific feature by flag
func (fm *FeatureFlagManager) GetFeatureFlag(ctx context.Context, orgID string, flag Flag) (Feature, error) {
	return fm.storage.GetFeatureFlag(ctx, orgID, flag)
}

// UpdateFeatureFlag updates a specific feature by flag for an org
func (fm *FeatureFlagManager) UpdateFeatureFlag(ctx context.Context, orgID string, flag Flag, feature Feature) error {
	return fm.storage.UpdateFeatureFlag(ctx, orgID, flag, feature)
}
