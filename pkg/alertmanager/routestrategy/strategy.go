package routestrategy

import (
	"fmt"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	amconfig "github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/matcher/compat"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/common/model"
	"slices"
	"strings"
)

const defaultRuleReceiverName = "default-rule-receiver"
const defaultNotificationPolicyReceiverName = "default-notification-policy"

type RoutingStrategy interface {
	AddDirectRules(config *alertmanagertypes.Config, ruleId string, postableRule ruletypes.PostableRule) error
	AddNotificationPolicyRules(config *alertmanagertypes.Config, ruleId string, postableRule ruletypes.PostableRule) error
	AddNotificationPolicy(config *alertmanagertypes.Config, policyMatchers string, receivers []string, ruleIds map[string]ruletypes.PostableRule, id string) error
	AddChannel(config *alertmanagertypes.Config, ruleId string) error
	DeleteDirectRules(ruleId string, config *alertmanagertypes.Config) error
	DeleteNotificationPolicyRules(config *alertmanagertypes.Config, ruleId string) error
	DeleteNotificationPolicy(config *alertmanagertypes.Config, policyMatchers string) error
	DeleteChannel(config *alertmanagertypes.Config, channelName string) error
}

type ChannelRoutingStrategy struct {
}

// NewChannelRoutingStrategy creates a new instance of ChannelRoutingStrategy
func NewChannelRoutingStrategy() RoutingStrategy {
	return &ChannelRoutingStrategy{}
}

func (crs *ChannelRoutingStrategy) AddChannel(config *alertmanagertypes.Config, channelName string) error {
	if config.AlertmanagerConfig().Route == nil {
		return fmt.Errorf("AlertManager config has no root route")
	}
	if channelName == "" {
		return fmt.Errorf("AlertManager config has no channel name")
	}
	notificationPolicyRoutes := crs.findAllNotificationPolicyRoutes(config)
	if len(notificationPolicyRoutes) == 0 {
		return fmt.Errorf("AlertManager config has no notification policy routes")
	}
	for _, route := range notificationPolicyRoutes {
		route.Routes = append(route.Routes, &amconfig.Route{
			Continue: true,
			Routes:   []*amconfig.Route{},
			Receiver: channelName,
		})
	}
	return nil
}

// AddDirectRules adds rules directly to default rule route with thresholds
func (crs *ChannelRoutingStrategy) AddDirectRules(config *alertmanagertypes.Config, ruleId string, postableRule ruletypes.PostableRule) error {
	if config.AlertmanagerConfig().Route == nil {
		return fmt.Errorf("AlertManager config has no root route")
	}

	ruleRoute := crs.createDefaultRuleRoute(ruleId)

	for threshold, receivers := range postableRule.Thresholds {
		thresholdRoutes, err := crs.createThresholdRoute(threshold, receivers, postableRule.GroupBy, postableRule.Renotify)
		if err != nil {
			return fmt.Errorf("failed to create threshold route: %w", err)
		}
		ruleRoute.Routes = append(ruleRoute.Routes, thresholdRoutes...)
	}
	insertPos := crs.findDefaultRuleSection(config)
	config.AlertmanagerConfig().Receivers = append(config.AlertmanagerConfig().Receivers, alertmanagertypes.Receiver{Name: getRuleReceiverName(ruleId)})
	config.AlertmanagerConfig().Route.Routes[insertPos].Routes = slices.Insert(config.AlertmanagerConfig().Route.Routes[insertPos].Routes, insertPos, ruleRoute)

	return nil
}

// AddNotificationPolicyRules adds rules to existing notification policy routes
func (crs *ChannelRoutingStrategy) AddNotificationPolicyRules(config *alertmanagertypes.Config, ruleId string, postableRule ruletypes.PostableRule) error {
	if ruleId == "" {
		return fmt.Errorf("invalid ruleId %s", ruleId)
	}
	notificationPolicyRoutes := crs.findAllNotificationPolicyRoutes(config)

	// Add a new child route with single ruleId matcher for each channel route
	for _, policyRoute := range notificationPolicyRoutes {
		for _, channelRoute := range policyRoute.Routes {
			ruleSpecificRoute := crs.createRuleSpecificChannelRoute(channelRoute.Receiver, ruleId, postableRule)
			channelRoute.Routes = append(channelRoute.Routes, ruleSpecificRoute)
		}
	}

	return nil
}

