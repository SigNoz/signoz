package standardnotification

import (
	"context"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"time"

	nfmanager "github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/prometheus/common/model"
)

const (
	DefaultGroupBy = model.LabelName("alertname")
)

type provider struct {
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[nfmanager.NotificationManager, nfmanager.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("standard"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
			return New(ctx, settings, config)
		},
	)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/nfmanager/standardnotification")

	return &provider{
		settings: settings,
	}, nil
}

func (p *provider) GetNotificationConfig(orgID string, ruleID string) (*alertmanagertypes.NotificationConfig, error) {
	defaultGroups := make(map[model.LabelName]struct{})
	defaultGroups[DefaultGroupBy] = struct{}{}
	return &alertmanagertypes.NotificationConfig{
		NotificationGroup: defaultGroups,
		RenotifyInterval:  4 * time.Hour,
	}, nil
}

func (p *provider) SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error {
	// Standard grouping doesn't support dynamic configuration setting
	// Configuration is determined by default settings
	return nil
}
