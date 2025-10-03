package rulebasednotification

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"

	"github.com/SigNoz/signoz/pkg/factory"
)

type provider struct {
	settings                             factory.ScopedProviderSettings
	orgToFingerprintToNotificationConfig map[string]map[string]alertmanagertypes.NotificationConfig
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
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/rulebasednotification")

	return &provider{
		settings:                             settings,
		orgToFingerprintToNotificationConfig: make(map[string]map[string]alertmanagertypes.NotificationConfig),
	}, nil
}

// GetNotificationConfig retrieves the notification configuration for the specified alert and organization.
func (r *provider) GetNotificationConfig(orgID string, ruleID string) (*alertmanagertypes.NotificationConfig, error) {
	notificationConfig := alertmanagertypes.GetDefaultNotificationConfig()
	if orgID == "" || ruleID == "" {
		return &notificationConfig, nil
	}

	r.mutex.RLock()
	defer r.mutex.RUnlock()

	if orgConfigs, exists := r.orgToFingerprintToNotificationConfig[orgID]; exists {
		if config, configExists := orgConfigs[ruleID]; configExists {
			if config.Renotify.RenotifyInterval != 0 {
				notificationConfig.Renotify.RenotifyInterval = config.Renotify.RenotifyInterval
			}
			if config.Renotify.NoDataInterval != 0 {
				notificationConfig.Renotify.NoDataInterval = config.Renotify.NoDataInterval
			}
			for k, v := range config.NotificationGroup {
				notificationConfig.NotificationGroup[k] = v
			}
		}
	}

	return &notificationConfig, nil
}

// SetNotificationConfig updates the notification configuration for the specified alert and organization.
func (r *provider) SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error {
	if orgID == "" || ruleID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "no org or rule id provided")
	}

	if config == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "notification config cannot be nil")
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()

	// Initialize org map if it doesn't exist
	if r.orgToFingerprintToNotificationConfig[orgID] == nil {
		r.orgToFingerprintToNotificationConfig[orgID] = make(map[string]alertmanagertypes.NotificationConfig)
	}

	r.orgToFingerprintToNotificationConfig[orgID][ruleID] = config.DeepCopy()

	return nil
}

func (r *provider) DeleteNotificationConfig(orgID string, ruleID string) error {
	if orgID == "" || ruleID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "no org or rule id provided")
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()

	if _, exists := r.orgToFingerprintToNotificationConfig[orgID]; exists {
		delete(r.orgToFingerprintToNotificationConfig[orgID], ruleID)
	}

	return nil
}
