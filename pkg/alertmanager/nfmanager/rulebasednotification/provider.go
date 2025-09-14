package rulebasednotification

import (
	"context"
	nfmanager "github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/standardnotification"
	"sync"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

type provider struct {
	settings                             factory.ScopedProviderSettings
	orgToFingerprintToNotificationConfig map[string]map[model.Fingerprint]*nfmanager.NotificationConfig
	fallbackStrategy                     nfmanager.NotificationManager
	mutex                                sync.RWMutex
}

// NewFactory creates a new factory for the rule-based grouping strategy.
func NewFactory() factory.ProviderFactory[nfmanager.NotificationManager, nfmanager.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("rulebased"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
			return New(ctx, settings, config)
		},
	)
}

// New creates a new rule-based grouping strategy provider.
func New(ctx context.Context, providerSettings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/nfmanager/rulebasednotification")

	// Create fallback strategy based on config
	fallbackStrategy, err := standardnotification.New(ctx, providerSettings, config)
	if err != nil {
		return nil, err
	}

	return &provider{
		settings:                             settings,
		orgToFingerprintToNotificationConfig: make(map[string]map[model.Fingerprint]*nfmanager.NotificationConfig),
		fallbackStrategy:                     fallbackStrategy,
	}, nil
}

// GetNotificationConfig retrieves the notification configuration for the specified alert and organization.
func (r *provider) GetNotificationConfig(orgID string, alert *types.Alert) (*nfmanager.NotificationConfig, error) {
	if orgID == "" || alert == nil {
		return r.fallbackStrategy.GetNotificationConfig(orgID, alert)
	}

	fingerprint := alert.Fingerprint()

	r.mutex.RLock()
	defer r.mutex.RUnlock()

	if orgConfigs, exists := r.orgToFingerprintToNotificationConfig[orgID]; exists {
		if config, configExists := orgConfigs[fingerprint]; configExists {
			return config, nil
		}
	}

	// Fallback to standard strategy
	return r.fallbackStrategy.GetNotificationConfig(orgID, alert)
}

// SetNotificationConfig updates the notification configuration for the specified alert and organization.
func (r *provider) SetNotificationConfig(orgID string, alert *types.Alert, config *nfmanager.NotificationConfig) error {
	if orgID == "" || alert == nil {
		return nil
	}

	fingerprint := alert.Fingerprint()

	r.mutex.Lock()
	defer r.mutex.Unlock()

	// Initialize org map if it doesn't exist
	if r.orgToFingerprintToNotificationConfig[orgID] == nil {
		r.orgToFingerprintToNotificationConfig[orgID] = make(map[model.Fingerprint]*nfmanager.NotificationConfig)
	}

	r.orgToFingerprintToNotificationConfig[orgID][fingerprint] = config

	return nil
}
