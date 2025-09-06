package routestrategy

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	amconfig "github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	testOrgID = "test-org"
	defaultReceiver = "default-receiver"
	slackReceiver = "slack-receiver"
	emailReceiver = "email-receiver"
)

func processConfigRoutes(config *alertmanagertypes.Config) error {
	if config == nil || config.AlertmanagerConfig() == nil || config.AlertmanagerConfig().Route == nil {
		return nil
	}
	return alertmanagertypes.UnmarshalRouteConfig(config.AlertmanagerConfig().Route)
}

func validateConfig(t *testing.T, actualConfig *alertmanagertypes.Config, expectedConfig *amconfig.Config) {
	if expectedConfig == nil {
		return
	}
	actual := actualConfig.AlertmanagerConfig()
	require.NotNil(t, actual)

	if expectedConfig.Route != nil {
		validateRoute(t, actual.Route, expectedConfig.Route)
	}

	actualReceivers := extractReceiverNames(actual.Receivers)
	expectedReceivers := extractReceiverNames(expectedConfig.Receivers)
	assert.ElementsMatch(t, expectedReceivers, actualReceivers)
}

func validateRoute(t *testing.T, actual, expected *amconfig.Route) {
	assert.Equal(t, expected.Receiver, actual.Receiver)
	assert.Equal(t, expected.Continue, actual.Continue)
	assert.Len(t, actual.Routes, len(expected.Routes))
	assert.Equal(t, expected.GroupBy, actual.GroupBy)
	assert.Equal(t, expected.Matchers, actual.Matchers)

	for i, expectedChild := range expected.Routes {
		if i < len(actual.Routes) {
			validateRoute(t, actual.Routes[i], expectedChild)
		}
	}
}

func extractReceiverNames(receivers []amconfig.Receiver) []string {
	names := make([]string, len(receivers))
	for i, receiver := range receivers {
		names[i] = receiver.Name
	}
	return names
}

func TestNewChannelRoutingStrategy(t *testing.T) {
	strategy := NewChannelRoutingStrategy()
	assert.NotNil(t, strategy)
	assert.IsType(t, &ChannelRoutingStrategy{}, strategy)
}

func defaultConfig() *alertmanagertypes.Config {
	return alertmanagertypes.NewConfig(&amconfig.Config{
		Route: &amconfig.Route{Receiver: defaultReceiver},
		Receivers: []amconfig.Receiver{
			{Name: defaultReceiver},
			{Name: slackReceiver},
			{Name: emailReceiver},
		},
	}, testOrgID)
}

func configWithNilRoute() *alertmanagertypes.Config {
	return alertmanagertypes.NewConfig(&amconfig.Config{Route: nil}, testOrgID)
}

func emptyConfig() *alertmanagertypes.Config {
	return alertmanagertypes.NewConfig(&amconfig.Config{
		Route: &amconfig.Route{Receiver: defaultReceiver, Routes: []*amconfig.Route{}},
		Receivers: []amconfig.Receiver{{Name: defaultReceiver}},
	}, testOrgID)
}

func TestCreateRuleSpecificChannelRoute(t *testing.T) {
	crs := &ChannelRoutingStrategy{}

	tests := []struct {
		name            string
		receiver        string
		ruleId          string
		postableRule    ruletypes.PostableRule
		expectedGroupBy []model.LabelName
	}{
		{
			name:     "Rule with specific GroupBy",
			receiver: "test-receiver",
			ruleId:   "rule-1",
			postableRule: ruletypes.PostableRule{
				GroupBy:  []string{"service.name", "instance"},
				Renotify: ruletypes.Duration(10 * time.Minute),
			},
			expectedGroupBy: []model.LabelName{"service.name", "instance"},
		},
		{
			name:     "Rule without GroupBy",
			receiver: "test-receiver",
			ruleId:   "rule-2",
			postableRule: ruletypes.PostableRule{
				GroupBy:  []string{},
				Renotify: ruletypes.Duration(5 * time.Minute),
			},
			expectedGroupBy: []model.LabelName(nil),
		},
		{
			name:     "Rule with nil GroupBy",
			receiver: "test-receiver",
			ruleId:   "rule-3",
			postableRule: ruletypes.PostableRule{
				GroupBy:  nil,
				Renotify: ruletypes.Duration(15 * time.Minute),
			},
			expectedGroupBy: []model.LabelName(nil),
		},
		{
			name:     "Rule with single GroupBy",
			receiver: "test-receiver",
			ruleId:   "rule-4",
			postableRule: ruletypes.PostableRule{
				GroupBy:  []string{"job"},
				Renotify: ruletypes.Duration(20 * time.Minute),
			},
			expectedGroupBy: []model.LabelName{"job"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			route := crs.createRuleSpecificChannelRoute(tt.receiver, tt.ruleId, tt.postableRule)

			assert.Equal(t, tt.receiver, route.Receiver)
			assert.True(t, route.Continue)
			assert.Equal(t, (*model.Duration)(&tt.postableRule.Renotify), route.RepeatInterval)
			assert.Len(t, route.Matchers, 1)

			matcher := route.Matchers[0]
			assert.Equal(t, "ruleId", matcher.Name)
			assert.Equal(t, labels.MatchEqual, matcher.Type)
			assert.Equal(t, tt.ruleId, matcher.Value)

			err := alertmanagertypes.UnmarshalRouteConfig(route)
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedGroupBy, route.GroupBy)
		})
	}
}

