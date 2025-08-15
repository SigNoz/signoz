package rulebasedgrouping

import (
	"context"
	"sync"
	"testing"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/notificationgrouping"
	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestProviderSettings() factory.ProviderSettings {
	return instrumentationtest.New().ToProviderSettings()
}

func TestNewFactory(t *testing.T) {
	providerFactory := NewFactory()
	assert.NotNil(t, providerFactory)
	assert.Equal(t, "rulebased", providerFactory.Name().String())
}

func TestNew(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)
	assert.NotNil(t, provider)

	// Verify provider implements the interface correctly
	assert.Implements(t, (*notificationgrouping.NotificationGroups)(nil), provider)
}

func TestProvider_SetGroupLabels(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	tests := []struct {
		name        string
		orgID       string
		ruleID      string
		groupLabels []string
		wantErr     bool
	}{
		{
			name:        "valid parameters",
			orgID:       "org1",
			ruleID:      "rule1",
			groupLabels: []string{"alertname", "severity"},
			wantErr:     false,
		},
		{
			name:        "empty orgID",
			orgID:       "",
			ruleID:      "rule1",
			groupLabels: []string{"alertname"},
			wantErr:     false, // Should not error but also not set anything
		},
		{
			name:        "empty ruleID",
			orgID:       "org1",
			ruleID:      "",
			groupLabels: []string{"alertname"},
			wantErr:     false, // Should not error but also not set anything
		},
		{
			name:        "nil groupLabels",
			orgID:       "org1",
			ruleID:      "rule1",
			groupLabels: nil,
			wantErr:     false,
		},
		{
			name:        "empty groupLabels",
			orgID:       "org1",
			ruleID:      "rule1",
			groupLabels: []string{},
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := provider.SetGroupLabels(tt.orgID, tt.ruleID, tt.groupLabels)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.orgID != "" && tt.ruleID != "" && tt.groupLabels != nil {
					alert := &types.Alert{
						Alert: model.Alert{
							Labels: model.LabelSet{
								"ruleId": model.LabelValue(tt.ruleID),
							},
						},
					}

					// Add all group labels to the alert so they can be retrieved
					for _, label := range tt.groupLabels {
						alert.Labels[model.LabelName(label)] = model.LabelValue("test_value")
					}

					route := &dispatch.Route{
						RouteOpts: dispatch.RouteOpts{
							GroupBy: map[model.LabelName]struct{}{},
						},
					}

					groupLabels := provider.GetGroupLabels(tt.orgID, alert, route)

					// Verify that all configured group labels are present in the result
					for _, expectedLabel := range tt.groupLabels {
						_, exists := groupLabels[model.LabelName(expectedLabel)]
						assert.True(t, exists, "Expected stored label %s to be present in group labels", expectedLabel)
					}
				}
			}
		})
	}
}

func TestProvider_SetGroupLabels_VerifyIsolatedStorage(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	// Set different labels for different org/rule combinations
	err = provider.SetGroupLabels("org1", "rule1", []string{"label_org1_rule1"})
	require.NoError(t, err)

	err = provider.SetGroupLabels("org1", "rule2", []string{"label_org1_rule2"})
	require.NoError(t, err)

	err = provider.SetGroupLabels("org2", "rule1", []string{"label_org2_rule1"})
	require.NoError(t, err)

	// Test that each org/rule combination retrieves only its own labels
	testCases := []struct {
		orgID            string
		ruleID           string
		expectedLabel    string
		unexpectedLabels []string
	}{
		{
			orgID:            "org1",
			ruleID:           "rule1",
			expectedLabel:    "label_org1_rule1",
			unexpectedLabels: []string{"label_org1_rule2", "label_org2_rule1"},
		},
		{
			orgID:            "org1",
			ruleID:           "rule2",
			expectedLabel:    "label_org1_rule2",
			unexpectedLabels: []string{"label_org1_rule1", "label_org2_rule1"},
		},
		{
			orgID:            "org2",
			ruleID:           "rule1",
			expectedLabel:    "label_org2_rule1",
			unexpectedLabels: []string{"label_org1_rule1", "label_org1_rule2"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.orgID+"_"+tc.ruleID, func(t *testing.T) {
			alert := &types.Alert{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"ruleId":                          model.LabelValue(tc.ruleID),
						model.LabelName(tc.expectedLabel): "test_value",
						// Add all possible labels to the alert so we can test isolation
						"label_org1_rule1": "test_value",
						"label_org1_rule2": "test_value",
						"label_org2_rule1": "test_value",
					},
				},
			}

			route := &dispatch.Route{
				RouteOpts: dispatch.RouteOpts{
					GroupBy: map[model.LabelName]struct{}{},
				},
			}

			groupLabels := provider.GetGroupLabels(tc.orgID, alert, route)

			// Should have the expected label for this org/rule combination
			_, exists := groupLabels[model.LabelName(tc.expectedLabel)]
			assert.True(t, exists, "Expected label %s to be present for %s/%s", tc.expectedLabel, tc.orgID, tc.ruleID)

			// Should NOT have labels from other org/rule combinations
			for _, unexpectedLabel := range tc.unexpectedLabels {
				_, exists := groupLabels[model.LabelName(unexpectedLabel)]
				assert.False(t, exists, "Unexpected label %s should NOT be present for %s/%s", unexpectedLabel, tc.orgID, tc.ruleID)
			}
		})
	}
}