func (crs *ChannelRoutingStrategy) AddNotificationPolicy(config *alertmanagertypes.Config, policyMatchers string, receivers []string, ruleIds map[string]ruletypes.PostableRule, routeId string) error {
	if config.AlertmanagerConfig().Route == nil {
		return fmt.Errorf("invalid config")
	}
	if len(receivers) == 0 {
		return fmt.Errorf("no receivers found in route")
	}
	if len(ruleIds) == 0 {
		return fmt.Errorf("no ruleids found in route")
	}

	parsedMatchers, err := crs.parseMatchers(policyMatchers)
	if err != nil {
		return fmt.Errorf("failed to parse policy matchers: %w", err)
	}
	notificationIdMatcher, err := labels.NewMatcher(labels.MatchEqual, "notification_policy", "true")
	if err != nil {
		return fmt.Errorf("failed to parse policy matchers: %w", err)
	}

	parsedMatchers = append(parsedMatchers, *notificationIdMatcher)

	policyRoute := crs.createNotificationPolicyRoute(parsedMatchers, routeId)

	// Create channel routes for each receiver
	for _, receiver := range receivers {
		channelRoute := crs.createPolicyChannelRoute(receiver)

		for ruleId, postableRule := range ruleIds {
			ruleSpecificRoute := crs.createRuleSpecificChannelRoute(receiver, ruleId, postableRule)
			channelRoute.Routes = append(channelRoute.Routes, ruleSpecificRoute)
		}

		policyRoute.Routes = append(policyRoute.Routes, channelRoute)
	}

	config.AlertmanagerConfig().Route.Routes = slices.Insert(config.AlertmanagerConfig().Route.Routes, 0, policyRoute)
	config.AlertmanagerConfig().Receivers = append(config.AlertmanagerConfig().Receivers, alertmanagertypes.Receiver{Name: getNotificationPolicyReceiverName(routeId)})
	return nil
}

// DeleteDirectRules removes rule routes from default rule section
func (crs *ChannelRoutingStrategy) DeleteDirectRules(ruleId string, config *alertmanagertypes.Config) error {
	if ruleId == "" {
		return fmt.Errorf("invalid ruleId %s", ruleId)
	}
	if config.AlertmanagerConfig().Route == nil {
		return fmt.Errorf("AlertManager config has no root route")
	}

	routes := config.AlertmanagerConfig().Route.Routes
	var filteredRoutes []*amconfig.Route

	for _, route := range routes {
		if crs.isDefaultRuleRoute(route) {
			for _, childRoute := range route.Routes {
				if crs.isDefaultRuleRouteWithRuleId(childRoute, ruleId) {
					continue
				}
			}
			filteredRoutes = append(filteredRoutes, route)
			route.Routes = filteredRoutes
			break
		}
	}

	var filteredReceivers []amconfig.Receiver
	for _, receiver := range config.AlertmanagerConfig().Receivers {
		if !(receiver.Name == getRuleReceiverName(ruleId)) {
			filteredReceivers = append(filteredReceivers, receiver)
		}
	}
	config.AlertmanagerConfig().Receivers = filteredReceivers
	config.AlertmanagerConfig().Route.Routes = filteredRoutes
	return nil
}

// DeleteNotificationPolicyRules removes ruleId from existing notification policy routes
func (crs *ChannelRoutingStrategy) DeleteNotificationPolicyRules(config *alertmanagertypes.Config, ruleId string) error {
	if ruleId == "" {
		return fmt.Errorf("invalid ruleId %s", ruleId)
	}
	notificationPolicyRoutes := crs.findAllNotificationPolicyRoutes(config)
	for _, policyRoute := range notificationPolicyRoutes {
		for _, channelRoute := range policyRoute.Routes {
			var filteredRuleRoutes []*amconfig.Route
			for _, ruleRoute := range channelRoute.Routes {
				if !crs.hasSpecificRuleIDMatcher(ruleRoute, ruleId) {
					filteredRuleRoutes = append(filteredRuleRoutes, ruleRoute)
				}
			}
			channelRoute.Routes = filteredRuleRoutes
		}
	}

	return nil
}

