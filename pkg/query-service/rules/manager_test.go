package rules

import (
	"context"
	"fmt"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfroutingstore/nfroutingstoretest"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/rulebasednotification"
	"github.com/prometheus/common/model"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/ruler/rulestore/rulestoretest"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sharder/noopsharder"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestManager_PatchRule_PayloadVariations(t *testing.T) {
	// Set up test claims and manager once for all test cases
	claims := &authtypes.Claims{
		UserID: "550e8400-e29b-41d4-a716-446655440000",
		Email:  "test@example.com",
		Role:   "admin",
	}
	manager, mockSQLRuleStore, mockRouteStore, nfmanager, orgId := setupTestManager(t)
	claims.OrgID = orgId

	testCases := []struct {
		name           string
		originalData   string
		patchData      string
		Route          []*alertmanagertypes.RoutePolicy
		Config         *alertmanagertypes.NotificationConfig
		expectedResult func(*ruletypes.GettableRule) bool
		expectError    bool
		description    string
	}{
		{
			name: "patch complete rule with task sync validation",
			Route: []*alertmanagertypes.RoutePolicy{
				{
					Expression:     fmt.Sprintf("ruleId == \"{{.ruleId}}\" && threshold.name == \"warning\""),
					ExpressionKind: alertmanagertypes.RuleBasedExpression,
					Channels:       []string{"test-alerts"},
					Name:           "{{.ruleId}}",
					Enabled:        true,
				},
			},
			Config: &alertmanagertypes.NotificationConfig{
				NotificationGroup: map[model.LabelName]struct{}{model.LabelName("ruleId"): {}},
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 4 * time.Hour,
					NoDataInterval:   4 * time.Hour,
				},
				UsePolicy: false,
			},
			originalData: `{
				"schemaVersion":"v1",
				"alert": "test-original-alert",
				"alertType": "METRIC_BASED_ALERT",
				"ruleType": "threshold_rule",
				"evalWindow": "5m0s",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"panelType": "graph",
						"queries": [
							{
								"type": "builder_query",
								"spec": {
									"name": "A",
									"signal": "metrics",
									"disabled": false,
									"aggregations": [
										{
											"metricName": "container.cpu.time",
											"timeAggregation": "rate",
											"spaceAggregation": "sum"
										}
									]
								}
							}
						]
					}
				},
				"labels": {
					"severity": "warning"
				},
				"disabled": false,
				"preferredChannels": ["test-alerts"]
			}`,
			patchData: `{
				"alert": "test-patched-alert",
				"labels": {
					"severity": "critical"
				}
			}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.AlertName == "test-patched-alert" &&
					result.Labels["severity"] == "critical" &&
					result.Disabled == false
			},
			expectError: false,
		},
		{
			name: "patch rule to disabled state",
			Route: []*alertmanagertypes.RoutePolicy{
				{
					Expression:     fmt.Sprintf("ruleId == \"{{.ruleId}}\" && threshold.name == \"warning\""),
					ExpressionKind: alertmanagertypes.RuleBasedExpression,
					Channels:       []string{"test-alerts"},
					Name:           "{{.ruleId}}",
					Enabled:        true,
				},
			},
			Config: &alertmanagertypes.NotificationConfig{
				NotificationGroup: map[model.LabelName]struct{}{model.LabelName("ruleId"): {}},
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 4 * time.Hour,
					NoDataInterval:   4 * time.Hour,
				},
				UsePolicy: false,
			},
			originalData: `{
				"schemaVersion":"v2",
				"alert": "test-disable-alert",
				"alertType": "METRIC_BASED_ALERT",
				"ruleType": "threshold_rule",
				"evalWindow": "5m0s",
				"condition": {
					"thresholds": {
						"kind": "basic",
						"spec": [
							{
								"name": "WARNING",
								"target": 30,
								"matchType": "1",
								"op": "1",
								"selectedQuery": "A",
								"channels": ["test-alerts"]
							}
						]
					},
					"compositeQuery": {
						"queryType": "builder",
						"panelType": "graph",
						"queries": [
							{
								"type": "builder_query",
								"spec": {
									"name": "A",
									"signal": "metrics",
									"disabled": false,
									"aggregations": [
										{
											"metricName": "container.memory.usage",
											"timeAggregation": "avg",
											"spaceAggregation": "sum"
										}
									]
								}
							}
						]
					}
				},
				"evaluation": {
					"kind": "rolling",
					"spec": {
						"evalWindow": "5m",
						"frequency": "1m"
					}
				},
				"labels": {
					"severity": "warning"
				},
				"disabled": false,
				"preferredChannels": ["test-alerts"]
			}`,
			patchData: `{
				"disabled": true
			}`,
			expectedResult: func(result *ruletypes.GettableRule) bool {
				return result.Disabled == true
			},
			expectError: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ruleID := valuer.GenerateUUID()
			existingRule := &ruletypes.Rule{
				Identifiable: types.Identifiable{
					ID: ruleID,
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				UserAuditable: types.UserAuditable{
					CreatedBy: "creator@example.com",
					UpdatedBy: "creator@example.com",
				},
				Data:  tc.originalData,
				OrgID: claims.OrgID,
			}

			// Update route expectations with actual rule ID
			routesWithRuleID := make([]*alertmanagertypes.RoutePolicy, len(tc.Route))
			for i, route := range tc.Route {
				routesWithRuleID[i] = &alertmanagertypes.RoutePolicy{
					Expression:     strings.Replace(route.Expression, "{{.ruleId}}", ruleID.String(), -1),
					ExpressionKind: route.ExpressionKind,
					Channels:       route.Channels,
					Name:           strings.Replace(route.Name, "{{.ruleId}}", ruleID.String(), -1),
					Enabled:        route.Enabled,
				}
			}

			mockRouteStore.ExpectDeleteRouteByName(existingRule.OrgID, ruleID.String())
			mockRouteStore.ExpectCreateBatch(routesWithRuleID)
			mockSQLRuleStore.ExpectGetStoredRule(ruleID, existingRule)
			mockSQLRuleStore.ExpectEditRule(existingRule)

			ctx := authtypes.NewContextWithClaims(context.Background(), *claims)
			result, err := manager.PatchRule(ctx, tc.patchData, ruleID)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, ruleID.StringValue(), result.Id)

			if tc.expectedResult != nil {
				assert.True(t, tc.expectedResult(result), "Expected result validation failed")
			}
			taskName := prepareTaskName(result.Id)

			if result.Disabled {
				syncCompleted := waitForTaskSync(manager, taskName, false, 2*time.Second)
				assert.True(t, syncCompleted, "Task synchronization should complete within timeout")
				assert.Nil(t, findTaskByName(manager.RuleTasks(), taskName), "Task should be removed for disabled rule")
			} else {
				syncCompleted := waitForTaskSync(manager, taskName, true, 2*time.Second)

				// Verify notification config
				config, err := nfmanager.GetNotificationConfig(orgId, result.Id)
				assert.NoError(t, err)
				assert.Equal(t, tc.Config, config)

				assert.True(t, syncCompleted, "Task synchronization should complete within timeout")
				assert.NotNil(t, findTaskByName(manager.RuleTasks(), taskName), "Task should be created/updated for enabled rule")
				assert.Greater(t, len(manager.Rules()), 0, "Rules should be updated in manager")
			}

			assert.NoError(t, mockSQLRuleStore.AssertExpectations())
		})
	}
}

func waitForTaskSync(manager *Manager, taskName string, expectedExists bool, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		task := findTaskByName(manager.RuleTasks(), taskName)
		exists := task != nil

		if exists == expectedExists {
			return true
		}
		time.Sleep(10 * time.Millisecond)
	}
	return false
}

// findTaskByName finds a task by name in the slice of tasks
func findTaskByName(tasks []Task, taskName string) Task {
	for i := 0; i < len(tasks); i++ {
		if tasks[i].Name() == taskName {
			return tasks[i]
		}
	}
	return nil
}

func setupTestManager(t *testing.T) (*Manager, *rulestoretest.MockSQLRuleStore, *nfroutingstoretest.MockSQLRouteStore, nfmanager.NotificationManager, string) {
	settings := instrumentationtest.New().ToProviderSettings()
	testDB := utils.NewQueryServiceDBForTests(t)

	err := utils.CreateTestOrg(t, testDB)
	if err != nil {
		t.Fatalf("Failed to create test org: %v", err)
	}
	testOrgID, err := utils.GetTestOrgId(testDB)
	if err != nil {
		t.Fatalf("Failed to get test org ID: %v", err)
	}

	//will replace this with alertmanager mock
	newConfig := alertmanagerserver.NewConfig()
	defaultConfig, err := alertmanagertypes.NewDefaultConfig(newConfig.Global, newConfig.Route, testOrgID.StringValue())
	if err != nil {
		t.Fatalf("Failed to create default alertmanager config: %v", err)
	}

	_, err = testDB.BunDB().NewInsert().
		Model(defaultConfig.StoreableConfig()).
		Exec(context.Background())
	if err != nil {
		t.Fatalf("Failed to insert alertmanager config: %v", err)
	}

	noopSharder, err := noopsharder.New(context.TODO(), settings, sharder.Config{})
	if err != nil {
		t.Fatalf("Failed to create noop sharder: %v", err)
	}
	orgGetter := implorganization.NewGetter(implorganization.NewStore(testDB), noopSharder)
	routeStore := nfroutingstoretest.NewMockSQLRouteStore()
	notificationManager, err := rulebasednotification.New(t.Context(), settings, nfmanager.Config{}, routeStore)
	if err != nil {
		t.Fatalf("Failed to create alert manager: %v", err)
	}
	alertManager, err := signozalertmanager.New(context.TODO(), settings, alertmanager.Config{Provider: "signoz", Signoz: alertmanager.Signoz{PollInterval: 10 * time.Second, Config: alertmanagerserver.NewConfig()}}, testDB, orgGetter, notificationManager)
	if err != nil {
		t.Fatalf("Failed to create alert manager: %v", err)
	}
	mockSQLRuleStore := rulestoretest.NewMockSQLRuleStore()

	options := ManagerOptions{
		Context:         context.Background(),
		Logger:          zap.L(),
		SLogger:         instrumentationtest.New().Logger(),
		EvalDelay:       time.Minute,
		PrepareTaskFunc: defaultPrepareTaskFunc,
		Alertmanager:    alertManager,
		OrgGetter:       orgGetter,
		RuleStore:       mockSQLRuleStore,
	}

	manager, err := NewManager(&options)
	if err != nil {
		t.Fatalf("Failed to create manager: %v", err)
	}

	close(manager.block)
	return manager, mockSQLRuleStore, routeStore, notificationManager, testOrgID.StringValue()
}

func TestCreateRule(t *testing.T) {
	claims := &authtypes.Claims{
		Email: "test@example.com",
	}
	manager, mockSQLRuleStore, mockRouteStore, nfmanager, orgId := setupTestManager(t)
	claims.OrgID = orgId
	testCases := []struct {
		name    string
		Route   []*alertmanagertypes.RoutePolicy
		Config  *alertmanagertypes.NotificationConfig
		ruleStr string
	}{
		{
			name: "validate stored rule data structure",
			Route: []*alertmanagertypes.RoutePolicy{
				{
					Expression:     fmt.Sprintf("ruleId == \"{{.ruleId}}\" && threshold.name == \"warning\""),
					ExpressionKind: alertmanagertypes.RuleBasedExpression,
					Channels:       []string{"test-alerts"},
					Name:           "{{.ruleId}}",
					Enabled:        true,
				},
			},
			Config: &alertmanagertypes.NotificationConfig{
				NotificationGroup: map[model.LabelName]struct{}{model.LabelName("ruleId"): {}},
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 4 * time.Hour,
					NoDataInterval:   4 * time.Hour,
				},
				UsePolicy: false,
			},
			ruleStr: `{
				"alert": "cpu usage",
				"ruleType": "threshold_rule",
				"evalWindow": "5m",
				"frequency": "1m",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"expression": "A",
								"disabled": false,
								"dataSource": "metrics",
								"aggregateOperator": "avg",
								"aggregateAttribute": {
									"key": "cpu_usage",
									"type": "Gauge"
								}
							}
						}
					},
					"op": "1",
					"target": 80,
					"matchType": "1"
				},
				"labels": {
					"severity": "warning"
				},
				"annotations": {
					"summary": "High CPU usage detected"
				},
				"preferredChannels": ["test-alerts"]
			}`,
		},
		{
			name: "create complete v2 rule with thresholds",
			Route: []*alertmanagertypes.RoutePolicy{
				{
					Expression:     fmt.Sprintf("ruleId == \"{{.ruleId}}\" && threshold.name == \"critical\""),
					ExpressionKind: alertmanagertypes.RuleBasedExpression,
					Channels:       []string{"test-alerts"},
					Name:           "{{.ruleId}}",
					Enabled:        true,
				},
				{
					Expression:     fmt.Sprintf("ruleId == \"{{.ruleId}}\" && threshold.name == \"warning\""),
					ExpressionKind: alertmanagertypes.RuleBasedExpression,
					Channels:       []string{"test-alerts"},
					Name:           "{{.ruleId}}",
					Enabled:        true,
				},
			},
			Config: &alertmanagertypes.NotificationConfig{
				NotificationGroup: map[model.LabelName]struct{}{model.LabelName("k8s.node.name"): {}, model.LabelName("ruleId"): {}},
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 10 * time.Minute,
					NoDataInterval:   4 * time.Hour,
				},
				UsePolicy: false,
			},
			ruleStr: `{
				"schemaVersion":"v2",
				"state": "firing",
				"alert": "test-multi-threshold-create",
				"alertType": "METRIC_BASED_ALERT",
				"ruleType": "threshold_rule",
				"evalWindow": "5m0s",
				"condition": {
					"thresholds": {
						"kind": "basic",
						"spec": [
							{
								"name": "CRITICAL",
								"target": 0,
								"matchType": "1",
								"op": "1",
								"selectedQuery": "A",
								"channels": ["test-alerts"]
							},
							{
								"name": "WARNING",
								"target": 0,
								"matchType": "1",
								"op": "1",
								"selectedQuery": "A",
								"channels": ["test-alerts"]
							}
						]
					},
					"compositeQuery": {
						"queryType": "builder",
						"panelType": "graph",
						"queries": [
							{
								"type": "builder_query",
								"spec": {
									"name": "A",
									"signal": "metrics",
									"disabled": false,
									"aggregations": [
										{
											"metricName": "container.cpu.time",
											"timeAggregation": "rate",
											"spaceAggregation": "sum"
										}
									]
								}
							}
						]
					}
				},
				"evaluation": {
					"kind": "rolling",
					"spec": {
						"evalWindow": "6m",
						"frequency": "1m"
					}
				},
				"notificationSettings": {
                    "GroupBy": [
                         "k8s.node.name"
                    ],
                    "renotify": {
						"interval":	"10m",
						"enabled":	true,
                    	"alertStates": [
                        	"firing"
                    	]
					}
                },
				"labels": {
					"severity": "warning"
				},
				"annotations": {
					"description": "This alert is fired when the defined metric crosses the threshold",
					"summary": "The rule threshold is set and the observed metric value is evaluated"
				},
				"disabled": false,
				"preferredChannels": ["#test-alerts-v2"],
				"version": "v5"
			}`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rule := &ruletypes.Rule{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				UserAuditable: types.UserAuditable{
					CreatedBy: claims.Email,
					UpdatedBy: claims.Email,
				},
				OrgID: claims.OrgID,
			}

			// Update route expectations with actual rule ID
			routesWithRuleID := make([]*alertmanagertypes.RoutePolicy, len(tc.Route))
			for i, route := range tc.Route {
				routesWithRuleID[i] = &alertmanagertypes.RoutePolicy{
					Expression:     strings.Replace(route.Expression, "{{.ruleId}}", rule.ID.String(), -1),
					ExpressionKind: route.ExpressionKind,
					Channels:       route.Channels,
					Name:           strings.Replace(route.Name, "{{.ruleId}}", rule.ID.String(), -1),
					Enabled:        route.Enabled,
				}
			}

			mockRouteStore.ExpectCreateBatch(routesWithRuleID)
			mockSQLRuleStore.ExpectCreateRule(rule)

			ctx := authtypes.NewContextWithClaims(context.Background(), *claims)
			result, err := manager.CreateRule(ctx, tc.ruleStr)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.NotEmpty(t, result.Id, "Result should have a valid ID")

			// Wait for task creation with proper synchronization
			taskName := prepareTaskName(result.Id)
			syncCompleted := waitForTaskSync(manager, taskName, true, 2*time.Second)

			// Verify notification config
			config, err := nfmanager.GetNotificationConfig(orgId, result.Id)
			assert.NoError(t, err)
			assert.Equal(t, tc.Config, config)

			assert.True(t, syncCompleted, "Task creation should complete within timeout")
			assert.NotNil(t, findTaskByName(manager.RuleTasks(), taskName), "Task should be created with correct name")
			assert.Greater(t, len(manager.Rules()), 0, "Rules should be added to manager")

			assert.NoError(t, mockSQLRuleStore.AssertExpectations())
		})
	}
}

func TestEditRule(t *testing.T) {
	// Set up test claims and manager once for all test cases
	claims := &authtypes.Claims{
		Email: "test@example.com",
	}
	manager, mockSQLRuleStore, mockRouteStore, nfmanager, orgId := setupTestManager(t)
	claims.OrgID = orgId
	testCases := []struct {
		ruleID  string
		name    string
		Route   []*alertmanagertypes.RoutePolicy
		Config  *alertmanagertypes.NotificationConfig
		ruleStr string
	}{
		{
			ruleID: "12345678-1234-1234-1234-123456789012",
			name:   "validate edit rule functionality",
			Route: []*alertmanagertypes.RoutePolicy{
				{
					Expression:     fmt.Sprintf("ruleId == \"rule1\" && threshold.name == \"critical\""),
					ExpressionKind: alertmanagertypes.RuleBasedExpression,
					Channels:       []string{"critical-alerts"},
					Name:           "12345678-1234-1234-1234-123456789012",
					Enabled:        true,
				},
			},
			Config: &alertmanagertypes.NotificationConfig{
				NotificationGroup: map[model.LabelName]struct{}{model.LabelName("ruleId"): {}},
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 4 * time.Hour,
					NoDataInterval:   4 * time.Hour,
				},
				UsePolicy: false,
			},
			ruleStr: `{
				"alert": "updated cpu usage",
				"ruleType": "threshold_rule",
				"evalWindow": "10m",
				"frequency": "2m",
				"condition": {
					"compositeQuery": {
						"queryType": "builder",
						"builderQueries": {
							"A": {
								"expression": "A",
								"disabled": false,
								"dataSource": "metrics",
								"aggregateOperator": "avg",
								"aggregateAttribute": {
									"key": "cpu_usage",
									"type": "Gauge"
								}
							}
						}
					},
					"op": "1",
					"target": 90,
					"matchType": "1"
				},
				"labels": {
					"severity": "critical"
				},
				"annotations": {
					"summary": "Very high CPU usage detected"
				},
				"preferredChannels": ["critical-alerts"]
			}`,
		},
		{
			ruleID: "12345678-1234-1234-1234-123456789013",
			name:   "edit complete v2 rule with thresholds",
			Route: []*alertmanagertypes.RoutePolicy{
				{
					Expression:     fmt.Sprintf("ruleId == \"rule2\" && threshold.name == \"critical\""),
					ExpressionKind: alertmanagertypes.RuleBasedExpression,
					Channels:       []string{"test-alerts"},
					Name:           "12345678-1234-1234-1234-123456789013",
					Enabled:        true,
				},
				{
					Expression:     fmt.Sprintf("ruleId == \"rule2\" && threshold.name == \"warning\""),
					ExpressionKind: alertmanagertypes.RuleBasedExpression,
					Channels:       []string{"test-alerts"},
					Name:           "12345678-1234-1234-1234-123456789013",
					Enabled:        true,
				},
			},
			Config: &alertmanagertypes.NotificationConfig{
				NotificationGroup: map[model.LabelName]struct{}{model.LabelName("ruleId"): {}, model.LabelName("k8s.node.name"): {}},
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 10 * time.Minute,
					NoDataInterval:   4 * time.Hour,
				},
				UsePolicy: false,
			},
			ruleStr: `{
				"schemaVersion":"v2",
				"state": "firing",
				"alert": "test-multi-threshold-edit",
				"alertType": "METRIC_BASED_ALERT",
				"ruleType": "threshold_rule",
				"evalWindow": "5m0s",
				"condition": {
					"thresholds": {
						"kind": "basic",
						"spec": [
							{
								"name": "CRITICAL",
								"target": 10,
								"matchType": "1",
								"op": "1",
								"selectedQuery": "A",
								"channels": ["test-alerts"]
							},
							{
								"name": "WARNING",
								"target": 5,
								"matchType": "1",
								"op": "1",
								"selectedQuery": "A",
								"channels": ["test-alerts"]
							}
						]
					},
					"compositeQuery": {
						"queryType": "builder",
						"panelType": "graph",
						"queries": [
							{
								"type": "builder_query",
								"spec": {
									"name": "A",
									"signal": "metrics",
									"disabled": false,
									"aggregations": [
										{
											"metricName": "container.memory.usage",
											"timeAggregation": "avg",
											"spaceAggregation": "sum"
										}
									]
								}
							}
						]
					}
				},
				"evaluation": {
					"kind": "rolling",
					"spec": {
						"evalWindow": "8m",
						"frequency": "2m"
					}
				},
				"labels": {
					"severity": "critical"
				},
				"notificationSettings": {
                    "GroupBy": [
                         "k8s.node.name"
                    ],
                    "renotify": {
						"interval":	"10m",
						"enabled":	true,
                    	"alertStates": [
                        	"firing"
                    	]
					}
                },
				"annotations": {
					"description": "This alert is fired when memory usage crosses the threshold",
					"summary": "Memory usage threshold exceeded"
				},
				"disabled": false,
				"preferredChannels": ["#critical-alerts-v2"],
				"version": "v5"
			}`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ruleId, err := valuer.NewUUID(tc.ruleID)
			if err != nil {
				t.Errorf("error creating ruleId: %s", err)
			}
			existingRule := &ruletypes.Rule{
				Identifiable: types.Identifiable{
					ID: ruleId,
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				UserAuditable: types.UserAuditable{
					CreatedBy: "creator@example.com",
					UpdatedBy: "creator@example.com",
				},
				Data:  `{"alert": "original cpu usage", "disabled": false}`,
				OrgID: claims.OrgID,
			}
			mockRouteStore.ExpectDeleteRouteByName(existingRule.OrgID, ruleId.String())
			mockRouteStore.ExpectCreateBatch(tc.Route)
			mockSQLRuleStore.ExpectGetStoredRule(ruleId, existingRule)
			mockSQLRuleStore.ExpectEditRule(existingRule)

			ctx := authtypes.NewContextWithClaims(context.Background(), *claims)
			err = manager.EditRule(ctx, tc.ruleStr, ruleId)

			assert.NoError(t, err)

			// Wait for task update with proper synchronization

			taskName := prepareTaskName(ruleId.String())
			syncCompleted := waitForTaskSync(manager, taskName, true, 2*time.Second)

			config, err := nfmanager.GetNotificationConfig(orgId, ruleId.String())
			assert.NoError(t, err)
			assert.Equal(t, tc.Config, config)
			assert.True(t, syncCompleted, "Task update should complete within timeout")
			assert.NotNil(t, findTaskByName(manager.RuleTasks(), taskName), "Task should be updated with correct name")
			assert.Greater(t, len(manager.Rules()), 0, "Rules should be updated in manager")

			assert.NoError(t, mockSQLRuleStore.AssertExpectations())
		})
	}
}