func TestAddDirectRules(t *testing.T) {
	tests := []struct {
		name           string
		ruleId         string
		postableRule   ruletypes.PostableRule
		initialConfig  func() *alertmanagertypes.Config
		expectError    bool
		expectedConfig *amconfig.Config
	}{
		{
			name:   "Add rule to existing default route",
			ruleId: "test-rule-1",
			expectedConfig: &amconfig.Config{
				Route: &amconfig.Route{
					Receiver: "default-receiver",
					Continue: false,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-rule-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "default-rule-receiver_test-rule-1",
									Continue: true,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "test-rule-1"},
										{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
									},
									Routes: []*amconfig.Route{
										{
											Receiver: "slack-receiver",
											Continue: false,
											GroupBy:  []model.LabelName{"service.name"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
											},
										},
										{
											Receiver: "email-receiver",
											Continue: false,
											GroupBy:  []model.LabelName{"service.name"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "threshold.name", Value: "warning"},
											},
										},
									},
								},
							},
						},
					},
				},
				Receivers: []amconfig.Receiver{
					{Name: "default-receiver"},
					{Name: "slack-receiver"},
					{Name: "email-receiver"},
					{Name: "default-rule-receiver"},
					{Name: "default-rule-receiver_test-rule-1"},
				},
			},
			postableRule: ruletypes.PostableRule{
				GroupBy:  []string{"service.name"},
				Renotify: ruletypes.Duration(10 * time.Minute),
				Thresholds: map[string][]string{
					"critical": {"slack-receiver"},
					"warning":  {"email-receiver"},
				},
			},
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{},
					},
					Receivers: []amconfig.Receiver{
						{Name: "default-receiver"},
						{Name: "slack-receiver"},
						{Name: "email-receiver"},
					},
				}, "test-org")
				return cfg
			},
			expectError: false,
		},
		{
			name:   "Error with empty rule ID",
			ruleId: "",
			postableRule: ruletypes.PostableRule{
				Thresholds: map[string][]string{
					"critical": {"slack-receiver"},
				},
			},
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{},
					},
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
		{
			name:   "Error with nil root route",
			ruleId: "test-rule",
			postableRule: ruletypes.PostableRule{
				Thresholds: map[string][]string{
					"critical": {"slack-receiver"},
				},
			},
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: nil, // Nil route should cause error
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			crs := &ChannelRoutingStrategy{}
			config := tt.initialConfig()

			err := crs.AddDirectRules(config, tt.ruleId, tt.postableRule)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				err = processConfigRoutes(config)
				assert.NoError(t, err)
				validateConfig(t, config, tt.expectedConfig)
			}
		})
	}
}