// DeleteNotificationPolicy removes entire notification policy and its channel routes
func (crs *ChannelRoutingStrategy) DeleteNotificationPolicy(config *alertmanagertypes.Config, routeId string) error {
	if config.AlertmanagerConfig().Route == nil {
		return fmt.Errorf("invalid config")
	}

	// Find and remove routes that match the policy matchers
	routes := config.AlertmanagerConfig().Route.Routes
	var filteredRoutes []*amconfig.Route

	for _, route := range routes {
		if !(route.Receiver == getNotificationPolicyReceiverName(routeId)) {
			filteredRoutes = append(filteredRoutes, route)
		}
	}

	var filteredReceivers []amconfig.Receiver
	for _, receiver := range config.AlertmanagerConfig().Receivers {
		if !(receiver.Name == getRuleReceiverName(routeId)) {
			filteredReceivers = append(filteredReceivers, receiver)
		}
	}

	config.AlertmanagerConfig().Receivers = filteredReceivers
	config.AlertmanagerConfig().Route.Routes = filteredRoutes
	return nil
}

// DeleteChannel removes specific channel from all routes
func (crs *ChannelRoutingStrategy) DeleteChannel(config *alertmanagertypes.Config, channelName string) error {
	if channelName == "" {
		return fmt.Errorf("invalid channelName")
	}
	if config.AlertmanagerConfig().Route == nil {
		return fmt.Errorf("invalid config")
	}

	// Remove channel routes from all notification policies
	crs.removeChannelFromRoutes(config.AlertmanagerConfig().Route.Routes, channelName)

	// Also clean up empty policy routes that have no channel routes left
	crs.cleanupEmptyPolicyRoutes(config)

	return nil
}

// Helper functions

// createDefaultRuleRoute creates a route with only ruleId matcher (no notification policy matchers)
func (crs *ChannelRoutingStrategy) createDefaultRuleRoute(ruleId string) *amconfig.Route {
	ruleIDMatcher, _ := labels.NewMatcher(labels.MatchEqual, "ruleId", ruleId)
	notificationIdMatcher, _ := labels.NewMatcher(labels.MatchEqual, "notification_policy", "false")
	return &amconfig.Route{
		Receiver: getRuleReceiverName(ruleId),
		Matchers: amconfig.Matchers{ruleIDMatcher, notificationIdMatcher},
		Continue: true,
		Routes:   []*amconfig.Route{}, // Will contain threshold routes
	}
}

func (crs *ChannelRoutingStrategy) createDefaultBaseRuleRoute() *amconfig.Route {
	return &amconfig.Route{
		Receiver: defaultRuleReceiverName,
		Continue: true,
		Routes:   []*amconfig.Route{}, // Will contain threshold routes
	}
}

// createThresholdRoute creates a threshold route as child of rule route
func (crs *ChannelRoutingStrategy) createThresholdRoute(threshold string, receivers []string, groupBy []string, renotify ruletypes.Duration) ([]*amconfig.Route, error) {
	thresholdMatcher, _ := labels.NewMatcher(labels.MatchEqual, "threshold.name", threshold)
	matchers := []labels.Matcher{*thresholdMatcher}
	var groupByLabels []model.LabelName
	for _, group := range groupBy {
		groupByLabels = append(groupByLabels, model.LabelName(group))
	}
	repeatInterval := (*model.Duration)(&renotify)

	configMatchers := crs.convertToConfigMatchers(matchers)

	var thresholdRoutes []*amconfig.Route
	for _, receiver := range receivers {
		thresholdRoute := &amconfig.Route{
			Receiver:       receiver,
			Matchers:       configMatchers,
			Continue:       false,
			GroupBy:        groupByLabels,
			RepeatInterval: repeatInterval,
		}
		thresholdRoutes = append(thresholdRoutes, thresholdRoute)
	}

	return thresholdRoutes, nil
}

