package alertmanagertypes

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// func TestNewChannelsFromConfig(t *testing.T) {
// 	tests := []struct {
// 		name     string
// 		config   *Config
// 		expected Channels
// 	}{
// 		{
// 			name: "email config",
// 			config: &Config{
// 				c: &config.Config{
// 					Receivers: []config.Receiver{
// 						{
// 							Name: "email-receiver",
// 							EmailConfigs: []*config.EmailConfig{
// 								{
// 									To: "test@example.com",
// 								},
// 							},
// 						},
// 					},
// 				},
// 			},
// 			expected: Channels{
// 				{
// 					Name: "email-receiver",
// 					Type: "email",
// 					Data: `[{"send_resolved":false, "smarthost":"", "to":"test@example.com"}]`,
// 				},
// 			},
// 		},
// 		{
// 			name: "slack config",
// 			config: &Config{
// 				c: &config.Config{
// 					Receivers: []config.Receiver{
// 						{
// 							Name: "slack-receiver",
// 							SlackConfigs: []*config.SlackConfig{
// 								{
// 									Channel: "#alerts",
// 								},
// 							},
// 						},
// 					},
// 				},
// 			},
// 			expected: Channels{
// 				{
// 					Name: "slack-receiver",
// 					Type: "slack",
// 					Data: `[{"channel":"#alerts", "send_resolved":false}]`,
// 				},
// 			},
// 		},
// 		{
// 			name: "multiple receivers",
// 			config: &Config{
// 				c: &config.Config{
// 					Receivers: []config.Receiver{
// 						{
// 							Name: "email-receiver",
// 							EmailConfigs: []*config.EmailConfig{
// 								{
// 									To: "test@example.com",
// 								},
// 							},
// 						},
// 						{
// 							Name: "slack-receiver",
// 							SlackConfigs: []*config.SlackConfig{
// 								{
// 									Channel: "#alerts",
// 								},
// 							},
// 						},
// 					},
// 				},
// 			},
// 			expected: Channels{
// 				{
// 					Name: "email-receiver",
// 					Type: "email",
// 					Data: `[{"send_resolved":false, "smarthost":"", "to":"test@example.com"}]`,
// 				},
// 				{
// 					Name: "slack-receiver",
// 					Type: "slack",
// 					Data: `[{"channel":"#alerts", "send_resolved":false}]`,
// 				},
// 			},
// 		},
// 		{
// 			name: "empty receiver",
// 			config: &Config{
// 				c: &config.Config{
// 					Receivers: []config.Receiver{
// 						{
// 							Name: "empty-receiver",
// 						},
// 					},
// 				},
// 			},
// 			expected: Channels{},
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			result := NewChannelsFromConfig(tt.config)

// 			// Check length matches
// 			assert.Equal(t, len(tt.expected), len(result), "number of channels should match")

// 			for i, expectedChannel := range tt.expected {
// 				resultChannel := result[i]

// 				// Check basic fields
// 				assert.Equal(t, expectedChannel.Name, resultChannel.Name, "channel name should match")
// 				assert.Equal(t, expectedChannel.Type, resultChannel.Type, "channel type should match")

// 				// Compare JSON data by unmarshaling and comparing
// 				var expectedData, resultData interface{}
// 				err := json.Unmarshal([]byte(expectedChannel.Data), &expectedData)
// 				assert.NoError(t, err, "expected data should be valid JSON")
// 				err = json.Unmarshal([]byte(resultChannel.Data), &resultData)
// 				assert.NoError(t, err, "result data should be valid JSON")
// 				assert.Equal(t, expectedData, resultData, "channel data should match")

// 				// Verify timestamps are recent
// 				assert.WithinDuration(t, time.Now(), resultChannel.CreatedAt, 2*time.Second)
// 				assert.WithinDuration(t, time.Now(), resultChannel.UpdatedAt, 2*time.Second)
// 			}
// 		})
// 	}
// }