func TestAddNotificationPolicyRules(t *testing.T) {
	tests := []struct {
		name           string
		ruleId         string
		postableRule   ruletypes.PostableRule
		initialConfig  func() *alertmanagertypes.Config
		expectError    bool
		expectedConfig *amconfig.Config
	}{
		{
			name:   "Add rule to existing notification policy",
			ruleId: "test-rule-1",
			postableRule: ruletypes.PostableRule{
				GroupBy:  []string{"service.name", "instance"},
				Renotify: ruletypes.Duration(15 * time.Minute),
			},
			initialConfig: func() *alertmanagertypes.Config {
				// Create config with notification policy route
				policyRoute := &amconfig.Route{
					Receiver: "default-notification-policy_policy-1",
					Continue: true,
					Routes: []*amconfig.Route{
						{
							Receiver: "slack-receiver",
							Continue: true,
							Routes:   []*amconfig.Route{},
						},
					},
				}

				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{policyRoute},
					},
					Receivers: []amconfig.Receiver{
						{Name: "default-receiver"},
						{Name: "slack-receiver"},
						{Name: "default-notification-policy_policy-1"},
					},
				}, "test-org")
				return cfg
			},
			expectError: false,
			expectedConfig: &amconfig.Config{
				Route: &amconfig.Route{
					Receiver: "default-receiver",
					Continue: false,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-notification-policy_policy-1",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "slack-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "slack-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"service.name", "instance"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "test-rule-1"},
											},
										},
									},
								},
							},
						},
					},
				},
				Receivers: []amconfig.Receiver{
					{Name: "default-receiver"},
					{Name: "slack-receiver"},
					{Name: "default-notification-policy_policy-1"},
				},
			},
		},
		{
			name:   "Error with empty rule ID",
			ruleId: "",
			postableRule: ruletypes.PostableRule{
				GroupBy: []string{"service.name"},
			},
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{},
					},
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			crs := &ChannelRoutingStrategy{}
			config := tt.initialConfig()

			err := crs.AddNotificationPolicyRules(config, tt.ruleId, tt.postableRule)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				err = processConfigRoutes(config)
				assert.NoError(t, err)
				validateConfig(t, config, tt.expectedConfig)
			}
		})
	}
}

func TestAddNotificationPolicy(t *testing.T) {
	tests := []struct {
		name           string
		policyMatchers string
		receivers      []string
		ruleIds        map[string]ruletypes.PostableRule
		routeId        string
		initialConfig  func() *alertmanagertypes.Config
		expectError    bool
		expectedConfig *amconfig.Config
	}{
		{
			name:           "Add new notification policy",
			policyMatchers: `env="production"`,
			receivers:      []string{"slack-receiver", "email-receiver"},
			ruleIds: map[string]ruletypes.PostableRule{
				"rule-1": {
					GroupBy:  []string{"service.name"},
					Renotify: ruletypes.Duration(10 * time.Minute),
				},
				"rule-2": {
					GroupBy:  []string{"instance"},
					Renotify: ruletypes.Duration(20 * time.Minute),
				},
			},
			routeId: "policy-1",
			expectedConfig: &amconfig.Config{
				Route: &amconfig.Route{
					Receiver: "default-receiver",
					Continue: false,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-notification-policy_policy-1",
							Continue: true,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "env", Value: "production"},
								{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
							},
							Routes: []*amconfig.Route{
								{
									Receiver: "default-channel-receiver_slack-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "slack-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"service.name"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-1"},
											},
										},
										{
											Receiver: "slack-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"instance"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-2"},
											},
										},
									},
								},
								{
									Receiver: "default-channel-receiver_email-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "email-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"service.name"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-1"},
											},
										},
										{
											Receiver: "email-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"instance"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-2"},
											},
										},
									},
								},
							},
						},
					},
				},
				Receivers: []amconfig.Receiver{
					{Name: "default-receiver"},
					{Name: "slack-receiver"},
					{Name: "email-receiver"},
					{Name: "default-notification-policy_policy-1"},
					{Name: "default-channel-receiver_slack-receiver"},
					{Name: "default-channel-receiver_email-receiver"},
				},
			},
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{},
					},
					Receivers: []amconfig.Receiver{
						{Name: "default-receiver"},
						{Name: "slack-receiver"},
						{Name: "email-receiver"},
					},
				}, "test-org")
				return cfg
			},
			expectError: false,
		},
		{
			name:           "Error with nil root route",
			policyMatchers: `env="production"`,
			receivers:      []string{"slack-receiver"},
			ruleIds:        map[string]ruletypes.PostableRule{"rule-1": {}},
			routeId:        "policy-1",
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: nil,
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
		{
			name:           "Error with empty receivers",
			policyMatchers: `env="production"`,
			receivers:      []string{},
			ruleIds:        map[string]ruletypes.PostableRule{"rule-1": {}},
			routeId:        "policy-1",
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
					},
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
		{
			name:           "Error with empty rule IDs",
			policyMatchers: `env="production"`,
			receivers:      []string{"slack-receiver"},
			ruleIds:        map[string]ruletypes.PostableRule{},
			routeId:        "policy-1",
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
					},
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			crs := &ChannelRoutingStrategy{}
			config := tt.initialConfig()

			err := crs.AddNotificationPolicy(config, tt.policyMatchers, tt.receivers, tt.ruleIds, tt.routeId)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				err = processConfigRoutes(config)
				assert.NoError(t, err)
				validateConfig(t, config, tt.expectedConfig)
			}
		})
	}
}

