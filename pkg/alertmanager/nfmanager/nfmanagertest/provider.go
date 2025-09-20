package nfmanagertest

import (
	"context"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/prometheus/common/model"
)

type provider struct {
	settings factory.ScopedProviderSettings
	// Mock data for testing
	mockGroupLabels model.LabelSet
	mockError       error
}

// NewFactory creates a new factory for the test notification grouping strategy.
func NewFactory() factory.ProviderFactory[nfmanager.NotificationManager, nfmanager.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("test"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
			return New(ctx, settings, config)
		},
	)
}

// New creates a new test notification grouping strategy provider.
func New(ctx context.Context, providerSettings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest")

	return &provider{
		settings:        settings,
		mockGroupLabels: model.LabelSet{},
	}, nil
}

// GetNotificationConfig implements the NotificationManager interface for testing.
func (p *provider) GetNotificationConfig(orgID string, ruleID string) (*alertmanagertypes.NotificationConfig, error) {
	if p.mockError != nil {
		return nil, p.mockError
	}

	// Convert LabelSet to map[LabelName]struct{}
	groupLabels := make(map[model.LabelName]struct{})
	for labelName := range p.mockGroupLabels {
		groupLabels[labelName] = struct{}{}
	}

	return &alertmanagertypes.NotificationConfig{
		NotificationGroup: groupLabels,
		Renotify: alertmanagertypes.ReNotificationConfig{
			RenotifyInterval: 4 * time.Hour,
			NoDataInterval:   4 * time.Hour,
		},
	}, nil
}

// SetNotificationConfig implements the NotificationManager interface for testing.
func (p *provider) SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error {
	return p.mockError
}

func (p *provider) DeleteNotificationConfig(orgID string, ruleID string) error {
	return p.mockError
}

// SetMockGroupLabels sets mock group labels for testing.
func (p *provider) SetMockGroupLabels(labels model.LabelSet) {
	p.mockGroupLabels = labels
}

// SetMockError sets a mock error for testing.
func (p *provider) SetMockError(err error) {
	p.mockError = err
}
