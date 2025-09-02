package alertmanager

import (
	"context"
	"fmt"
	"github.com/SigNoz/signoz/pkg/alertmanager/routestrategy"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"strings"
)

type RouteManager struct {
	strategy     routestrategy.RoutingStrategy
	alertmanager Alertmanager
	ruleStore    ruletypes.RuleStore
}

func NewManagerWithChannelRoutingStrategy(
	alertmanager Alertmanager,
	ruleStore ruletypes.RuleStore,
) *RouteManager {
	return &RouteManager{
		strategy:     routestrategy.NewChannelRoutingStrategy(),
		alertmanager: alertmanager,
		ruleStore:    ruleStore,
	}
}

func (m *RouteManager) AddDirectRules(ctx context.Context, orgID, ruleId string, postableRule ruletypes.PostableRule) error {
	var preferredChannels []string
	if len(postableRule.PreferredChannels) == 0 {
		channels, err := m.alertmanager.ListChannels(ctx, orgID)
		if err != nil {
			return err
		}

		for _, channel := range channels {
			preferredChannels = append(preferredChannels, channel.Name)
		}
		postableRule.PreferredChannels = preferredChannels
	} else {
		preferredChannels = postableRule.PreferredChannels
	}

	if postableRule.Thresholds == nil {
		postableRule.Thresholds = map[string][]string{
			postableRule.Labels["severity"]: preferredChannels,
		}
	}

	cfg, err := m.alertmanager.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get alertmanager config: %w", err)
	}

	if err := m.strategy.AddDirectRules(cfg, ruleId, postableRule); err != nil {
		return fmt.Errorf("failed to add direct rules: %w", err)
	}

	cfg.UpdateStoreableConfig()

	if err := m.alertmanager.SetConfig(ctx, cfg); err != nil {
		return fmt.Errorf("failed to update alertmanager config: %w", err)
	}

	return nil
}

func (m *RouteManager) AddNotificationPolicyRules(ctx context.Context, orgID, ruleId string, postableRule ruletypes.PostableRule) error {
	cfg, err := m.alertmanager.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get alertmanager config: %w", err)
	}

	if err := m.strategy.AddNotificationPolicyRules(cfg, ruleId, postableRule); err != nil {
		return fmt.Errorf("failed to add notification policy rules: %w", err)
	}

	cfg.UpdateStoreableConfig()

	if err := m.alertmanager.SetConfig(ctx, cfg); err != nil {
		return fmt.Errorf("failed to update alertmanager config: %w", err)
	}

	return nil
}

func (m *RouteManager) AddNotificationPolicy(ctx context.Context, orgID, policyMatchers string, receivers []string, routeId string) error {
	cfg, err := m.alertmanager.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get alertmanager config: %w", err)
	}

	rules, err := m.ruleStore.GetStoredRules(ctx, orgID)
	if err != nil {
		return err
	}
	ruleMaps := map[string]ruletypes.PostableRule{}
	for _, rule := range rules {
		postableRule, err := ruletypes.ParsePostableRule([]byte(rule.Data))
		if err != nil {
			return err
		}
		ruleMaps[rule.ID.StringValue()] = *postableRule
	}

	if err := m.strategy.AddNotificationPolicy(cfg, policyMatchers, receivers, ruleMaps, routeId); err != nil {
		return fmt.Errorf("failed to add notification policy: %w", err)
	}

	cfg.UpdateStoreableConfig()

	if err := m.alertmanager.SetConfig(ctx, cfg); err != nil {
		return fmt.Errorf("failed to update alertmanager config: %w", err)
	}

	return nil
}

func (m *RouteManager) DeleteDirectRules(ctx context.Context, orgID, ruleId string) error {
	// Get current alertmanager config
	cfg, err := m.alertmanager.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get alertmanager config: %w", err)
	}

	// Delete direct rules using strategy
	if err := m.strategy.DeleteDirectRules(ruleId, cfg); err != nil {
		return fmt.Errorf("failed to delete direct rules: %w", err)
	}

	cfg.UpdateStoreableConfig()

	// Update alertmanager config
	if err := m.alertmanager.SetConfig(ctx, cfg); err != nil {
		return fmt.Errorf("failed to update alertmanager config: %w", err)
	}

	return nil
}

// DeleteNotificationPolicyRules removes ruleId from existing notification policy routes
func (m *RouteManager) DeleteNotificationPolicyRules(ctx context.Context, orgID, ruleId string) error {
	// Get current alertmanager config
	cfg, err := m.alertmanager.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get alertmanager config: %w", err)
	}

	// Delete notification policy rules using strategy
	if err := m.strategy.DeleteNotificationPolicyRules(cfg, ruleId); err != nil {
		return fmt.Errorf("failed to delete notification policy rules: %w", err)
	}

	cfg.UpdateStoreableConfig()

	// Update alertmanager config
	if err := m.alertmanager.SetConfig(ctx, cfg); err != nil {
		return fmt.Errorf("failed to update alertmanager config: %w", err)
	}

	return nil
}

func (m *RouteManager) DeleteNotificationPolicy(ctx context.Context, orgID, routeId string) error {
	cfg, err := m.alertmanager.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get alertmanager config: %w", err)
	}

	if err := m.strategy.DeleteNotificationPolicy(cfg, routeId); err != nil {
		return fmt.Errorf("failed to delete notification policy: %w", err)
	}

	cfg.UpdateStoreableConfig()

	if err := m.alertmanager.SetConfig(ctx, cfg); err != nil {
		return fmt.Errorf("failed to update alertmanager config: %w", err)
	}

	return nil
}

// DeleteChannel removes specific channel from all routes
func (m *RouteManager) DeleteChannel(ctx context.Context, orgID, channelName string) error {

	//check whether can we delete the rule
	rules, err := m.ruleStore.GetStoredRules(ctx, orgID)
	if err != nil {
		return err
	}
	ruleNames := []string{}
	for _, rule := range rules {
		postableRule, err := ruletypes.ParsePostableRule([]byte(rule.Data))
		if err != nil {
			return err
		}
		for _, channel := range postableRule.PreferredChannels {
			if channel == channelName {
				ruleNames = append(ruleNames, postableRule.AlertName)
			}
		}
	}

	if len(ruleNames) > 0 {
		return fmt.Errorf("cant delete channel used in rules %s", strings.Join(ruleNames, ","))
	}

	// Get current alertmanager config
	cfg, err := m.alertmanager.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get alertmanager config: %w", err)
	}

	// Delete channel using strategy
	if err := m.strategy.DeleteChannel(cfg, channelName); err != nil {
		return fmt.Errorf("failed to delete channel: %w", err)
	}

	cfg.UpdateStoreableConfig()

	// Update alertmanager config
	if err := m.alertmanager.SetConfig(ctx, cfg); err != nil {
		return fmt.Errorf("failed to update alertmanager config: %w", err)
	}

	return nil
}