func TestDeleteDirectRules(t *testing.T) {
	tests := []struct {
		name           string
		ruleId         string
		initialConfig  func() *alertmanagertypes.Config
		expectError    bool
		expectedConfig *amconfig.Config
	}{
		{
			name:   "Delete existing rule from complex config",
			ruleId: "rule-to-delete",
			initialConfig: func() *alertmanagertypes.Config {
				deletableRuleRoute := &amconfig.Route{
					Receiver: "default-rule-receiver_rule-to-delete",
					Continue: true,
					Matchers: []*labels.Matcher{
						{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-to-delete"},
						{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
					},
					Routes: []*amconfig.Route{
						{
							Receiver: "slack-receiver",
							Continue: false,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
							},
						},
						{
							Receiver: "email-receiver",
							Continue: false,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "threshold.name", Value: "warning"},
							},
						},
					},
				}

				keepRuleRoute := &amconfig.Route{
					Receiver: "default-rule-receiver_rule-to-keep",
					Continue: true,
					Matchers: []*labels.Matcher{
						{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-to-keep"},
						{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
					},
					Routes: []*amconfig.Route{
						{
							Receiver: "pagerduty-receiver",
							Continue: false,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
							},
						},
					},
				}

				// Create base rule route containing multiple specific rule routes
				baseRuleRoute := &amconfig.Route{
					Receiver: "default-rule-receiver",
					Continue: true,
					Routes:   []*amconfig.Route{deletableRuleRoute, keepRuleRoute},
				}

				// Create a notification policy route that should remain
				notificationPolicyRoute := &amconfig.Route{
					Receiver: "default-notification-policy_prod-policy",
					Continue: true,
					Matchers: []*labels.Matcher{
						{Type: labels.MatchEqual, Name: "env", Value: "production"},
						{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
					},
					Routes: []*amconfig.Route{
						{
							Receiver: "default-channel-receiver_slack-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "slack-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"service.name"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-1"},
									},
								},
							},
						},
					},
				}

				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{baseRuleRoute, notificationPolicyRoute},
					},
					Receivers: []amconfig.Receiver{
						{Name: "default-receiver"},
						{Name: "slack-receiver"},
						{Name: "email-receiver"},
						{Name: "pagerduty-receiver"},
						{Name: "default-rule-receiver"},
						{Name: "default-rule-receiver_rule-to-delete"},
						{Name: "default-rule-receiver_rule-to-keep"},
						{Name: "default-notification-policy_prod-policy"},
						{Name: "default-channel-receiver_slack-receiver"},
					},
				}, "test-org")
				return cfg
			},
			expectError: false,
			expectedConfig: &amconfig.Config{
				Route: &amconfig.Route{
					Receiver: "default-receiver",
					Continue: false,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-rule-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "default-rule-receiver_rule-to-keep",
									Continue: true,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-to-keep"},
										{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
									},
									Routes: []*amconfig.Route{
										{
											Receiver: "pagerduty-receiver",
											Continue: false,
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
											},
										},
									},
								},
							},
						},
						{
							Receiver: "default-notification-policy_prod-policy",
							Continue: true,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "env", Value: "production"},
								{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
							},
							Routes: []*amconfig.Route{
								{
									Receiver: "default-channel-receiver_slack-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "slack-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"service.name"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-1"},
											},
										},
									},
								},
							},
						},
					},
				},
				Receivers: []amconfig.Receiver{
					{Name: "default-receiver"},
					{Name: "slack-receiver"},
					{Name: "email-receiver"},
					{Name: "pagerduty-receiver"},
					{Name: "default-rule-receiver"},
					{Name: "default-rule-receiver_rule-to-keep"},
					{Name: "default-notification-policy_prod-policy"},
					{Name: "default-channel-receiver_slack-receiver"},
				},
			},
		},
		{
			name:   "Error with empty rule ID",
			ruleId: "",
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
					},
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
		{
			name:   "Error with nil root route",
			ruleId: "some-rule",
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: nil,
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			crs := &ChannelRoutingStrategy{}
			config := tt.initialConfig()

			err := crs.DeleteDirectRules(tt.ruleId, config)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				err = processConfigRoutes(config)
				assert.NoError(t, err)
				validateConfig(t, config, tt.expectedConfig)
			}
		})
	}
}

