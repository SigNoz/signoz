package rules

import (
	"context"
	"testing"
	"time"

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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestManager_PatchRule_PayloadVariations(t *testing.T) {
	testCases := []struct {
		name           string
		originalData   string
		patchData      string
		expectedResult func(*ruletypes.GettableRule) bool
		expectError    bool
		description    string
	}{
		{
			name: "patch complete rule with task sync validation",
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
			mockRuleStore := &rulestoretest.MockRuleStore{}
			claims := &authtypes.Claims{
				UserID: "550e8400-e29b-41d4-a716-446655440000",
				Email:  "test@example.com",
				Role:   "admin",
			}

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
				Data: tc.originalData,
			}

			mockRuleStore.On("GetStoredRule", mock.Anything, ruleID).Return(existingRule, nil)
			mockRuleStore.On("EditRule", mock.Anything, mock.AnythingOfType("*ruletypes.Rule"), mock.AnythingOfType("func(context.Context) error")).Return(nil)

			manager, _ := setupTestManager(t, mockRuleStore, claims)

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
				assert.NotContains(t, manager.tasks, taskName, "Task should be removed for disabled rule")
			} else {
				syncCompleted := waitForTaskSync(manager, taskName, true, 2*time.Second)
				assert.True(t, syncCompleted, "Task synchronization should complete within timeout")
				assert.Contains(t, manager.tasks, taskName, "Task should be created/updated for enabled rule")
				assert.NotNil(t, manager.tasks[taskName], "Task should not be nil")
				assert.Greater(t, len(manager.rules), 0, "Rules should be updated in manager")
			}

			mockRuleStore.AssertExpectations(t)
		})
	}
}

func waitForTaskSync(manager *Manager, taskName string, expectedExists bool, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		manager.mtx.RLock()
		_, exists := manager.tasks[taskName]
		manager.mtx.RUnlock()

		if exists == expectedExists {
			return true
		}
		time.Sleep(10 * time.Millisecond)
	}
	return false
}

func setupTestManager(t *testing.T, mockRuleStore *rulestoretest.MockRuleStore, claims *authtypes.Claims) (*Manager, string) {
	settings := instrumentationtest.New().ToProviderSettings()
	testDB := utils.NewQueryServiceDBForTests(t)

	err := utils.CreateTestOrg(t, testDB)
	if err != nil {
		t.Fatalf("Failed to create test org: %v", err)
	}

	realOrgID, err := utils.GetTestOrgId(testDB)
	if err != nil {
		t.Fatalf("Failed to get test org ID: %v", err)
	}

	claims.OrgID = realOrgID.StringValue()
	newConfig := alertmanagerserver.NewConfig()
	defaultConfig, err := alertmanagertypes.NewDefaultConfig(newConfig.Global, newConfig.Route, realOrgID.StringValue())
	if err != nil {
		t.Fatalf("Failed to create default alertmanager config: %v", err)
	}

	_, err = testDB.BunDB().NewInsert().
		Model(defaultConfig.StoreableConfig()).
		Exec(context.Background())
	if err != nil {
		t.Fatalf("Failed to insert alertmanager config: %v", err)
	}

	noopSharder, _ := noopsharder.New(context.TODO(), settings, sharder.Config{})
	orgGetter := implorganization.NewGetter(implorganization.NewStore(testDB), noopSharder)
	alertManager, _ := signozalertmanager.New(context.TODO(), settings, alertmanager.Config{Provider: "signoz", Signoz: alertmanager.Signoz{PollInterval: 10 * time.Second, Config: alertmanagerserver.NewConfig()}}, testDB, orgGetter)

	manager := &Manager{
		ruleStore:       mockRuleStore,
		tasks:           make(map[string]Task),
		rules:           make(map[string]Rule),
		alertmanager:    alertManager,
		block:           make(chan struct{}),
		sqlstore:        testDB,
		prepareTaskFunc: defaultPrepareTaskFunc,
		opts: &ManagerOptions{
			SLogger: instrumentationtest.New().Logger(),
		},
		orgGetter: orgGetter,
	}

	close(manager.block)
	return manager, claims.OrgID
}

