package notificationgroupingtest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/notificationgrouping"
	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

type provider struct {
	settings factory.ScopedProviderSettings
	// Mock data for testing
	mockGroupLabels model.LabelSet
	mockError       error
}

// NewFactory creates a new factory for the test notification grouping strategy.
func NewFactory() factory.ProviderFactory[notificationgrouping.NotificationGroups, notificationgrouping.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("test"),
		func(ctx context.Context, settings factory.ProviderSettings, config notificationgrouping.Config) (notificationgrouping.NotificationGroups, error) {
			return New(ctx, settings, config)
		},
	)
}

// New creates a new test notification grouping strategy provider.
func New(ctx context.Context, providerSettings factory.ProviderSettings, config notificationgrouping.Config) (notificationgrouping.NotificationGroups, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/notificationgrouping/notificationgroupingtest")

	return &provider{
		settings:        settings,
		mockGroupLabels: model.LabelSet{},
	}, nil
}

// GetGroupLabels implements the NotificationGroups interface for testing.
func (p *provider) GetGroupLabels(orgID string, alert *types.Alert, route *dispatch.Route) model.LabelSet {
	if p.mockError != nil {
		return model.LabelSet{}
	}
	return p.mockGroupLabels
}

// SetGroupLabels implements the NotificationGroups interface for testing.
func (p *provider) SetGroupLabels(orgID string, ruleID string, groupByLabels []string) error {
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