func TestDeleteNotificationPolicyRules(t *testing.T) {
	tests := []struct {
		name           string
		ruleId         string
		initialConfig  func() *alertmanagertypes.Config
		expectError    bool
		expectedConfig *amconfig.Config
	}{
		{
			name:   "Delete rule from notification policy in complex config",
			ruleId: "policy-rule-to-delete",
			initialConfig: func() *alertmanagertypes.Config {
				// Create comprehensive config with notification policies and rules
				notificationPolicyRoute := &amconfig.Route{
					Receiver: "default-notification-policy_prod-policy",
					Continue: true,
					Matchers: []*labels.Matcher{
						{Type: labels.MatchEqual, Name: "env", Value: "production"},
						{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
					},
					Routes: []*amconfig.Route{
						{
							Receiver: "default-channel-receiver_slack-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "slack-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"service.name"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-to-delete"},
									},
								},
								{
									Receiver: "slack-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"instance"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-to-keep"},
									},
								},
							},
						},
						{
							Receiver: "default-channel-receiver_email-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "email-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"service.name"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-to-delete"},
									},
								},
								{
									Receiver: "email-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"instance"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-to-keep"},
									},
								},
							},
						},
					},
				}

				// Add a direct rule that should remain untouched
				directRuleRoute := &amconfig.Route{
					Receiver: "default-rule-receiver",
					Continue: true,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-rule-receiver_direct-rule",
							Continue: true,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "ruleId", Value: "direct-rule"},
								{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
							},
							Routes: []*amconfig.Route{
								{
									Receiver: "pagerduty-receiver",
									Continue: false,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
									},
								},
							},
						},
					},
				}

				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{directRuleRoute, notificationPolicyRoute},
					},
					Receivers: []amconfig.Receiver{
						{Name: "default-receiver"},
						{Name: "slack-receiver"},
						{Name: "email-receiver"},
						{Name: "pagerduty-receiver"},
						{Name: "default-rule-receiver"},
						{Name: "default-rule-receiver_direct-rule"},
						{Name: "default-notification-policy_prod-policy"},
						{Name: "default-channel-receiver_slack-receiver"},
						{Name: "default-channel-receiver_email-receiver"},
					},
				}, "test-org")
				return cfg
			},
			expectError: false,
			expectedConfig: &amconfig.Config{
				Route: &amconfig.Route{
					Receiver: "default-receiver",
					Continue: false,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-rule-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "default-rule-receiver_direct-rule",
									Continue: true,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "direct-rule"},
										{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
									},
									Routes: []*amconfig.Route{
										{
											Receiver: "pagerduty-receiver",
											Continue: false,
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
											},
										},
									},
								},
							},
						},
						{
							Receiver: "default-notification-policy_prod-policy",
							Continue: true,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "env", Value: "production"},
								{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
							},
							Routes: []*amconfig.Route{
								{
									Receiver: "default-channel-receiver_slack-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "slack-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"instance"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-to-keep"},
											},
										},
									},
								},
								{
									Receiver: "default-channel-receiver_email-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "email-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"instance"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-to-keep"},
											},
										},
									},
								},
							},
						},
					},
				},
				Receivers: []amconfig.Receiver{
					{Name: "default-receiver"},
					{Name: "slack-receiver"},
					{Name: "email-receiver"},
					{Name: "pagerduty-receiver"},
					{Name: "default-rule-receiver"},
					{Name: "default-rule-receiver_direct-rule"},
					{Name: "default-notification-policy_prod-policy"},
					{Name: "default-channel-receiver_slack-receiver"},
					{Name: "default-channel-receiver_email-receiver"},
				},
			},
		},
		{
			name:   "Error with empty rule ID",
			ruleId: "",
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{},
					},
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			crs := &ChannelRoutingStrategy{}
			config := tt.initialConfig()

			err := crs.DeleteNotificationPolicyRules(config, tt.ruleId)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				err = processConfigRoutes(config)
				assert.NoError(t, err)
				validateConfig(t, config, tt.expectedConfig)
			}
		})
	}
}

