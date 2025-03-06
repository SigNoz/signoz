package alertmanagertypes

import (
	"slices"
	"strings"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/pkg/labels"
)

const (
	ruleIDMatcherName     string = "ruleId"
	ruleIDMatcherValueSep string = "|"
)

func appendRuleIDToRoute(route *config.Route, ruleID string) error {
	matcherIdx := slices.IndexFunc(route.Matchers, func(m *labels.Matcher) bool {
		return m.Name == ruleIDMatcherName
	})

	if matcherIdx == -1 {
		matcher, err := labels.NewMatcher(labels.MatchRegexp, ruleIDMatcherName, ruleID)
		if err != nil {
			return err
		}

		route.Matchers = append(route.Matchers, matcher)
		return nil
	}

	existingRuleIDs := strings.Split(route.Matchers[matcherIdx].Value, ruleIDMatcherValueSep)
	existingRuleIDs = append(existingRuleIDs, ruleID)
	route.Matchers[matcherIdx].Value = strings.Join(existingRuleIDs, ruleIDMatcherValueSep)

	return nil
}

func removeRuleIDFromRoute(route *config.Route, ruleID string) error {
	matcherIdx := slices.IndexFunc(route.Matchers, func(m *labels.Matcher) bool {
		return m.Name == ruleIDMatcherName
	})

	if matcherIdx == -1 {
		return nil
	}

	existingRuleIDs := strings.Split(route.Matchers[matcherIdx].Value, ruleIDMatcherValueSep)
	existingRuleIDs = slices.DeleteFunc(existingRuleIDs, func(id string) bool {
		return id == ruleID
	})

	if len(existingRuleIDs) == 0 {
		route.Matchers = slices.Delete(route.Matchers, matcherIdx, matcherIdx+1)
		return nil
	}

	route.Matchers[matcherIdx].Value = strings.Join(existingRuleIDs, ruleIDMatcherValueSep)
	return nil
}