func TestProvider_GetGroupLabels_WithRuleSpecificGrouping(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	// Set up test data
	orgID := "test-org"
	ruleID := "test-rule"
	groupByLabels := []string{"alertname", "severity"}
	err = provider.SetGroupLabels(orgID, ruleID, groupByLabels)
	require.NoError(t, err)

	alert := &types.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"ruleId":    model.LabelValue(ruleID),
				"alertname": "test_alert",
				"severity":  "critical",
				"instance":  "localhost:9090",
			},
		},
	}

	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			GroupBy: map[model.LabelName]struct{}{
				"instance": {},
			},
		},
	}

	groupLabels := provider.GetGroupLabels(orgID, alert, route)
	assert.NotNil(t, groupLabels)

	// Should have rule-specific labels plus fallback labels
	expectedKeys := []string{"alertname", "severity", "instance"}
	for _, key := range expectedKeys {
		_, exists := groupLabels[model.LabelName(key)]
		assert.True(t, exists, "Expected key %s to be present in group labels", key)
	}
}

func TestProvider_GetGroupLabels_FallbackToStandardGrouping(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	alert := &types.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"ruleId":    "non-existent-rule",
				"alertname": "test_alert",
				"severity":  "critical",
				"instance":  "localhost:9090",
			},
		},
	}

	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			GroupBy: map[model.LabelName]struct{}{
				"instance": {},
			},
		},
	}

	groupLabels := provider.GetGroupLabels("different-org", alert, route)
	assert.NotNil(t, groupLabels)

	// Should only have standard grouping labels
	_, instanceExists := groupLabels[model.LabelName("instance")]
	assert.True(t, instanceExists, "Expected instance label from route groupBy")

	_, alertnameExists := groupLabels[model.LabelName("alertname")]
	assert.False(t, alertnameExists, "Should not have alertname since it's not in route groupBy")
}

func TestProvider_GetGroupLabels_NoRuleId(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	alert := &types.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"alertname": "test_alert",
				"severity":  "critical",
				"instance":  "localhost:9090",
			},
		},
	}

	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			GroupBy: map[model.LabelName]struct{}{
				"instance": {},
				"severity": {},
			},
		},
	}

	groupLabels := provider.GetGroupLabels("test-org", alert, route)
	assert.NotNil(t, groupLabels)

	// Should have standard grouping labels only
	expectedKeys := []string{"instance", "severity"}
	for _, key := range expectedKeys {
		_, exists := groupLabels[model.LabelName(key)]
		assert.True(t, exists, "Expected key %s from route groupBy", key)
	}

	_, alertnameExists := groupLabels[model.LabelName("alertname")]
	assert.False(t, alertnameExists, "Should not have alertname since it's not in route groupBy")
}

