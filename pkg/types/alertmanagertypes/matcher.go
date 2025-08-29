package alertmanagertypes

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/types/nfroutingtypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/matcher/compat"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/common/model"
)

const (
	RuleIDMatcherName     string = "ruleId"
	ruleIDMatcherValueSep string = "|"
)

// RuleGrouping defines per-rule grouping configuration
type RuleGrouping struct {
	GroupBy        []string      `json:"group_by"`        // [service.name, instance]
	RepeatInterval time.Duration `json:"repeat_interval"` // 12h
}

var (
	// noRuleIDMatcher is a matcher that matches no ruleId.
	// This is used to ensure that when a new receiver is created, it does not start matching any ruleId.
	noRuleIDMatcher, _ = labels.NewMatcher(labels.MatchRegexp, RuleIDMatcherName, "-1")
)

func addRuleIDToRoute(route *config.Route, ruleID string) error {
	matcherIdx := slices.IndexFunc(route.Matchers, func(m *labels.Matcher) bool {
		return m.Name == RuleIDMatcherName
	})

	if matcherIdx == -1 {
		matcher, err := labels.NewMatcher(labels.MatchRegexp, RuleIDMatcherName, ruleID)
		if err != nil {
			return err
		}

		route.Matchers = append(route.Matchers, matcher)
		return nil
	}

	existingRuleIDs := strings.Split(route.Matchers[matcherIdx].Value, ruleIDMatcherValueSep)
	if slices.Contains(existingRuleIDs, ruleID) {
		return nil
	}

	existingRuleIDs = append(existingRuleIDs, ruleID)
	newMatcher, err := labels.NewMatcher(labels.MatchRegexp, RuleIDMatcherName, strings.Join(existingRuleIDs, ruleIDMatcherValueSep))
	if err != nil {
		return err
	}
	route.Matchers = slices.Replace(route.Matchers, matcherIdx, matcherIdx+1, newMatcher)

	return nil
}

func removeRuleIDFromRoute(route *config.Route, ruleID string) error {
	matcherIdx := slices.IndexFunc(route.Matchers, func(m *labels.Matcher) bool { return m.Name == RuleIDMatcherName })
	if matcherIdx == -1 {
		return nil
	}

	existingRuleIDs := strings.Split(route.Matchers[matcherIdx].Value, ruleIDMatcherValueSep)
	existingRuleIDIdx := slices.IndexFunc(existingRuleIDs, func(id string) bool { return id == ruleID })
	if existingRuleIDIdx == -1 {
		return nil
	}

	existingRuleIDs = slices.Delete(existingRuleIDs, existingRuleIDIdx, existingRuleIDIdx+1)
	if len(existingRuleIDs) == 0 {
		route.Matchers = slices.Delete(route.Matchers, matcherIdx, matcherIdx+1)
		return nil
	}

	newMatcher, err := labels.NewMatcher(labels.MatchRegexp, RuleIDMatcherName, strings.Join(existingRuleIDs, ruleIDMatcherValueSep))
	if err != nil {
		return err
	}
	route.Matchers = slices.Replace(route.Matchers, matcherIdx, matcherIdx+1, newMatcher)

	return nil
}

func matcherContainsRuleID(matchers config.Matchers, ruleID string) bool {
	for _, matcher := range matchers {
		if matcher.Matches(ruleID) {
			return true
		}
	}

	return false
}

// createRuleLeafNode creates a leaf route node for a specific rule with custom grouping
func createRuleLeafNode(ruleID string, ruleGrouping RuleGrouping, parentReceiver string) (*config.Route, error) {
	// Create ruleId matcher for this specific rule
	ruleIDMatcher, err := labels.NewMatcher(labels.MatchEqual, RuleIDMatcherName, ruleID)
	if err != nil {
		return nil, err
	}

	// Create the leaf route with rule-specific grouping
	leafRoute := &config.Route{
		Receiver:       parentReceiver,
		Continue:       false, // Leaf node - stop processing here
		Matchers:       config.Matchers{ruleIDMatcher},
		GroupByStr:     ruleGrouping.GroupBy,
		RepeatInterval: (*model.Duration)(&ruleGrouping.RepeatInterval),
	}

	// Unmarshal to validate the route
	if err := leafRoute.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return nil, err
	}

	return leafRoute, nil
}

