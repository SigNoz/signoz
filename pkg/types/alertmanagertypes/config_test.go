package alertmanagertypes

import (
	"encoding/json"
	"net/url"
	"testing"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateRuleIDMatcher(t *testing.T) {
	testCases := []struct {
		name              string
		orgID             string
		receivers         []config.Receiver
		ruleIDToReceivers []map[string][]string
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
			ruleIDToReceivers: []map[string][]string{{"test-rule": {"slack-receiver"}}},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1|test-rule\""}}},
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
			ruleIDToReceivers: []map[string][]string{{"test-rule": {"slack-receiver", "email-receiver"}}},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1|test-rule\""}}, {"receiver": "email-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1|test-rule\""}}},
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
			ruleIDToReceivers: []map[string][]string{{"test-rule": {"does-not-exist"}}},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1\""}}},
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
			ruleIDToReceivers: []map[string][]string{{"test-rule-1": {"slack-receiver", "does-not-exist"}}, {"test-rule-2": {"slack-receiver"}}},
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1|test-rule-1|test-rule-2\""}}},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := NewDefaultConfig(
				GlobalConfig{SMTPSmarthost: config.HostPort{Host: "localhost", Port: "25"}, SMTPFrom: "test@example.com"},
				RouteConfig{GroupInterval: 1 * time.Minute, GroupWait: 1 * time.Minute, RepeatInterval: 1 * time.Minute},
				tc.orgID,
			)
			require.NoError(t, err)

			for _, receiver := range tc.receivers {
				err := cfg.CreateReceiver(receiver)
				require.NoError(t, err)
			}

			for _, ruleIDToReceiversMap := range tc.ruleIDToReceivers {
				for ruleId, receiverNames := range ruleIDToReceiversMap {
					err = cfg.CreateRuleIDMatcher(ruleId, receiverNames)
					assert.NoError(t, err)
				}

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
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1\""}}, {"receiver": "email-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1\""}}},
		},
		{
			name:  "RuleIDDoesNotExist",
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
			expectedRoutes:    []map[string]any{{"receiver": "slack-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1|test-rule\""}}, {"receiver": "email-receiver", "continue": true, "matchers": []any{"ruleId=~\"-1|test-rule\""}}},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := NewDefaultConfig(
				GlobalConfig{SMTPSmarthost: config.HostPort{Host: "localhost", Port: "25"}, SMTPFrom: "test@example.com"},
				RouteConfig{GroupInterval: 1 * time.Minute, GroupWait: 1 * time.Minute, RepeatInterval: 1 * time.Minute},
				tc.orgID,
			)
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

func TestSetRouteConfigWithNilRoute(t *testing.T) {
	cfg := NewConfig(&config.Config{}, "1")
	err := cfg.SetRouteConfig(RouteConfig{GroupByStr: []string{"alertname"}, GroupInterval: 1 * time.Minute, GroupWait: 1 * time.Minute, RepeatInterval: 1 * time.Minute})
	require.NoError(t, err)

	assert.NotNil(t, cfg.alertmanagerConfig.Route)
	assert.Equal(t, DefaultReceiverName, cfg.alertmanagerConfig.Route.Receiver)
	assert.Equal(t, []string{"alertname"}, cfg.alertmanagerConfig.Route.GroupByStr)
	assert.Equal(t, model.Duration(1*time.Minute), *cfg.alertmanagerConfig.Route.GroupInterval)
	assert.Equal(t, model.Duration(1*time.Minute), *cfg.alertmanagerConfig.Route.GroupWait)
	assert.Equal(t, model.Duration(1*time.Minute), *cfg.alertmanagerConfig.Route.RepeatInterval)
}

func TestSetRouteConfigWithNonNilRoute(t *testing.T) {
	cfg := NewConfig(&config.Config{Route: &config.Route{Receiver: "test-receiver"}}, "1")
	err := cfg.SetRouteConfig(RouteConfig{GroupByStr: []string{"testgroupby"}, GroupInterval: 5 * time.Minute, GroupWait: 5 * time.Minute, RepeatInterval: 5 * time.Minute})
	require.NoError(t, err)

	assert.NotNil(t, cfg.alertmanagerConfig.Route)
	assert.Equal(t, "test-receiver", cfg.alertmanagerConfig.Route.Receiver)
	assert.Equal(t, []string{"testgroupby"}, cfg.alertmanagerConfig.Route.GroupByStr)
	assert.Equal(t, model.Duration(5*time.Minute), *cfg.alertmanagerConfig.Route.GroupInterval)
	assert.Equal(t, model.Duration(5*time.Minute), *cfg.alertmanagerConfig.Route.GroupWait)
	assert.Equal(t, model.Duration(5*time.Minute), *cfg.alertmanagerConfig.Route.RepeatInterval)
}

func TestUTF8Validation(t *testing.T) {
	testCases := []struct {
		name  string
		label string
		pass  bool
	}{
		{
			name:  "DotLabel",
			label: "a.b.c",
			pass:  true,
		},
		{
			name:  "UnderscoreLabel",
			label: "a_b_c",
			pass:  true,
		},
		{
			name:  "DashLabel",
			label: "a-b-c",
			pass:  true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.pass, model.ValidationScheme.IsValidLabelName(model.UTF8Validation, tc.label))
		})
	}
}

func TestNewDefaultConfigPreservesSMTPRequireTLS(t *testing.T) {
	testCases := []struct {
		name         string
		globalConfig GlobalConfig
		expect       bool
	}{
		{"False", GlobalConfig{SMTPRequireTLS: false}, false},
		{"True", GlobalConfig{SMTPRequireTLS: true}, true},
	}

	for _, tt := range testCases {
		t.Run(tt.name, func(t *testing.T) {
			global := tt.globalConfig
			route := RouteConfig{
				GroupInterval:  time.Minute,
				GroupWait:      time.Minute,
				RepeatInterval: time.Minute,
			}
			cfg, err := NewDefaultConfig(global, route, "1")

			require.NoError(t, err)
			assert.Equal(t, tt.expect, cfg.alertmanagerConfig.Global.SMTPRequireTLS)
		})
	}
}

func TestSetGlobalConfigPreservesSMTPRequireTLS(t *testing.T) {
	testCases := []struct {
		name         string
		globalConfig GlobalConfig
		expect       bool
	}{
		{"False", GlobalConfig{SMTPRequireTLS: false}, false},
		{"True", GlobalConfig{SMTPRequireTLS: true}, true},
	}

	for _, tt := range testCases {
		t.Run(tt.name, func(t *testing.T) {
			c := NewConfig(&config.Config{}, "1")
			global := tt.globalConfig
			err := c.SetGlobalConfig(global)
			require.NoError(t, err)
			assert.Equal(t, tt.expect, c.alertmanagerConfig.Global.SMTPRequireTLS)
		})
	}
}