// createNotificationPolicyRoute creates parent route with policy expression matchers
func (crs *ChannelRoutingStrategy) createNotificationPolicyRoute(policyMatchers []labels.Matcher, id string) *amconfig.Route {
	configMatchers := crs.convertToConfigMatchers(policyMatchers)

	return &amconfig.Route{
		Matchers: configMatchers,
		Continue: true,
		Routes:   []*amconfig.Route{},
		Receiver: getNotificationPolicyReceiverName(id),
	}
}

func getNotificationPolicyReceiverName(routeId string) string {
	return defaultNotificationPolicyReceiverName + "_" + routeId
}

func getRuleReceiverName(routeId string) string {
	return defaultRuleReceiverName + "_" + routeId
}

// createPolicyChannelRoute creates channel route without rule matchers (parent for rule-specific routes)
func (crs *ChannelRoutingStrategy) createPolicyChannelRoute(receiver string) *amconfig.Route {
	return &amconfig.Route{
		Receiver: receiver,
		Continue: true,                // Continue to rule-specific child routes
		Routes:   []*amconfig.Route{}, // Will contain rule-specific routes
	}
}

// createRuleSpecificChannelRoute creates a child route for a specific rule ID
func (crs *ChannelRoutingStrategy) createRuleSpecificChannelRoute(receiver string, ruleId string, postableRule ruletypes.PostableRule) *amconfig.Route {
	// Create single ruleId matcher
	ruleIDMatcher, _ := labels.NewMatcher(labels.MatchEqual, "ruleId", ruleId)
	matchers := []labels.Matcher{*ruleIDMatcher}
	var groupByLabels []model.LabelName
	for _, group := range postableRule.GroupBy {
		groupByLabels = append(groupByLabels, model.LabelName(group))
	}
	repeatInterval := (*model.Duration)(&postableRule.Renotify)

	ruleRoute := &amconfig.Route{
		Receiver:       receiver,
		Matchers:       crs.convertToConfigMatchers(matchers),
		Continue:       true,
		GroupBy:        groupByLabels,
		RepeatInterval: repeatInterval,
	}

	return ruleRoute
}

// parseMatchers parses matcher string into labels.Matcher slice
func (crs *ChannelRoutingStrategy) parseMatchers(matcherStr string) ([]labels.Matcher, error) {
	if strings.TrimSpace(matcherStr) == "" {
		return []labels.Matcher{}, nil
	}

	// Split by & or | operators
	parts := strings.FieldsFunc(matcherStr, func(r rune) bool {
		return r == '&' || r == '|'
	})

	var matchers []labels.Matcher
	for _, part := range parts {
		part = strings.Trim(strings.TrimSpace(part), "()")
		if part == "" {
			continue
		}

		matcher, err := compat.Matcher(part, "noop")
		if err != nil {
			return nil, fmt.Errorf("invalid matcher %s: %w", part, err)
		}

		matchers = append(matchers, *matcher)
	}

	return matchers, nil
}

// convertToConfigMatchers converts labels.Matcher to amconfig.Matchers
func (crs *ChannelRoutingStrategy) convertToConfigMatchers(matchers []labels.Matcher) amconfig.Matchers {
	var configMatchers amconfig.Matchers
	for _, matcher := range matchers {
		matcherCopy := matcher
		configMatchers = append(configMatchers, &matcherCopy)
	}
	return configMatchers
}

// findDefaultRuleSection finds where to insert default rule routes (after notification policies)
func (crs *ChannelRoutingStrategy) findDefaultRuleSection(config *alertmanagertypes.Config) int {
	routes := config.AlertmanagerConfig().Route.Routes
	for i, route := range routes {
		if crs.isDefaultRuleRoute(route) {
			return i // Insert before first default rule
		}
	}

	//create default base rule route
	baseRoute := crs.createDefaultBaseRuleRoute()
	config.AlertmanagerConfig().Route.Routes = append(config.AlertmanagerConfig().Route.Routes, crs.createDefaultBaseRuleRoute())
	config.AlertmanagerConfig().Receivers = append(config.AlertmanagerConfig().Receivers, amconfig.Receiver{
		Name: baseRoute.Receiver,
	})
	return len(routes)
}

