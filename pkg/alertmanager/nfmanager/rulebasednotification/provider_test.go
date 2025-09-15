package rulebasednotification

import (
	"context"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"sync"
	"testing"
	"time"

	nfmanager "github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestProviderSettings() factory.ProviderSettings {
	return instrumentationtest.New().ToProviderSettings()
}

func createTestAlert(labels model.LabelSet) *types.Alert {
	return &types.Alert{
		Alert: model.Alert{
			Labels: labels,
		},
	}
}

func TestNewFactory(t *testing.T) {
	providerFactory := NewFactory()
	assert.NotNil(t, providerFactory)
	assert.Equal(t, "rulebased", providerFactory.Name().String())
}

func TestNew(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)
	assert.NotNil(t, provider)

	// Verify provider implements the interface correctly
	assert.Implements(t, (*nfmanager.NotificationManager)(nil), provider)
}

func TestProvider_SetNotificationConfig(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	provider, err := New(ctx, providerSettings, config)
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
					alert := createTestAlert(model.LabelSet{"ruleId": model.LabelValue(tt.ruleID)})
					retrievedConfig, retrieveErr := provider.GetNotificationConfig(tt.orgID, tt.ruleID, alert)
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

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	alert1 := createTestAlert(model.LabelSet{
		"alertname": "test_alert",
		"severity":  "critical",
	})
	alert2 := createTestAlert(model.LabelSet{
		"alertname": "another_alert",
		"severity":  "warning",
	})

	orgID := "test-org"
	ruleID := "rule1"
	customConfig := &alertmanagertypes.NotificationConfig{
		Renotify: alertmanagertypes.ReNotificationConfig{
			RenotifyInterval: 30 * time.Minute,
			NoDataInterval:   30 * time.Minute,
		},
	}

	// Set config for alert1
	err = provider.SetNotificationConfig(orgID, ruleID, customConfig)
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
			name:           "existing config",
			orgID:          orgID,
			ruleID:         ruleID,
			alert:          alert1,
			expectedConfig: customConfig,
			shouldFallback: false,
		},
		{
			name:           "non-existing config - fallback",
			orgID:          orgID,
			ruleID:         "rule2",
			alert:          alert2,
			expectedConfig: nil, // Will get fallback from standardnotification
			shouldFallback: true,
		},
		{
			name:           "empty orgID - fallback",
			orgID:          "",
			ruleID:         ruleID,
			alert:          alert1,
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
			config, err := provider.GetNotificationConfig(tt.orgID, tt.ruleID, tt.alert)
			assert.NoError(t, err)

			if tt.shouldFallback {
				// Should get fallback config (876000 hour default)
				assert.NotNil(t, config)
				assert.Equal(t, 876000*time.Hour, config.Renotify.RenotifyInterval)
			} else {
				// Should get our custom config
				assert.NotNil(t, config)
				assert.Equal(t, tt.expectedConfig.Renotify, config.Renotify)
			}
		})
	}
}

func TestProvider_ConcurrentAccess(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	alert := createTestAlert(model.LabelSet{
		"alertname": "test_alert",
		"severity":  "critical",
	})
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
			config, err := provider.GetNotificationConfig(orgID, "rule1", alert)
			assert.NoError(t, err)
			assert.NotNil(t, config)
		}
	}()

	// Wait for both goroutines to complete
	wg.Wait()
}