func TestProvider_GetGroupLabels_PartialLabelMatch(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	orgID := "test-org"
	ruleID := "test-rule"
	groupByLabels := []string{"alertname", "severity", "missing_label"}
	err = provider.SetGroupLabels(orgID, ruleID, groupByLabels)
	require.NoError(t, err)

	alert := &types.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"ruleId":    model.LabelValue(ruleID),
				"alertname": "test_alert",
				"instance":  "localhost:9090",
				// Note: missing "severity" and "missing_label"
			},
		},
	}

	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			GroupBy: map[model.LabelName]struct{}{
				"instance": {},
			},
		},
	}

	groupLabels := provider.GetGroupLabels(orgID, alert, route)
	assert.NotNil(t, groupLabels)

	// Should have alertname and instance, but not severity or missing_label
	_, alertnameExists := groupLabels[model.LabelName("alertname")]
	assert.True(t, alertnameExists, "Expected alertname from rule groupBy")

	_, instanceExists := groupLabels[model.LabelName("instance")]
	assert.True(t, instanceExists, "Expected instance from route groupBy")

	_, severityExists := groupLabels[model.LabelName("severity")]
	assert.False(t, severityExists, "Should not have severity since it's not in alert labels")

	_, missingExists := groupLabels[model.LabelName("missing_label")]
	assert.False(t, missingExists, "Should not have missing_label since it's not in alert labels")
}

func TestGetRuleIDFromRoute(t *testing.T) {
	tests := []struct {
		name     string
		alert    *types.Alert
		expected string
	}{
		{
			name: "alert with ruleId label",
			alert: &types.Alert{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"ruleId":    "test-rule-123",
						"alertname": "test_alert",
					},
				},
			},
			expected: "test-rule-123",
		},
		{
			name: "alert without ruleId label",
			alert: &types.Alert{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"alertname": "test_alert",
						"severity":  "critical",
					},
				},
			},
			expected: "",
		},
		{
			name: "alert with empty ruleId",
			alert: &types.Alert{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"ruleId":    "",
						"alertname": "test_alert",
					},
				},
			},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getRuleIDFromRoute(tt.alert)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestProvider_ConcurrentAccess(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	var wg sync.WaitGroup

	// Writer goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < 50; i++ {
			err := provider.SetGroupLabels("org1", "rule1", []string{"label1", "label2"})
			assert.NoError(t, err)
		}
	}()

	// Reader goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		alert := &types.Alert{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"ruleId": "rule1",
					"label1": "value1",
					"label2": "value2",
				},
			},
		}
		route := &dispatch.Route{
			RouteOpts: dispatch.RouteOpts{
				GroupBy: map[model.LabelName]struct{}{},
			},
		}

		for i := 0; i < 50; i++ {
			groupLabels := provider.GetGroupLabels("org1", alert, route)
			assert.NotNil(t, groupLabels)
		}
	}()

	// Wait for both goroutines to complete
	wg.Wait()
}

func TestProvider_MultipleOrgsAndRules(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := notificationgrouping.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	// Set up multiple orgs and rules
	err = provider.SetGroupLabels("org1", "rule1", []string{"alertname"})
	require.NoError(t, err)

	err = provider.SetGroupLabels("org1", "rule2", []string{"severity"})
	require.NoError(t, err)

	err = provider.SetGroupLabels("org2", "rule1", []string{"instance"})
	require.NoError(t, err)

	tests := []struct {
		name          string
		orgID         string
		ruleID        string
		expectedLabel string
	}{
		{
			name:          "org1 rule1",
			orgID:         "org1",
			ruleID:        "rule1",
			expectedLabel: "alertname",
		},
		{
			name:          "org1 rule2",
			orgID:         "org1",
			ruleID:        "rule2",
			expectedLabel: "severity",
		},
		{
			name:          "org2 rule1",
			orgID:         "org2",
			ruleID:        "rule1",
			expectedLabel: "instance",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			alert := &types.Alert{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"ruleId":    model.LabelValue(tt.ruleID),
						"alertname": "test_alert",
						"severity":  "critical",
						"instance":  "localhost:9090",
					},
				},
			}
			route := &dispatch.Route{
				RouteOpts: dispatch.RouteOpts{
					GroupBy: map[model.LabelName]struct{}{},
				},
			}

			groupLabels := provider.GetGroupLabels(tt.orgID, alert, route)

			// Should have the expected label from rule-specific grouping
			_, exists := groupLabels[model.LabelName(tt.expectedLabel)]
			assert.True(t, exists, "Expected label %s to be present", tt.expectedLabel)
		})
	}
}