// isDefaultRuleRoute checks if route is a default rule route (only has ruleId matcher)
func (crs *ChannelRoutingStrategy) isDefaultRuleRoute(route *amconfig.Route) bool {
	return route.Receiver == defaultRuleReceiverName
}

func (crs *ChannelRoutingStrategy) isNotificationRuleRoute(route *amconfig.Route) bool {
	return route.Receiver == defaultNotificationPolicyReceiverName
}

// isSystemMatcher checks if matcher is a system/metadata matcher
func (crs *ChannelRoutingStrategy) isSystemMatcher(name string) bool {
	systemMatchers := []string{"routing_strategy", "route_id", "org_id", "created_by"}
	return slices.Contains(systemMatchers, name)
}

// findAllNotificationPolicyRoutes finds all notification policy routes (non-default rule routes)
func (crs *ChannelRoutingStrategy) findAllNotificationPolicyRoutes(config *alertmanagertypes.Config) []*amconfig.Route {
	var notificationPolicyRoutes []*amconfig.Route

	for _, route := range config.AlertmanagerConfig().Route.Routes {
		// Notification policy routes are routes that are not default rule routes
		if crs.isNotificationRuleRoute(route) {
			notificationPolicyRoutes = append(notificationPolicyRoutes, route)
		}
	}

	return notificationPolicyRoutes
}

// findPolicyChannelRoutes finds channel routes that match policy matchers
func (crs *ChannelRoutingStrategy) findPolicyChannelRoutes(config *alertmanagertypes.Config, policyMatchers []labels.Matcher) []*amconfig.Route {
	var channelRoutes []*amconfig.Route

	for _, route := range config.AlertmanagerConfig().Route.Routes {
		if crs.routeMatchesPolicyMatchers(route, policyMatchers) && crs.hasRuleIDMatcher(route) {
			channelRoutes = append(channelRoutes, route)
		}
	}

	return channelRoutes
}

