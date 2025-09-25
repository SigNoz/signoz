package rulebasednotification

import (
	"context"
	"github.com/prometheus/common/model"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type mockRouteStore struct {
	mock.Mock
}

func (m *mockRouteStore) GetByID(ctx context.Context, orgID string, id string) (*alertmanagertypes.ExpressionRoute, error) {
	args := m.Called(ctx, orgID, id)
	return args.Get(0).(*alertmanagertypes.ExpressionRoute), args.Error(1)
}

func (m *mockRouteStore) Create(ctx context.Context, route *alertmanagertypes.ExpressionRoute) error {
	args := m.Called(ctx, route)
	return args.Error(0)
}

func (m *mockRouteStore) CreateBatch(ctx context.Context, routes []*alertmanagertypes.ExpressionRoute) error {
	args := m.Called(ctx, routes)
	return args.Error(0)
}

func (m *mockRouteStore) Delete(ctx context.Context, orgID string, id string) error {
	args := m.Called(ctx, orgID, id)
	return args.Error(0)
}

func (m *mockRouteStore) GetAllByKindAndOrgID(ctx context.Context, orgID string, kind alertmanagertypes.ExpressionKind) ([]*alertmanagertypes.ExpressionRoute, error) {
	args := m.Called(ctx, orgID, kind)
	return args.Get(0).([]*alertmanagertypes.ExpressionRoute), args.Error(1)
}

func (m *mockRouteStore) GetAllByName(ctx context.Context, orgID string, name string) ([]*alertmanagertypes.ExpressionRoute, error) {
	args := m.Called(ctx, orgID, name)
	return args.Get(0).([]*alertmanagertypes.ExpressionRoute), args.Error(1)
}

func (m *mockRouteStore) DeleteRouteByName(ctx context.Context, orgID string, name string) error {
	args := m.Called(ctx, orgID, name)
	return args.Error(0)
}

func createTestProviderSettings() factory.ProviderSettings {
	return instrumentationtest.New().ToProviderSettings()
}

func createTestRouteStore() alertmanagertypes.RouteStore {
	return &mockRouteStore{}
}

func TestNewFactory(t *testing.T) {
	routeStore := createTestRouteStore()
	providerFactory := NewFactory(routeStore)
	assert.NotNil(t, providerFactory)
	assert.Equal(t, "rulebased", providerFactory.Name().String())
}

func TestNew(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	routeStore := createTestRouteStore()
	provider, err := New(ctx, providerSettings, config, routeStore)
	require.NoError(t, err)
	assert.NotNil(t, provider)

	// Verify provider implements the interface correctly
	assert.Implements(t, (*nfmanager.NotificationManager)(nil), provider)
}

func TestProvider_SetNotificationConfig(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	routeStore := createTestRouteStore()
	provider, err := New(ctx, providerSettings, config, routeStore)
	require.NoError(t, err)

	tests := []struct {
		name    string
		orgID   string
		ruleID  string
		config  *alertmanagertypes.NotificationConfig
		wantErr bool
	}{
		{
			name:   "valid parameters",
			orgID:  "org1",
			ruleID: "rule1",
			config: &alertmanagertypes.NotificationConfig{
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 2 * time.Hour,
					NoDataInterval:   2 * time.Hour,
				},
			},
			wantErr: false,
		},
		{
			name:   "empty orgID",
			orgID:  "",
			ruleID: "rule1",
			config: &alertmanagertypes.NotificationConfig{
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: time.Hour,
					NoDataInterval:   time.Hour,
				},
			},
			wantErr: true, // Should error due to validation
		},
		{
			name:   "empty ruleID",
			orgID:  "org1",
			ruleID: "",
			config: &alertmanagertypes.NotificationConfig{
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: time.Hour,
					NoDataInterval:   time.Hour,
				},
			},
			wantErr: true, // Should error due to validation
		},
		{
			name:    "nil config",
			orgID:   "org1",
			ruleID:  "rule1",
			config:  nil,
			wantErr: true, // Should error due to nil config
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := provider.SetNotificationConfig(tt.orgID, tt.ruleID, tt.config)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// If we set a config successfully, we should be able to retrieve it
				if tt.orgID != "" && tt.ruleID != "" && tt.config != nil {
					retrievedConfig, retrieveErr := provider.GetNotificationConfig(tt.orgID, tt.ruleID)
					assert.NoError(t, retrieveErr)
					assert.NotNil(t, retrievedConfig)
					assert.Equal(t, tt.config.Renotify, retrievedConfig.Renotify)
				}
			}
		})
	}
}