func TestDeleteNotificationPolicy(t *testing.T) {
	tests := []struct {
		name           string
		routeId        string
		initialConfig  func() *alertmanagertypes.Config
		expectError    bool
		expectedConfig *amconfig.Config
	}{
		{
			name:    "Delete entire notification policy from complex config",
			routeId: "prod-policy",
			initialConfig: func() *alertmanagertypes.Config {
				// Create comprehensive config with multiple notification policies
				prodPolicyRoute := &amconfig.Route{
					Receiver: "default-notification-policy_prod-policy",
					Continue: true,
					Matchers: []*labels.Matcher{
						{Type: labels.MatchEqual, Name: "env", Value: "production"},
						{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
					},
					Routes: []*amconfig.Route{
						{
							Receiver: "default-channel-receiver_slack-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "slack-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"service.name"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "prod-rule-1"},
									},
								},
							},
						},
					},
				}

				stagingPolicyRoute := &amconfig.Route{
					Receiver: "default-notification-policy_staging-policy",
					Continue: true,
					Matchers: []*labels.Matcher{
						{Type: labels.MatchEqual, Name: "env", Value: "staging"},
						{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
					},
					Routes: []*amconfig.Route{
						{
							Receiver: "default-channel-receiver_email-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "email-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"instance"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "staging-rule-1"},
									},
								},
							},
						},
					},
				}

				directRuleRoute := &amconfig.Route{
					Receiver: "default-rule-receiver",
					Continue: true,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-rule-receiver_direct-rule",
							Continue: true,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "ruleId", Value: "direct-rule"},
								{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
							},
							Routes: []*amconfig.Route{
								{
									Receiver: "pagerduty-receiver",
									Continue: false,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
									},
								},
							},
						},
					},
				}

				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{directRuleRoute, prodPolicyRoute, stagingPolicyRoute},
					},
					Receivers: []amconfig.Receiver{
						{Name: "default-receiver"},
						{Name: "slack-receiver"},
						{Name: "email-receiver"},
						{Name: "pagerduty-receiver"},
						{Name: "default-rule-receiver"},
						{Name: "default-rule-receiver_direct-rule"},
						{Name: "default-notification-policy_prod-policy"},
						{Name: "default-notification-policy_staging-policy"},
						{Name: "default-channel-receiver_slack-receiver"},
						{Name: "default-channel-receiver_email-receiver"},
					},
				}, "test-org")
				return cfg
			},
			expectError: false,
			expectedConfig: &amconfig.Config{
				Route: &amconfig.Route{
					Receiver: "default-receiver",
					Continue: false,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-rule-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "default-rule-receiver_direct-rule",
									Continue: true,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "direct-rule"},
										{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
									},
									Routes: []*amconfig.Route{
										{
											Receiver: "pagerduty-receiver",
											Continue: false,
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
											},
										},
									},
								},
							},
						},
						{
							Receiver: "default-notification-policy_staging-policy",
							Continue: true,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "env", Value: "staging"},
								{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
							},
							Routes: []*amconfig.Route{
								{
									Receiver: "default-channel-receiver_email-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "email-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"instance"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "staging-rule-1"},
											},
										},
									},
								},
							},
						},
					},
				},
				Receivers: []amconfig.Receiver{
					{Name: "default-receiver"},
					{Name: "slack-receiver"},
					{Name: "email-receiver"},
					{Name: "pagerduty-receiver"},
					{Name: "default-rule-receiver"},
					{Name: "default-rule-receiver_direct-rule"},
					{Name: "default-notification-policy_prod-policy"},
					{Name: "default-notification-policy_staging-policy"},
					{Name: "default-channel-receiver_slack-receiver"},
					{Name: "default-channel-receiver_email-receiver"},
				},
			},
		},
		{
			name:    "No error with empty route ID (just does nothing)",
			routeId: "",
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{},
					},
					Receivers: []amconfig.Receiver{
						{Name: "default-receiver"},
					},
				}, "test-org")
				return cfg
			},
			expectError:    false,
			expectedConfig: &amconfig.Config{
				Route: &amconfig.Route{
					Receiver: "default-receiver",
					Routes:   []*amconfig.Route{},
				},
				Receivers: []amconfig.Receiver{
					{Name: "default-receiver"},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			crs := &ChannelRoutingStrategy{}
			config := tt.initialConfig()

			err := crs.DeleteNotificationPolicy(config, tt.routeId)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				err = processConfigRoutes(config)
				assert.NoError(t, err)
				validateConfig(t, config, tt.expectedConfig)
			}
		})
	}
}

