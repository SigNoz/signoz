package standardgrouping

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/nfgrouping"
	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

type provider struct {
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[nfgrouping.NotificationGroups, nfgrouping.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("standard"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfgrouping.Config) (nfgrouping.NotificationGroups, error) {
			return New(ctx, settings, config)
		},
	)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config nfgrouping.Config) (nfgrouping.NotificationGroups, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/nfgrouping/standardgrouping")

	return &provider{
		settings: settings,
	}, nil
}

func (p *provider) GetGroupLabels(orgID string, alert *types.Alert, route *dispatch.Route) model.LabelSet {
	// orgID is ignored for standard grouping as it uses route configuration
	groupLabels := model.LabelSet{}
	for ln, lv := range alert.Labels {
		if _, ok := route.RouteOpts.GroupBy[ln]; ok || route.RouteOpts.GroupByAll {
			groupLabels[ln] = lv
		}
	}
	return groupLabels
}

func (p *provider) SetGroupLabels(orgID string, ruleID string, groupByLabels []string) error {
	// Standard grouping doesn't support dynamic label setting
	// Grouping is determined by the route configuration, not rule-specific settings
	return nil
}
