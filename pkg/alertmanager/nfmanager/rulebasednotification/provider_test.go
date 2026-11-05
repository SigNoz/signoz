package rulebasednotification

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfroutingstore/nfroutingstoretest"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/prometheus/common/model"
)

func createTestProviderSettings() factory.ProviderSettings {
	return instrumentationtest.New().ToProviderSettings()
}

func TestNewFactory(t *testing.T) {
	routeStore := nfroutingstoretest.NewMockSQLRouteStore()
	providerFactory := NewFactory(routeStore)
	assert.NotNil(t, providerFactory)
	assert.Equal(t, "rulebased", providerFactory.Name().String())
}

func TestNew(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	routeStore := nfroutingstoretest.NewMockSQLRouteStore()
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

	routeStore := nfroutingstoretest.NewMockSQLRouteStore()
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

	routeStore := nfroutingstoretest.NewMockSQLRouteStore()
	provider, err := New(ctx, providerSettings, config, routeStore)
	require.NoError(t, err)

	orgID := "test-org"
	ruleID := "ruleId"
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

	err = provider.SetNotificationConfig(orgID, ruleID, customConfig)
	require.NoError(t, err)

	err = provider.SetNotificationConfig(orgID, ruleId1, customConfig1)
	require.NoError(t, err)

	tests := []struct {
		name           string
		orgID          string
		ruleID         string
		alert          *alertmanagertypes.Alert
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
			},
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

	routeStore := nfroutingstoretest.NewMockSQLRouteStore()
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

func TestProvider_DeleteRoute(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	tests := []struct {
		name    string
		orgID   string
		routeID string
		wantErr bool
	}{
		{
			name:    "valid parameters",
			orgID:   "test-org-123",
			routeID: "route-uuid-456",
			wantErr: false,
		},
		{
			name:    "empty routeID",
			orgID:   "test-org-123",
			routeID: "",
			wantErr: true,
		},
		{
			name:    "valid orgID with valid routeID",
			orgID:   "another-org",
			routeID: "another-route-id",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			routeStore := nfroutingstoretest.NewMockSQLRouteStore()
			provider, err := New(ctx, providerSettings, config, routeStore)
			require.NoError(t, err)

			if !tt.wantErr {
				routeStore.ExpectDelete(tt.orgID, tt.routeID)
			}

			err = provider.DeleteRoutePolicy(ctx, tt.orgID, tt.routeID)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NoError(t, routeStore.ExpectationsWereMet())
			}
		})
	}
}

func TestProvider_CreateRoute(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	tests := []struct {
		name    string
		orgID   string
		route   *alertmanagertypes.RoutePolicy
		wantErr bool
	}{
		{
			name:  "valid route",
			orgID: "test-org-123",
			route: &alertmanagertypes.RoutePolicy{
				Identifiable:   types.Identifiable{ID: valuer.GenerateUUID()},
				Expression:     `service == "auth"`,
				ExpressionKind: alertmanagertypes.PolicyBasedExpression,
				Name:           "auth-service-route",
				Description:    "Route for auth service alerts",
				Enabled:        true,
				OrgID:          "test-org-123",
				Channels:       []string{"slack-channel"},
			},
			wantErr: false,
		},
		{
			name:  "valid route qb format",
			orgID: "test-org-123",
			route: &alertmanagertypes.RoutePolicy{
				Identifiable:   types.Identifiable{ID: valuer.GenerateUUID()},
				Expression:     `service = "auth"`,
				ExpressionKind: alertmanagertypes.PolicyBasedExpression,
				Name:           "auth-service-route",
				Description:    "Route for auth service alerts",
				Enabled:        true,
				OrgID:          "test-org-123",
				Channels:       []string{"slack-channel"},
			},
			wantErr: false,
		},
		{
			name:    "nil route",
			orgID:   "test-org-123",
			route:   nil,
			wantErr: true,
		},
		{
			name:  "invalid route - missing expression",
			orgID: "test-org-123",
			route: &alertmanagertypes.RoutePolicy{
				Expression:     "", // empty expression
				ExpressionKind: alertmanagertypes.PolicyBasedExpression,
				Name:           "invalid-route",
				OrgID:          "test-org-123",
			},
			wantErr: true,
		},
		{
			name:  "invalid route - missing name",
			orgID: "test-org-123",
			route: &alertmanagertypes.RoutePolicy{
				Expression:     `service == "auth"`,
				ExpressionKind: alertmanagertypes.PolicyBasedExpression,
				Name:           "", // empty name
				OrgID:          "test-org-123",
			},
			wantErr: true,
		},
		{
			name:  "invalid route - missing name",
			orgID: "test-org-123",
			route: &alertmanagertypes.RoutePolicy{
				Expression:     `service = "auth"`,
				ExpressionKind: alertmanagertypes.PolicyBasedExpression,
				Name:           "", // empty name
				OrgID:          "test-org-123",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			routeStore := nfroutingstoretest.NewMockSQLRouteStore()
			provider, err := New(ctx, providerSettings, config, routeStore)
			require.NoError(t, err)

			if !tt.wantErr && tt.route != nil {
				routeStore.ExpectCreate(tt.route)
			}

			err = provider.CreateRoutePolicy(ctx, tt.orgID, tt.route)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NoError(t, routeStore.ExpectationsWereMet())
			}
		})
	}
}