// addRuleLeafToRoute adds a rule as a leaf node to a parent route
func addRuleLeafToRoute(parentRoute *config.Route, ruleID string, ruleGrouping RuleGrouping) error {
	// Check if rule leaf already exists
	for _, childRoute := range parentRoute.Routes {
		for _, matcher := range childRoute.Matchers {
			if matcher.Name == RuleIDMatcherName && matcher.Value == ruleID {
				// Rule already exists, skip
				return nil
			}
		}
	}

	// Create new rule leaf node
	ruleLeafNode, err := createRuleLeafNode(ruleID, ruleGrouping, parentRoute.Receiver)
	if err != nil {
		return err
	}

	// Add as child route
	parentRoute.Routes = append(parentRoute.Routes, ruleLeafNode)
	return nil
}

// addRuleToExpressionRoutes adds a rule as leaf node to all expression routes
func addRuleToExpressionRoutes(alertConfig *config.Config, ruleID string, ruleGrouping RuleGrouping, expressionRoutes []nfroutingtypes.ExpressionRoute) error {
	if alertConfig.Route == nil {
		return nil
	}

	// Add rule to each expression route
	for _, expRoute := range expressionRoutes {
		if !expRoute.Enabled {
			continue
		}

		// Convert expression to Prometheus matchers for comparison
		matchers, err := parseExpressionToMatchers(expRoute.Expression)
		if err != nil {
			// Skip routes we can't parse
			continue
		}

		// Find matching routes in alertmanager config for each channel
		for _, channel := range expRoute.Channels {
			for _, route := range alertConfig.Route.Routes {
				if route.Receiver == channel {
					// Check if matchers match
					if matchersEqual(route.Matchers, matchers) {
						if err := addRuleLeafToRoute(route, ruleID, ruleGrouping); err != nil {
							return err
						}
					}
				}
			}
		}
	}

	return nil
}

// addRuleToDefaultRoute adds a rule as intermediate node to the default route with threshold-based child routes
func addRuleToDefaultRoute(alertConfig *config.Config, ruleID string, ruleGrouping RuleGrouping, thresholdMapping map[string][]string) error {
	if alertConfig.Route == nil {
		return nil
	}

	// Find or create default route (sibling to notification policy routes)
	var defaultRoute *config.Route
	for _, route := range alertConfig.Route.Routes {
		// Default route has only noRuleIDMatcher or no special matchers
		if len(route.Matchers) == 1 && route.Matchers[0].Name == RuleIDMatcherName && route.Matchers[0].Value == "-1" && route.Receiver == "default-receiver" {
			defaultRoute = route
			break
		}
	}

	// If no default route exists, create one
	if defaultRoute == nil {
		defaultRoute = &config.Route{
			Receiver: "default-receiver", // Use default receiver
			Continue: true,
			Matchers: config.Matchers{noRuleIDMatcher},
		}

		// Unmarshal to validate the route
		if err := defaultRoute.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
			return err
		}

		alertConfig.Route.Routes = append(alertConfig.Route.Routes, defaultRoute)
	}

	// Add rule as intermediate node with threshold-based routing
	return addRuleWithThresholdRouting(defaultRoute, ruleID, ruleGrouping, thresholdMapping)
}