// routeMatchesPolicyMatchers checks if route contains all policy matchers
func (crs *ChannelRoutingStrategy) routeMatchesPolicyMatchers(route *amconfig.Route, policyMatchers []labels.Matcher) bool {
	for _, policyMatcher := range policyMatchers {
		found := false
		for _, routeMatcher := range route.Matchers {
			if routeMatcher.Name == policyMatcher.Name &&
				routeMatcher.Value == policyMatcher.Value &&
				routeMatcher.Type == policyMatcher.Type {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// hasRuleIDMatcher checks if route has ruleId matcher
func (crs *ChannelRoutingStrategy) hasRuleIDMatcher(route *amconfig.Route) bool {
	for _, matcher := range route.Matchers {
		if matcher.Name == "ruleId" {
			return true
		}
	}
	return false
}

// hasSpecificRuleIDMatcher checks if route has a specific ruleId matcher value
func (crs *ChannelRoutingStrategy) hasSpecificRuleIDMatcher(route *amconfig.Route, ruleId string) bool {
	for _, matcher := range route.Matchers {
		if matcher.Name == "ruleId" && matcher.Value == ruleId {
			return true
		}
	}
	return false
}

// appendToRuleIDMatcher appends new rule IDs to existing ruleId matcher
func (crs *ChannelRoutingStrategy) appendToRuleIDMatcher(route *amconfig.Route, newRuleIDs []string) error {
	for i, matcher := range route.Matchers {
		if matcher.Name == "ruleId" {
			existingRules := strings.Split(matcher.Value, "|")
			for _, newRule := range newRuleIDs {
				if !slices.Contains(existingRules, newRule) {
					existingRules = append(existingRules, newRule)
				}
			}

			newValue := strings.Join(existingRules, "|")
			newMatcher, _ := labels.NewMatcher(matcher.Type, "ruleId", newValue)
			route.Matchers[i] = newMatcher
			return nil
		}
	}
	return fmt.Errorf("no ruleId matcher found in route")
}

// extractPolicyMatchers extracts policy matchers from route (non-ruleId matchers)
func (crs *ChannelRoutingStrategy) extractPolicyMatchers(route *amconfig.Route) []labels.Matcher {
	var policyMatchers []labels.Matcher

	for _, matcher := range route.Matchers {
		if matcher.Name != "ruleId" && !crs.isSystemMatcher(matcher.Name) {
			policyMatchers = append(policyMatchers, *matcher)
		}
	}

	return policyMatchers
}

// extractRuleIDs extracts rule IDs from route's ruleId matcher
func (crs *ChannelRoutingStrategy) extractRuleIDs(route *amconfig.Route) []string {
	for _, matcher := range route.Matchers {
		if matcher.Name == "ruleId" {
			if strings.Contains(matcher.Value, "|") {
				return strings.Split(matcher.Value, "|")
			}
			return []string{matcher.Value}
		}
	}
	return []string{}
}

// extractChannels extracts receiver channel from route (for policy creation)
func (crs *ChannelRoutingStrategy) extractChannels(route *amconfig.Route) []string {
	if route.Receiver != "" {
		return []string{route.Receiver}
	}

	// If route has child routes, extract their receivers
	var channels []string
	for _, childRoute := range route.Routes {
		if childRoute.Receiver != "" {
			channels = append(channels, childRoute.Receiver)
		}
	}

	return channels
}

// isDefaultRuleRouteWithRuleId checks if route is a default rule route with specific ruleId
func (crs *ChannelRoutingStrategy) isDefaultRuleRouteWithRuleId(route *amconfig.Route, ruleId string) bool {
	if !crs.isDefaultRuleRoute(route) {
		return false
	}

	// Check if route has the specific ruleId
	for _, matcher := range route.Matchers {
		if matcher.Name == "ruleId" && matcher.Value == ruleId {
			return true
		}
	}
	return false
}

// removeFromRuleIDMatcher removes a specific rule ID from existing ruleId matcher
func (crs *ChannelRoutingStrategy) removeFromRuleIDMatcher(route *amconfig.Route, ruleIdToRemove string) error {
	for i, matcher := range route.Matchers {
		if matcher.Name == "ruleId" {
			existingRules := strings.Split(matcher.Value, "|")

			// Remove the specified ruleId
			var filteredRules []string
			for _, rule := range existingRules {
				if rule != ruleIdToRemove {
					filteredRules = append(filteredRules, rule)
				}
			}

			// If no rules left, we could remove the matcher entirely or keep it empty
			// For now, we'll update with the filtered rules
			if len(filteredRules) > 0 {
				newValue := strings.Join(filteredRules, "|")
				newMatcher, _ := labels.NewMatcher(matcher.Type, "ruleId", newValue)
				route.Matchers[i] = newMatcher
			} else {
				// Remove the matcher entirely if no rules left
				route.Matchers = append(route.Matchers[:i], route.Matchers[i+1:]...)
			}
			return nil
		}
	}
	return fmt.Errorf("no ruleId matcher found in route")
}

// removeChannelFromRoutes recursively removes channel routes with specific receiver
func (crs *ChannelRoutingStrategy) removeChannelFromRoutes(routes []*amconfig.Route, channelName string) {
	for _, route := range routes {
		if route.Routes != nil {
			// Filter out channel routes with matching receiver
			var filteredChildRoutes []*amconfig.Route
			for _, childRoute := range route.Routes {
				if childRoute.Receiver != channelName {
					filteredChildRoutes = append(filteredChildRoutes, childRoute)
				}
			}
			route.Routes = filteredChildRoutes

			// Recursively process child routes
			crs.removeChannelFromRoutes(route.Routes, channelName)
		}
	}
}

// cleanupEmptyPolicyRoutes removes notification policy routes that have no child routes left
func (crs *ChannelRoutingStrategy) cleanupEmptyPolicyRoutes(config *alertmanagertypes.Config) {
	routes := config.AlertmanagerConfig().Route.Routes
	var filteredRoutes []*amconfig.Route

	for _, route := range routes {
		// If this is a notification policy route and it has no child routes, remove it
		if !crs.isDefaultRuleRoute(route) && len(route.Routes) == 0 {
			// Skip this route (delete it)
			continue
		}
		filteredRoutes = append(filteredRoutes, route)
	}

	config.AlertmanagerConfig().Route.Routes = filteredRoutes
}
