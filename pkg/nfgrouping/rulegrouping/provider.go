package rulegrouping

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/nfgrouping"
	"github.com/SigNoz/signoz/pkg/nfgrouping/standardgrouping"
	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

type provider struct {
	settings                       factory.ScopedProviderSettings
	orgToRuleToNotificationGroupBy map[string]map[string][]string
	fallbackStrategy               nfgrouping.NotificationGroups
	mutex                          sync.RWMutex
}

// NewFactory creates a new factory for the rule-based grouping strategy.
func NewFactory() factory.ProviderFactory[nfgrouping.NotificationGroups, nfgrouping.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("rulebased"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfgrouping.Config) (nfgrouping.NotificationGroups, error) {
			return New(ctx, settings, config)
		},
	)
}

// New creates a new rule-based grouping strategy provider.
func New(ctx context.Context, providerSettings factory.ProviderSettings, config nfgrouping.Config) (nfgrouping.NotificationGroups, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/nfgrouping/rulegrouping")

	// Create fallback strategy based on config
	fallbackStrategy, err := standardgrouping.New(ctx, providerSettings, config)
	if err != nil {
		return nil, err
	}

	return &provider{
		settings:                       settings,
		orgToRuleToNotificationGroupBy: make(map[string]map[string][]string),
		fallbackStrategy:               fallbackStrategy,
	}, nil
}

// GetGroupLabels uses rule-specific notificationGroupBy if available, otherwise falls back to standard groupBy.
func (r *provider) GetGroupLabels(orgID string, alert *types.Alert, route *dispatch.Route) model.LabelSet {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	ruleID := getRuleIDFromRoute(alert)

	var notificationGroupBy []string
	if orgRules, exists := r.orgToRuleToNotificationGroupBy[orgID]; exists {
		if groupBy, ruleExists := orgRules[ruleID]; ruleExists {
			notificationGroupBy = groupBy
		}
	}

	groupLabels := r.fallbackStrategy.GetGroupLabels(orgID, alert, route)

	if len(notificationGroupBy) > 0 {
		// Use notificationGroupBy from rule
		for _, labelName := range notificationGroupBy {
			if labelValue, exists := alert.Labels[model.LabelName(labelName)]; exists {
				groupLabels[model.LabelName(labelName)] = labelValue
			}
		}
	}
	return groupLabels
}

// SetGroupLabels updates the rule-to-notificationGroupBy mapping for the specified rule and organization.
func (r *provider) SetGroupLabels(orgID string, ruleID string, groupByLabels []string) error {
	if orgID == "" || ruleID == "" {
		return nil
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()

	// Initialize org map if it doesn't exist
	if r.orgToRuleToNotificationGroupBy[orgID] == nil {
		r.orgToRuleToNotificationGroupBy[orgID] = make(map[string][]string)
	}

	r.orgToRuleToNotificationGroupBy[orgID][ruleID] = groupByLabels

	return nil
}

func getRuleIDFromRoute(alert *types.Alert) string {
	for name, value := range alert.Labels {
		if string(name) == "ruleId" {
			return string(value)
		}
	}
	return ""
}