// addRuleWithThresholdRouting creates a rule node with threshold-based child routes
func addRuleWithThresholdRouting(parentRoute *config.Route, ruleID string, ruleGrouping RuleGrouping, thresholdMapping map[string][]string) error {
	// Check if rule node already exists
	var ruleNode *config.Route
	for _, childRoute := range parentRoute.Routes {
		for _, matcher := range childRoute.Matchers {
			if matcher.Name == RuleIDMatcherName && matcher.Value == ruleID {
				ruleNode = childRoute
				break
			}
		}
		if ruleNode != nil {
			break
		}
	}

	// Create rule node if it doesn't exist
	if ruleNode == nil {
		ruleIDMatcher, err := labels.NewMatcher(labels.MatchEqual, RuleIDMatcherName, ruleID)
		if err != nil {
			return err
		}

		ruleNode = &config.Route{
			Receiver:   parentRoute.Receiver, // Inherit parent receiver as default
			Continue:   true,                 // Continue to check threshold-based children
			Matchers:   config.Matchers{ruleIDMatcher},
			GroupByStr: ruleGrouping.GroupBy,
		}

		// Unmarshal to validate the route
		if err := ruleNode.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
			return err
		}

		parentRoute.Routes = append(parentRoute.Routes, ruleNode)
	}

	// Add threshold-based child routes
	for thresholdName, receivers := range thresholdMapping {
		for _, receiver := range receivers {
			err := addThresholdRoute(ruleNode, thresholdName, receiver, ruleGrouping)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// addThresholdRoute adds a threshold-based route as child of rule node
func addThresholdRoute(ruleNode *config.Route, thresholdName string, receiverName string, ruleGrouping RuleGrouping) error {
	// Check if threshold route already exists
	for _, childRoute := range ruleNode.Routes {
		for _, matcher := range childRoute.Matchers {
			if matcher.Name == "threshold.name" && matcher.Value == thresholdName {
				// Update receiver if different
				if childRoute.Receiver != receiverName {
					childRoute.Receiver = receiverName
				}
				return nil // Route already exists
			}
		}
	}

	// Create threshold matcher
	thresholdMatcher, err := labels.NewMatcher(labels.MatchEqual, "threshold.name", thresholdName)
	if err != nil {
		return err
	}

	// Create threshold route
	thresholdRoute := &config.Route{
		Receiver:       receiverName,
		Continue:       false, // Leaf node - stop processing here
		Matchers:       config.Matchers{thresholdMatcher},
		GroupByStr:     ruleGrouping.GroupBy,
		RepeatInterval: (*model.Duration)(&ruleGrouping.RepeatInterval),
	}

	// Unmarshal to validate the route
	if err := thresholdRoute.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return err
	}

	ruleNode.Routes = append(ruleNode.Routes, thresholdRoute)
	return nil
}

// AddRuleToRoutes is the main function that replaces addRuleIDToRoute
// It adds a rule as leaf nodes with custom grouping based on expression route settings
func (c *Config) AddRuleToRoutes(ruleID string, ruleGrouping RuleGrouping, expressionRoutesEnabled bool, expressionRoutes []nfroutingtypes.ExpressionRoute, thresholdMapping map[string][]string) error {
	var err error
	if expressionRoutesEnabled {
		err = addRuleToExpressionRoutes(c.alertmanagerConfig, ruleID, ruleGrouping, expressionRoutes)
	} else {
		err = addRuleToDefaultRoute(c.alertmanagerConfig, ruleID, ruleGrouping, thresholdMapping)
	}

	if err != nil {
		return err
	}

	// Update the StoreableConfig with new hash and timestamp
	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()

	return nil
}

// RemoveRuleFromRoutes removes a rule from all routes (both notification policy and default)
func RemoveRuleFromRoutes(alertConfig *config.Config, ruleID string) error {
	if alertConfig.Route == nil {
		return nil
	}

	// Remove from all routes
	for _, parentRoute := range alertConfig.Route.Routes {
		// Remove rule leaf nodes
		var updatedChildRoutes []*config.Route
		for _, childRoute := range parentRoute.Routes {
			// Check if this child route is for the rule we want to remove
			shouldRemove := false
			for _, matcher := range childRoute.Matchers {
				if matcher.Name == RuleIDMatcherName && matcher.Value == ruleID {
					shouldRemove = true
					break
				}
			}
			if !shouldRemove {
				updatedChildRoutes = append(updatedChildRoutes, childRoute)
			}
		}
		parentRoute.Routes = updatedChildRoutes
	}

	return nil
}

// CreateExpressionRoutes creates routes for expression-based routing during server startup
func CreateExpressionRoutes(c *Config, expressionRoutes []nfroutingtypes.ExpressionRoute) error {
	if c.alertmanagerConfig.Route == nil {
		return nil
	}

	// Create routes for each enabled expression route
	routesAdded := false
	for _, expRoute := range expressionRoutes {
		if !expRoute.Enabled {
			continue
		}

		// Convert expression to Prometheus matchers
		matchers, err := parseExpressionToMatchers(expRoute.Expression)
		if err != nil {
			return fmt.Errorf("failed to parse expression %s: %w", expRoute.Expression, err)
		}

		// Check if route already exists for any of the channels
		for _, channel := range expRoute.Channels {
			routeExists := false
			for _, route := range c.alertmanagerConfig.Route.Routes {
				if route.Receiver == channel {
					// Check if matchers match
					if matchersEqual(route.Matchers, matchers) {
						routeExists = true
						break
					}
				}
			}

			if !routeExists {
				// Convert []labels.Matcher to config.Matchers
				var configMatchers config.Matchers
				for _, matcher := range matchers {
					// Create a copy of the matcher to avoid pointer issues
					matcherCopy := matcher
					configMatchers = append(configMatchers, &matcherCopy)
				}

				// Create new expression-based route
				expressionRoute := &config.Route{
					Receiver: channel,
					Continue: true, // Continue to check other routes
					Matchers: configMatchers,
				}

				// Unmarshal to validate the route
				if err := expressionRoute.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
					return fmt.Errorf("failed to validate expression route %s (receiver: %s): %w", expRoute.Name, channel, err)
				}

				// Add expression route to the config
				c.alertmanagerConfig.Route.Routes = append(c.alertmanagerConfig.Route.Routes, expressionRoute)
				routesAdded = true
			}
		}
	}

	// Update storeable config if routes were added
	if routesAdded {
		if err := c.alertmanagerConfig.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
			return err
		}

		c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
		c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
		c.storeableConfig.UpdatedAt = time.Now()
	}

	return nil
}

