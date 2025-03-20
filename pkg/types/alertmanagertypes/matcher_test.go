package alertmanagertypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestAddRuleIDToRoute(t *testing.T) {
	testCases := []struct {
		name             string
		route            func() *config.Route
		ruleID           string
		expectedMatchers []any
	}{
		{
			name: "Simple",
			route: func() *config.Route {
				route, err := NewRouteFromReceiver(Receiver{Name: "test"})
				require.NoError(t, err)

				return route
			},
			ruleID:           "1",
			expectedMatchers: []any{"ruleId=~\"-1|1\""},
		},
		{
			name: "AlreadyExists",
			route: func() *config.Route {
				route, err := NewRouteFromReceiver(Receiver{Name: "test"})
				require.NoError(t, err)

				err = addRuleIDToRoute(route, "1")
				require.NoError(t, err)

				return route
			},
			ruleID:           "1",
			expectedMatchers: []any{"ruleId=~\"-1|1\""},
		},
		{
			name: "CreateMatcher",
			route: func() *config.Route {
				return &config.Route{Receiver: "test"}
			},
			ruleID:           "1",
			expectedMatchers: []any{"ruleId=~\"1\""},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			route := tc.route()
			err := addRuleIDToRoute(route, tc.ruleID)
			assert.NoError(t, err)

			marshalledRoute, err := json.Marshal(route)
			require.NoError(t, err)

			marshalledMatchers := gjson.GetBytes(marshalledRoute, "matchers").Array()
			actualMatchers := make([]any, 0, len(marshalledMatchers))
			for _, matcher := range marshalledMatchers {
				actualMatchers = append(actualMatchers, matcher.String())
			}

			assert.ElementsMatch(t, tc.expectedMatchers, actualMatchers)
		})
	}
}

func TestRemoveRuleIDFromRoute(t *testing.T) {
	testCases := []struct {
		name             string
		route            func() *config.Route
		ruleID           string
		expectedMatchers []any
	}{
		{
			name: "Simple",
			route: func() *config.Route {
				route, err := NewRouteFromReceiver(Receiver{Name: "test"})
				require.NoError(t, err)

				err = addRuleIDToRoute(route, "1")
				require.NoError(t, err)

				return route
			},
			ruleID:           "1",
			expectedMatchers: []any{"ruleId=~\"-1\""},
		},
		{
			name: "DoesNotExist",
			route: func() *config.Route {
				route, err := NewRouteFromReceiver(Receiver{Name: "test"})
				require.NoError(t, err)

				return route
			},
			ruleID:           "1",
			expectedMatchers: []any{"ruleId=~\"-1\""},
		},
		{
			name: "DeleteMatcher",
			route: func() *config.Route {
				route, err := NewRouteFromReceiver(Receiver{Name: "test"})
				require.NoError(t, err)

				return route
			},
			ruleID:           "-1",
			expectedMatchers: []any{},
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			route := tc.route()
			err := removeRuleIDFromRoute(route, tc.ruleID)
			assert.NoError(t, err)

			marshalledRoute, err := json.Marshal(route)
			require.NoError(t, err)

			marshalledMatchers := gjson.GetBytes(marshalledRoute, "matchers").Array()
			actualMatchers := make([]any, 0, len(marshalledMatchers))
			for _, matcher := range marshalledMatchers {
				actualMatchers = append(actualMatchers, matcher.String())
			}

			assert.ElementsMatch(t, tc.expectedMatchers, actualMatchers)
		})
	}
}

func TestMatcherContainsRuleID(t *testing.T) {
	testCases := []struct {
		name     string
		matchers func() config.Matchers
		ruleID   string
		expected bool
	}{
		{
			name: "SimpleTrue",
			matchers: func() config.Matchers {
				matcher, err := labels.NewMatcher(labels.MatchRegexp, RuleIDMatcherName, strings.Join([]string{"-1", "1"}, ruleIDMatcherValueSep))
				require.NoError(t, err)

				return config.Matchers{matcher}
			},
			ruleID:   "1",
			expected: true,
		},
		{
			name: "SimpleFalse",
			matchers: func() config.Matchers {
				matcher, err := labels.NewMatcher(labels.MatchRegexp, RuleIDMatcherName, strings.Join([]string{"-1", "1"}, ruleIDMatcherValueSep))
				require.NoError(t, err)

				return config.Matchers{matcher}
			},
			ruleID:   "2",
			expected: false,
		},
		{
			name: "SameCharactersFalse",
			matchers: func() config.Matchers {
				matcher, err := labels.NewMatcher(labels.MatchRegexp, RuleIDMatcherName, strings.Join([]string{"-1", "1", "11", "12", "13", "111", "100"}, ruleIDMatcherValueSep))
				require.NoError(t, err)

				return config.Matchers{matcher}
			},
			ruleID:   "10",
			expected: false,
		},
		{
			name: "SameCharactersTrue",
			matchers: func() config.Matchers {
				matcher, err := labels.NewMatcher(labels.MatchRegexp, RuleIDMatcherName, strings.Join([]string{"-1", "1", "11", "12", "13", "111"}, ruleIDMatcherValueSep))
				require.NoError(t, err)

				return config.Matchers{matcher}
			},
			ruleID:   "11",
			expected: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			matchers := tc.matchers()
			contains := matcherContainsRuleID(matchers, tc.ruleID)
			assert.Equal(t, tc.expected, contains)
		})
	}
}