func TestProvider_GetNotificationConfig(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	routeStore := createTestRouteStore()
	provider, err := New(ctx, providerSettings, config, routeStore)
	require.NoError(t, err)

	orgID := "test-org"
	ruleID := "rule1"
	customConfig := &alertmanagertypes.NotificationConfig{
		Renotify: alertmanagertypes.ReNotificationConfig{
			RenotifyInterval: 30 * time.Minute,
			NoDataInterval:   30 * time.Minute,
		},
	}

	ruleId1 := "rule-1"
	customConfig1 := &alertmanagertypes.NotificationConfig{
		NotificationGroup: map[model.LabelName]struct{}{
			model.LabelName("group1"): {},
			model.LabelName("group2"): {},
		},
	}

	// Set config for alert1
	err = provider.SetNotificationConfig(orgID, ruleID, customConfig)
	require.NoError(t, err)

	err = provider.SetNotificationConfig(orgID, ruleId1, customConfig1)
	require.NoError(t, err)

	tests := []struct {
		name           string
		orgID          string
		ruleID         string
		alert          *types.Alert
		expectedConfig *alertmanagertypes.NotificationConfig
		shouldFallback bool
	}{
		{
			name:   "existing config",
			orgID:  orgID,
			ruleID: ruleID,
			expectedConfig: &alertmanagertypes.NotificationConfig{
				NotificationGroup: map[model.LabelName]struct{}{
					model.LabelName(ruleID): {},
				},
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 30 * time.Minute,
					NoDataInterval:   30 * time.Minute,
				},
			},
			shouldFallback: false,
		},
		{
			name:   "non-existing config - fallback",
			orgID:  orgID,
			ruleID: ruleId1,
			expectedConfig: &alertmanagertypes.NotificationConfig{
				NotificationGroup: map[model.LabelName]struct{}{
					model.LabelName("group1"): {},
					model.LabelName("group2"): {},
					model.LabelName(ruleID):   {},
				},
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: 4 * time.Hour,
					NoDataInterval:   4 * time.Hour,
				},
			}, // Will get fallback from standardnotification
			shouldFallback: false,
		},
		{
			name:           "empty orgID - fallback",
			orgID:          "",
			ruleID:         ruleID,
			expectedConfig: nil, // Will get fallback
			shouldFallback: true,
		},
		{
			name:           "nil alert - fallback",
			orgID:          orgID,
			ruleID:         "rule3", // Different ruleID to get fallback
			alert:          nil,
			expectedConfig: nil, // Will get fallback
			shouldFallback: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config, err := provider.GetNotificationConfig(tt.orgID, tt.ruleID)
			assert.NoError(t, err)

			if tt.shouldFallback {
				// Should get fallback config (4 hour default)
				assert.NotNil(t, config)
				assert.Equal(t, 4*time.Hour, config.Renotify.RenotifyInterval)
			} else {
				// Should get our custom config
				assert.NotNil(t, config)
				assert.Equal(t, tt.expectedConfig, config)
			}
		})
	}
}

func TestProvider_ConcurrentAccess(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	routeStore := createTestRouteStore()
	provider, err := New(ctx, providerSettings, config, routeStore)
	require.NoError(t, err)

	orgID := "test-org"

	var wg sync.WaitGroup

	// Writer goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < 50; i++ {
			config := &alertmanagertypes.NotificationConfig{
				Renotify: alertmanagertypes.ReNotificationConfig{
					RenotifyInterval: time.Duration(i+1) * time.Minute,
					NoDataInterval:   time.Duration(i+1) * time.Minute,
				},
			}
			err := provider.SetNotificationConfig(orgID, "rule1", config)
			assert.NoError(t, err)
		}
	}()

	// Reader goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < 50; i++ {
			config, err := provider.GetNotificationConfig(orgID, "rule1")
			assert.NoError(t, err)
			assert.NotNil(t, config)
		}
	}()

	// Wait for both goroutines to complete
	wg.Wait()
}