// DeleteExpressionRoutes removes routes for expression-based routing from alertmanager config
func DeleteExpressionRoutes(c *Config, expressionRoutes []nfroutingtypes.ExpressionRoute) error {
	if c.alertmanagerConfig.Route == nil {
		return nil
	}

	routesRemoved := false
	for _, expRoute := range expressionRoutes {
		// Convert expression to Prometheus matchers for comparison
		matchers, err := parseExpressionToMatchers(expRoute.Expression)
		if err != nil {
			// If we can't parse the expression, skip it (route might have been manually deleted)
			continue
		}

		// Remove routes that match this expression route for any of its channels
		var updatedRoutes []*config.Route
		for _, route := range c.alertmanagerConfig.Route.Routes {
			shouldRemove := false

			// Check if this route matches any of the expression route channels
			for _, channel := range expRoute.Channels {
				if route.Receiver == channel {
					// Check if matchers match
					if matchersEqual(route.Matchers, matchers) {
						shouldRemove = true
						routesRemoved = true
						break
					}
				}
			}

			if !shouldRemove {
				updatedRoutes = append(updatedRoutes, route)
			}
		}

		c.alertmanagerConfig.Route.Routes = updatedRoutes
	}

	// Update storeable config if routes were removed
	if routesRemoved {
		if err := c.alertmanagerConfig.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
			return err
		}

		c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
		c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
		c.storeableConfig.UpdatedAt = time.Now()
	}

	return nil
}

// parseExpressionToMatchers converts a string expression to Prometheus matchers
func parseExpressionToMatchers(expression string) ([]labels.Matcher, error) {
	expression = strings.TrimSpace(expression)
	if expression == "" {
		return nil, fmt.Errorf("empty expression")
	}

	// Split by logical operators and validate each part
	parts := strings.FieldsFunc(expression, func(r rune) bool {
		return r == '&' || r == '|'
	})

	var matchers []labels.Matcher
	for _, part := range parts {
		part = strings.Trim(strings.TrimSpace(part), "()")
		if part == "" {
			continue
		}

		matcher, err := compat.Matcher(part, "validation")
		if err != nil {
			return nil, fmt.Errorf("invalid matcher %s: %w", part, err)
		}
		matchers = append(matchers, *matcher)
	}

	return matchers, nil
}

// matchersEqual checks if two matcher arrays are equal
func matchersEqual(matchers1 config.Matchers, matchers2 []labels.Matcher) bool {
	if len(matchers1) != len(matchers2) {
		return false
	}

	// Compare each matcher
	for i, matcher := range matchers2 {
		if i >= len(matchers1) {
			return false
		}
		if matchers1[i].Name != matcher.Name || matchers1[i].Value != matcher.Value {
			return false
		}
	}

	return true
}