func TestProvider_CreateRoutes(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	routeStore := nfroutingstoretest.NewMockSQLRouteStore()
	provider, err := New(ctx, providerSettings, config, routeStore)
	require.NoError(t, err)

	validRoute1 := &alertmanagertypes.RoutePolicy{
		Expression:     `service == "auth"`,
		ExpressionKind: alertmanagertypes.PolicyBasedExpression,
		Name:           "auth-route",
		Description:    "Auth service route",
		Enabled:        true,
		OrgID:          "test-org",
		Channels:       []string{"slack-auth"},
	}

	validRoute2 := &alertmanagertypes.RoutePolicy{
		Expression:     `service == "payment"`,
		ExpressionKind: alertmanagertypes.PolicyBasedExpression,
		Name:           "payment-route",
		Description:    "Payment service route",
		Enabled:        true,
		OrgID:          "test-org",
		Channels:       []string{"slack-payment"},
	}

	invalidRoute := &alertmanagertypes.RoutePolicy{
		Expression:     "", // empty expression - invalid
		ExpressionKind: alertmanagertypes.PolicyBasedExpression,
		Name:           "invalid-route",
		OrgID:          "test-org",
	}

	tests := []struct {
		name    string
		orgID   string
		routes  []*alertmanagertypes.RoutePolicy
		wantErr bool
	}{
		{
			name:    "valid routes",
			orgID:   "test-org",
			routes:  []*alertmanagertypes.RoutePolicy{validRoute1, validRoute2},
			wantErr: false,
		},
		{
			name:    "empty routes list",
			orgID:   "test-org",
			routes:  []*alertmanagertypes.RoutePolicy{},
			wantErr: true,
		},
		{
			name:    "nil routes list",
			orgID:   "test-org",
			routes:  nil,
			wantErr: true,
		},
		{
			name:    "routes with nil route",
			orgID:   "test-org",
			routes:  []*alertmanagertypes.RoutePolicy{validRoute1, nil},
			wantErr: true,
		},
		{
			name:    "routes with invalid route",
			orgID:   "test-org",
			routes:  []*alertmanagertypes.RoutePolicy{validRoute1, invalidRoute},
			wantErr: true,
		},
		{
			name:    "single valid route",
			orgID:   "test-org",
			routes:  []*alertmanagertypes.RoutePolicy{validRoute1},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !tt.wantErr && len(tt.routes) > 0 {
				routeStore.ExpectCreateBatch(tt.routes)
			}

			err := provider.CreateRoutePolicies(ctx, tt.orgID, tt.routes)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NoError(t, routeStore.ExpectationsWereMet())
			}
		})
	}
}