func TestProvider_EvaluateExpression(t *testing.T) {
	provider := &provider{}

	tests := []struct {
		name       string
		expression string
		labelSet   model.LabelSet
		expected   bool
	}{
		{
			name:       "simple equality check - match",
			expression: `threshold.name == 'auth' && ruleId == 'rule1'`,
			labelSet: model.LabelSet{
				"threshold.name": "auth",
				"ruleId":         "rule1",
			},
			expected: true,
		},
		{
			name:       "simple equality check - no match",
			expression: `service == "payment"`,
			labelSet: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			expected: false,
		},
		{
			name:       "multiple conditions with AND - both match",
			expression: `service == "auth" && env == "production"`,
			labelSet: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			expected: true,
		},
		{
			name:       "multiple conditions with AND - one doesn't match",
			expression: `service == "auth" && env == "staging"`,
			labelSet: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			expected: false,
		},
		{
			name:       "multiple conditions with OR - one matches",
			expression: `service == "payment" || env == "production"`,
			labelSet: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			expected: true,
		},
		{
			name:       "multiple conditions with OR - none match",
			expression: `service == "payment" || env == "staging"`,
			labelSet: model.LabelSet{
				"service": "auth",
				"env":     "production",
			},
			expected: false,
		},
		{
			name:       "in operator - value in list",
			expression: `service in ["auth", "payment", "notification"]`,
			labelSet: model.LabelSet{
				"service": "auth",
			},
			expected: true,
		},
		{
			name:       "in operator - value not in list",
			expression: `service in ["payment", "notification"]`,
			labelSet: model.LabelSet{
				"service": "auth",
			},
			expected: false,
		},
		{
			name:       "contains operator - substring match",
			expression: `host contains "prod"`,
			labelSet: model.LabelSet{
				"host": "prod-server-01",
			},
			expected: true,
		},
		{
			name:       "contains operator - no substring match",
			expression: `host contains "staging"`,
			labelSet: model.LabelSet{
				"host": "prod-server-01",
			},
			expected: false,
		},
		{
			name:       "complex expression with parentheses",
			expression: `(service == "auth" && env == "production") || critical == "true"`,
			labelSet: model.LabelSet{
				"service":  "payment",
				"env":      "staging",
				"critical": "true",
			},
			expected: true,
		},
		{
			name:       "missing label key",
			expression: `"missing_key" == "value"`,
			labelSet: model.LabelSet{
				"service": "auth",
			},
			expected: false,
		},
		{
			name:       "rule-based expression with threshold name and ruleId",
			expression: `'threshold.name' == "high-cpu" && ruleId == "rule-123"`,
			labelSet: model.LabelSet{
				"threshold.name": "high-cpu",
				"ruleId":         "rule-123",
				"service":        "auth",
			},
			expected: true,
		},
		{
			name:       "alertname and ruleId combination",
			expression: `alertname == "HighCPUUsage" && ruleId == "cpu-alert-001"`,
			labelSet: model.LabelSet{
				"alertname": "HighCPUUsage",
				"ruleId":    "cpu-alert-001",
				"severity":  "critical",
			},
			expected: true,
		},
		{
			name:       "kubernetes namespace filtering",
			expression: `k8s.namespace.name == "auth" && service in ["auth", "payment"]`,
			labelSet: model.LabelSet{
				"k8s.namespace.name": "auth",
				"service":            "auth",
				"host":               "k8s-node-1",
			},
			expected: true,
		},
		{
			name:       "migration expression format from SQL migration",
			expression: `threshold.name' == "HighCPUUsage" && ruleId == "rule-uuid-123"`,
			labelSet: model.LabelSet{
				"threshold.name": "HighCPUUsage",
				"ruleId":         "rule-uuid-123",
				"severity":       "warning",
			},
			expected: true,
		},
		{
			name:       "invalid expression syntax",
			expression: `service == "auth"`, // missing closing bracket
			labelSet: model.LabelSet{
				"service": "auth",
			},
			expected: false,
		},
		{
			name:       "empty expression",
			expression: ``,
			labelSet: model.LabelSet{
				"service": "auth",
			},
			expected: false,
		},
		{
			name:       "expression with non-boolean result",
			expression: `service`, // returns string, not boolean
			labelSet: model.LabelSet{
				"service": "auth",
			},
			expected: false,
		},
		{
			name:       "case sensitive matching",
			expression: `service == "Auth"`, // capital A
			labelSet: model.LabelSet{
				"service": "auth", // lowercase a
			},
			expected: false,
		},
		{
			name:       "numeric comparison as strings",
			expression: `port == "8080"`,
			labelSet: model.LabelSet{
				"port": "8080",
			},
			expected: true,
		},
		{
			name:       "quoted string with special characters",
			expression: `service == "auth-service-v2"`,
			labelSet: model.LabelSet{
				"service": "auth-service-v2",
			},
			expected: true,
		},
		{
			name:       "boolean operators precedence",
			expression: `service == "auth" && env == "prod" || critical == "true"`,
			labelSet: model.LabelSet{
				"service":  "payment",
				"env":      "staging",
				"critical": "true",
			},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := provider.evaluateExpr(tt.expression, tt.labelSet)
			assert.NoError(t, err)
			assert.Equal(t, tt.expected, result, "Expression: %s", tt.expression)
		})
	}
}