func TestDeleteChannel(t *testing.T) {
	tests := []struct {
		name           string
		channelName    string
		initialConfig  func() *alertmanagertypes.Config
		expectError    bool
		expectedConfig *amconfig.Config
	}{
		{
			name:        "Delete channel from complex config with multiple usages",
			channelName: "slack-receiver",
			initialConfig: func() *alertmanagertypes.Config {
				directRuleRoute := &amconfig.Route{
					Receiver: "default-rule-receiver",
					Continue: true,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-rule-receiver_rule-1",
							Continue: true,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-1"},
								{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
							},
							Routes: []*amconfig.Route{
								{
									Receiver: "slack-receiver",
									Continue: false,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
									},
								},
								{
									Receiver: "email-receiver",
									Continue: false,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "threshold.name", Value: "warning"},
									},
								},
							},
						},
					},
				}

				notificationPolicyRoute := &amconfig.Route{
					Receiver: "default-notification-policy_prod-policy",
					Continue: true,
					Matchers: []*labels.Matcher{
						{Type: labels.MatchEqual, Name: "env", Value: "production"},
						{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
					},
					Routes: []*amconfig.Route{
						{
							Receiver: "default-channel-receiver_slack-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "slack-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"service.name"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-1"},
									},
								},
							},
						},
						{
							Receiver: "default-channel-receiver_email-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "email-receiver",
									Continue: true,
									GroupBy:  []model.LabelName{"instance"},
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-2"},
									},
								},
							},
						},
					},
				}

				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{directRuleRoute, notificationPolicyRoute},
					},
					Receivers: []amconfig.Receiver{
						{Name: "default-receiver"},
						{Name: "slack-receiver"},
						{Name: "email-receiver"},
						{Name: "default-rule-receiver"},
						{Name: "default-rule-receiver_rule-1"},
						{Name: "default-notification-policy_prod-policy"},
						{Name: "default-channel-receiver_slack-receiver"},
						{Name: "default-channel-receiver_email-receiver"},
					},
				}, "test-org")
				return cfg
			},
			expectError: false,
			expectedConfig: &amconfig.Config{
				Route: &amconfig.Route{
					Receiver: "default-receiver",
					Continue: false,
					Routes: []*amconfig.Route{
						{
							Receiver: "default-rule-receiver",
							Continue: true,
							Routes: []*amconfig.Route{
								{
									Receiver: "default-rule-receiver_rule-1",
									Continue: true,
									Matchers: []*labels.Matcher{
										{Type: labels.MatchEqual, Name: "ruleId", Value: "rule-1"},
										{Type: labels.MatchEqual, Name: "notification_policy", Value: "false"},
									},
									Routes: []*amconfig.Route{
										{
											Receiver: "slack-receiver",
											Continue: false,
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "threshold.name", Value: "critical"},
											},
										},
										{
											Receiver: "email-receiver",
											Continue: false,
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "threshold.name", Value: "warning"},
											},
										},
									},
								},
							},
						},
						{
							Receiver: "default-notification-policy_prod-policy",
							Continue: true,
							Matchers: []*labels.Matcher{
								{Type: labels.MatchEqual, Name: "env", Value: "production"},
								{Type: labels.MatchEqual, Name: "notification_policy", Value: "true"},
							},
							Routes: []*amconfig.Route{
								{
									Receiver: "default-channel-receiver_slack-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "slack-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"service.name"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-1"},
											},
										},
									},
								},
								{
									Receiver: "default-channel-receiver_email-receiver",
									Continue: true,
									Routes: []*amconfig.Route{
										{
											Receiver: "email-receiver",
											Continue: true,
											GroupBy:  []model.LabelName{"instance"},
											Matchers: []*labels.Matcher{
												{Type: labels.MatchEqual, Name: "ruleId", Value: "policy-rule-2"},
											},
										},
									},
								},
							},
						},
					},
				},
				Receivers: []amconfig.Receiver{
					{Name: "default-receiver"},
					{Name: "email-receiver"},
					{Name: "default-rule-receiver"},
					{Name: "default-rule-receiver_rule-1"},
					{Name: "default-notification-policy_prod-policy"},
					{Name: "default-channel-receiver_slack-receiver"},
					{Name: "default-channel-receiver_email-receiver"},
				},
			},
		},
		{
			name:        "Error with empty channel name",
			channelName: "",
			initialConfig: func() *alertmanagertypes.Config {
				cfg := alertmanagertypes.NewConfig(&amconfig.Config{
					Route: &amconfig.Route{
						Receiver: "default-receiver",
						Routes:   []*amconfig.Route{},
					},
				}, "test-org")
				return cfg
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			crs := &ChannelRoutingStrategy{}
			config := tt.initialConfig()

			err := crs.DeleteChannel(config, tt.channelName)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				err = processConfigRoutes(config)
				assert.NoError(t, err)
				validateConfig(t, config, tt.expectedConfig)
			}
		})
	}
}