func TestNewConfigFromChannels(t *testing.T) {
	testCases := []struct {
		name              string
		channels          Channels
		expectedRoutes    string
		expectedReceivers string
	}{
		{
			name: "OneEmailChannel",
			channels: Channels{
				{
					Name: "email-receiver",
					Type: "email",
					Data: `{"name":"email-receiver","email_configs":[{"to":"test@example.com"}]}`,
				},
			},
			expectedRoutes:    `[{"receiver":"email-receiver","continue":true}]`,
			expectedReceivers: `[{"name":"default-receiver"},{"name":"email-receiver","email_configs":[{"send_resolved":false,"to":"test@example.com","from":"alerts@example.com","hello":"localhost","smarthost":"smtp.example.com:587","require_tls":true,"tls_config":{"insecure_skip_verify":false}}]}]`,
		},
		{
			name: "OneSlackChannel",
			channels: Channels{
				{
					Name: "slack-receiver",
					Type: "slack",
					Data: `{"name":"slack-receiver","slack_configs":[{"channel":"#alerts","api_url":"https://slack.com/api/test","send_resolved":true}]}`,
				},
			},
			expectedRoutes:    `[{"receiver":"slack-receiver","continue":true}]`,
			expectedReceivers: `[{"name":"default-receiver"},{"name":"slack-receiver","slack_configs":[{"send_resolved":true,"http_config":{"tls_config":{"insecure_skip_verify":false},"follow_redirects":true,"enable_http2":true,"proxy_url":null},"api_url":"https://slack.com/api/test","channel":"#alerts"}]}]`,
		},
		{
			name: "OnePagerdutyChannel",
			channels: Channels{
				{
					Name: "pagerduty-receiver",
					Type: "pagerduty",
					Data: `{"name":"pagerduty-receiver","pagerduty_configs":[{"service_key":"test"}]}`,
				},
			},
			expectedRoutes:    `[{"receiver":"pagerduty-receiver","continue":true}]`,
			expectedReceivers: `[{"name":"default-receiver"},{"name":"pagerduty-receiver","pagerduty_configs":[{"send_resolved":false,"http_config":{"tls_config":{"insecure_skip_verify":false},"follow_redirects":true,"enable_http2":true,"proxy_url":null},"service_key":"test","url":"https://events.pagerduty.com/v2/enqueue"}]}]`,
		},
		{
			name: "OnePagerdutyAndOneSlackChannel",
			channels: Channels{
				{
					Name: "pagerduty-receiver",
					Type: "pagerduty",
					Data: `{"name":"pagerduty-receiver","pagerduty_configs":[{"service_key":"test"}]}`,
				},
				{
					Name: "slack-receiver",
					Type: "slack",
					Data: `{"name":"slack-receiver","slack_configs":[{"channel":"#alerts","api_url":"https://slack.com/api/test","send_resolved":true}]}`,
				},
			},
			expectedRoutes:    `[{"receiver":"pagerduty-receiver","continue":true},{"receiver":"slack-receiver","continue":true}]`,
			expectedReceivers: `[{"name":"default-receiver"},{"name":"pagerduty-receiver","pagerduty_configs":[{"send_resolved":false,"http_config":{"tls_config":{"insecure_skip_verify":false},"follow_redirects":true,"enable_http2":true,"proxy_url":null},"service_key":"test","url":"https://events.pagerduty.com/v2/enqueue"}]},{"name":"slack-receiver","slack_configs":[{"send_resolved":true,"http_config":{"tls_config":{"insecure_skip_verify":false},"follow_redirects":true,"enable_http2":true,"proxy_url":null},"api_url":"https://slack.com/api/test","channel":"#alerts"}]}]`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c, err := NewConfigFromChannels(
				5*time.Minute,
				"localhost",
				"alerts@example.com",
				"smtp.example.com",
				587,
				"",
				"",
				"",
				"",
				true,
				[]string{"alertname"},
				5*time.Minute,
				30*time.Second,
				4*time.Hour,
				tc.channels,
				"1",
			)
			assert.NoError(t, err)

			routes, err := json.Marshal(c.alertmanagerConfig.Route.Routes)
			assert.NoError(t, err)
			assert.Equal(t, tc.expectedRoutes, string(routes))

			receivers, err := json.Marshal(c.alertmanagerConfig.Receivers)
			assert.NoError(t, err)
			assert.Equal(t, tc.expectedReceivers, string(receivers))
		})
	}
}
