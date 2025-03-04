package alertmanagertypes

import (
	"encoding/json"
	"net/url"
	"testing"

	"github.com/prometheus/alertmanager/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateRuleIDMatcher(t *testing.T) {
	testCases := []struct {
		name              string
		orgID             string
		receivers         []config.Receiver
		ruleIDToReceivers map[string][]string
		expectedRoutes    []map[string]any
	}{
		{
			name:  "OneSlackReceiver",
			orgID: "1",
			receivers: []config.Receiver{
				{
					Name: "slack-receiver",
					SlackConfigs: []*config.SlackConfig{
						{
							Channel: "#alerts",
							APIURL:  &config.SecretURL{URL: &url.URL{Scheme: "https", Host: "slack.com", Path: "/api/test"}},
						},
					},
				},
			},
			ruleIDToReceivers: map[string][]string{"test-rule": {"slack-receiver"}},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=\"test-rule\""}}},
		},
		{
			name:  "SlackAndEmailReceivers",
			orgID: "1",
			receivers: []config.Receiver{
				{
					Name: "slack-receiver",
					SlackConfigs: []*config.SlackConfig{
						{
							Channel: "#alerts",
							APIURL:  &config.SecretURL{URL: &url.URL{Scheme: "https", Host: "slack.com", Path: "/api/test"}},
						},
					},
				},
				{
					Name: "email-receiver",
					EmailConfigs: []*config.EmailConfig{
						{
							To: "test@example.com",
						},
					},
				},
			},
			ruleIDToReceivers: map[string][]string{"test-rule": {"slack-receiver", "email-receiver"}},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=\"test-rule\""}}, {"receiver": "email-receiver", "continue": true, "matchers": []any{"ruleId=\"test-rule\""}}},
		},
		{
			name:  "ReceiverDoesNotExist",
			orgID: "1",
			receivers: []config.Receiver{
				{
					Name: "slack-receiver",
					SlackConfigs: []*config.SlackConfig{
						{
							Channel: "#alerts",
							APIURL:  &config.SecretURL{URL: &url.URL{Scheme: "https", Host: "slack.com", Path: "/api/test"}},
						},
					},
				},
			},
			ruleIDToReceivers: map[string][]string{"test-rule": {"does-not-exist"}},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true}},
		},
		{
			name:  "MultipleAlertsOnOneSlackReceiver",
			orgID: "1",
			receivers: []config.Receiver{
				{
					Name: "slack-receiver",
					SlackConfigs: []*config.SlackConfig{
						{
							Channel: "#alerts",
							APIURL:  &config.SecretURL{URL: &url.URL{Scheme: "https", Host: "slack.com", Path: "/api/test"}},
						},
					},
				},
			},
			ruleIDToReceivers: map[string][]string{"test-rule-1": {"slack-receiver", "does-not-exist"}, "test-rule-2": {"slack-receiver"}},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=\"test-rule-1\"", "ruleId=\"test-rule-2\""}}},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := NewDefaultConfig(GlobalConfig{SMTPSmarthost: config.HostPort{Host: "localhost", Port: "25"}, SMTPFrom: "test@example.com"}, RouteConfig{}, tc.orgID)
			require.NoError(t, err)

			for _, receiver := range tc.receivers {
				err := cfg.CreateReceiver(receiver)
				require.NoError(t, err)
			}

			for ruleID, receiverNames := range tc.ruleIDToReceivers {
				err = cfg.CreateRuleIDMatcher(ruleID, receiverNames)
				assert.NoError(t, err)
			}

			routes, err := json.Marshal(cfg.alertmanagerConfig.Route.Routes)
			require.NoError(t, err)
			var actualRoutes []map[string]any
			err = json.Unmarshal(routes, &actualRoutes)
			require.NoError(t, err)
			assert.ElementsMatch(t, tc.expectedRoutes, actualRoutes)
		})
	}
}

func TestDeleteRuleIDMatcher(t *testing.T) {
	testCases := []struct {
		name              string
		orgID             string
		receivers         []config.Receiver
		ruleIDToReceivers map[string][]string
		ruleIDsToDelete   []string
		expectedRoutes    []map[string]any
	}{
		{
			name:  "DeleteEmailAndSlackMatchers",
			orgID: "1",
			receivers: []config.Receiver{
				{
					Name: "slack-receiver",
					SlackConfigs: []*config.SlackConfig{
						{
							Channel: "#alerts",
							APIURL:  &config.SecretURL{URL: &url.URL{Scheme: "https", Host: "slack.com", Path: "/api/test"}},
						},
					},
				},
				{
					Name: "email-receiver",
					EmailConfigs: []*config.EmailConfig{
						{
							To: "test@example.com",
						},
					},
				},
			},
			ruleIDToReceivers: map[string][]string{"test-rule": {"email-receiver", "slack-receiver"}},
			ruleIDsToDelete:   []string{"test-rule"},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true}, {"receiver": "email-receiver", "continue": true}},
		},
		{
			name:  "AlertNameDoesNotExist",
			orgID: "1",
			receivers: []config.Receiver{
				{
					Name: "slack-receiver",
					SlackConfigs: []*config.SlackConfig{
						{
							Channel: "#alerts",
							APIURL:  &config.SecretURL{URL: &url.URL{Scheme: "https", Host: "slack.com", Path: "/api/test"}},
						},
					},
				},
				{
					Name: "email-receiver",
					EmailConfigs: []*config.EmailConfig{
						{
							To: "test@example.com",
						},
					},
				},
			},
			ruleIDToReceivers: map[string][]string{"test-rule": {"email-receiver", "slack-receiver"}},
			ruleIDsToDelete:   []string{"does-not-exist"},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=\"test-rule\""}}, {"receiver": "email-receiver", "continue": true, "matchers": []any{"ruleId=\"test-rule\""}}},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := NewDefaultConfig(GlobalConfig{SMTPSmarthost: config.HostPort{Host: "localhost", Port: "25"}, SMTPFrom: "test@example.com"}, RouteConfig{}, tc.orgID)
			require.NoError(t, err)

			for _, receiver := range tc.receivers {
				err := cfg.CreateReceiver(receiver)
				require.NoError(t, err)
			}

			for ruleID, receiverNames := range tc.ruleIDToReceivers {
				err = cfg.CreateRuleIDMatcher(ruleID, receiverNames)
				require.NoError(t, err)
			}

			for _, ruleID := range tc.ruleIDsToDelete {
				err = cfg.DeleteRuleIDMatcher(ruleID)
				assert.NoError(t, err)
			}

			routes, err := json.Marshal(cfg.alertmanagerConfig.Route.Routes)
			require.NoError(t, err)
			var actualRoutes []map[string]any
			err = json.Unmarshal(routes, &actualRoutes)
			require.NoError(t, err)
			assert.ElementsMatch(t, tc.expectedRoutes, actualRoutes)
		})
	}
}