func TestCreatePolicyChannelRoute(t *testing.T) {
	crs := &ChannelRoutingStrategy{}

	route := crs.createPolicyChannelRoute("test-receiver")

	assert.Equal(t, "default-channel-receiver_test-receiver", route.Receiver)
	assert.True(t, route.Continue)
	assert.Empty(t, route.Routes)
	assert.Empty(t, route.Matchers)
	assert.Empty(t, route.GroupBy) // Should not have GroupBy set initially

	// Validate that the route can be properly unmarshaled
	err := route.UnmarshalYAML(func(i interface{}) error { return nil })
	assert.NoError(t, err, "Route should be valid for UnmarshalYAML")
}

func TestParseMatchers(t *testing.T) {
	crs := &ChannelRoutingStrategy{}

	tests := []struct {
		name        string
		matcherStr  string
		expectError bool
		validate    func(t *testing.T, matchers []labels.Matcher)
	}{
		{
			name:        "Simple equality matcher",
			matcherStr:  `env="production"`,
			expectError: false,
			validate: func(t *testing.T, matchers []labels.Matcher) {
				require.Len(t, matchers, 1)
				assert.Equal(t, "env", matchers[0].Name)
				assert.Equal(t, "production", matchers[0].Value)
				assert.Equal(t, labels.MatchEqual, matchers[0].Type)
			},
		},
		{
			name:        "Multiple matchers",
			matcherStr:  `env="production"&service="api"`,
			expectError: false,
			validate: func(t *testing.T, matchers []labels.Matcher) {
				require.Len(t, matchers, 2)
				// Order might vary, so check both matchers exist
				matcherMap := make(map[string]string)
				for _, matcher := range matchers {
					matcherMap[matcher.Name] = matcher.Value
				}
				assert.Equal(t, "production", matcherMap["env"])
				assert.Equal(t, "api", matcherMap["service"])
			},
		},
		{
			name:        "Empty matcher string",
			matcherStr:  "",
			expectError: false,
			validate: func(t *testing.T, matchers []labels.Matcher) {
				assert.Empty(t, matchers)
			},
		},
		{
			name:        "Whitespace only matcher string",
			matcherStr:  "   ",
			expectError: false,
			validate: func(t *testing.T, matchers []labels.Matcher) {
				assert.Empty(t, matchers)
			},
		},
		{
			name:        "Invalid matcher format",
			matcherStr:  `invalid-format`,
			expectError: true,
			validate: func(t *testing.T, matchers []labels.Matcher) {
				// No validation needed for error case
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			matchers, err := crs.parseMatchers(tt.matcherStr)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				tt.validate(t, matchers)
			}
		})
	}
}

func TestConvertToConfigMatchers(t *testing.T) {
	crs := &ChannelRoutingStrategy{}

	// Create test matchers
	matcher1, _ := labels.NewMatcher(labels.MatchEqual, "env", "production")
	matcher2, _ := labels.NewMatcher(labels.MatchNotEqual, "service", "debug")
	matcher3, _ := labels.NewMatcher(labels.MatchRegexp, "instance", "web-.*")

	matchers := []labels.Matcher{*matcher1, *matcher2, *matcher3}

	configMatchers := crs.convertToConfigMatchers(matchers)

	require.Len(t, configMatchers, 3)

	// Check that conversion works correctly
	assert.Equal(t, "env", configMatchers[0].Name)
	assert.Equal(t, "production", configMatchers[0].Value)

	assert.Equal(t, "service", configMatchers[1].Name)
	assert.Equal(t, "debug", configMatchers[1].Value)

	assert.Equal(t, "instance", configMatchers[2].Name)
	assert.Equal(t, "web-.*", configMatchers[2].Value)
}