func TestCreateRule(t *testing.T) {
	testCases := []struct {
		name    string
		ruleStr string
		claims  *authtypes.Claims
	}{
		{
			name: "validate stored rule data structure",
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
			claims: &authtypes.Claims{
				Email: "test@example.com",
			},
		},
		{
			name: "create complete v2 rule with thresholds",
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
			claims: &authtypes.Claims{
				Email: "test@example.com",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockRuleStore := &rulestoretest.MockRuleStore{}
			var callbackExecuted bool
			mockRuleID := valuer.GenerateUUID()

			mockRuleStore.On("CreateRule", mock.Anything, mock.AnythingOfType("*ruletypes.Rule"), mock.AnythingOfType("func(context.Context, valuer.UUID) error")).Return(mockRuleID, nil).Run(func(args mock.Arguments) {
				callback := args.Get(2).(func(context.Context, valuer.UUID) error)
				err := callback(context.Background(), mockRuleID)
				if err == nil {
					callbackExecuted = true
				}
			})

			manager, _ := setupTestManager(t, mockRuleStore, tc.claims)

			ctx := authtypes.NewContextWithClaims(context.Background(), *tc.claims)
			result, err := manager.CreateRule(ctx, tc.ruleStr)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, mockRuleID.StringValue(), result.Id)

			assert.True(t, callbackExecuted, "Callback should have been executed successfully")

			// Wait for task creation with proper synchronization
			taskName := prepareTaskName(result.Id)
			syncCompleted := waitForTaskSync(manager, taskName, true, 2*time.Second)
			assert.True(t, syncCompleted, "Task creation should complete within timeout")
			assert.Contains(t, manager.tasks, taskName, "Task should be created with correct name")
			assert.NotNil(t, manager.tasks[taskName], "Created task should not be nil")
			assert.Greater(t, len(manager.rules), 0, "Rules should be added to manager")

			mockRuleStore.AssertExpectations(t)
		})
	}
}

func TestEditRule(t *testing.T) {
	testCases := []struct {
		name    string
		ruleStr string
		claims  *authtypes.Claims
	}{
		{
			name: "validate edit rule functionality",
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
			claims: &authtypes.Claims{
				OrgID: "550e8400-e29b-41d4-a716-446655440001",
				Email: "test@example.com",
			},
		},
		{
			name: "edit complete v2 rule with thresholds",
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
				"annotations": {
					"description": "This alert is fired when memory usage crosses the threshold",
					"summary": "Memory usage threshold exceeded"
				},
				"disabled": false,
				"preferredChannels": ["#critical-alerts-v2"],
				"version": "v5"
			}`,
			claims: &authtypes.Claims{
				OrgID: "550e8400-e29b-41d4-a716-446655440001",
				Email: "test@example.com",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockRuleStore := &rulestoretest.MockRuleStore{}
			var callbackExecuted bool
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
				Data: `{"alert": "original cpu usage", "disabled": false}`,
			}

			mockRuleStore.On("GetStoredRule", mock.Anything, ruleID).Return(existingRule, nil)
			mockRuleStore.On("EditRule", mock.Anything, mock.AnythingOfType("*ruletypes.Rule"), mock.AnythingOfType("func(context.Context) error")).Return(nil).Run(func(args mock.Arguments) {
				callback := args.Get(2).(func(context.Context) error)
				err := callback(context.Background())
				if err == nil {
					callbackExecuted = true
				}
			})

			manager, _ := setupTestManager(t, mockRuleStore, tc.claims)

			ctx := authtypes.NewContextWithClaims(context.Background(), *tc.claims)
			err := manager.EditRule(ctx, tc.ruleStr, ruleID)

			assert.NoError(t, err)

			assert.True(t, callbackExecuted, "Callback should have been executed successfully")

			// Wait for task update with proper synchronization
			taskName := prepareTaskName(ruleID.StringValue())
			syncCompleted := waitForTaskSync(manager, taskName, true, 2*time.Second)
			assert.True(t, syncCompleted, "Task update should complete within timeout")
			assert.Contains(t, manager.tasks, taskName, "Task should be updated with correct name")
			assert.NotNil(t, manager.tasks[taskName], "Updated task should not be nil")
			assert.Greater(t, len(manager.rules), 0, "Rules should be updated in manager")

			mockRuleStore.AssertExpectations(t)
		})
	}
}
