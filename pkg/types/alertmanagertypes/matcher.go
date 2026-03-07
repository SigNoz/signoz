package alertmanagertypes

import (
	"slices"
	"strings"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/pkg/labels"
)

const (
	RuleIDMatcherName     string = "ruleId"
	ruleIDMatcherValueSep string = "|"
)

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
