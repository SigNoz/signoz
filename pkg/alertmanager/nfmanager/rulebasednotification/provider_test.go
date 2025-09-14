package rulebasednotification

import (
	"context"
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
		alert   *types.Alert
		config  *nfmanager.NotificationConfig
		wantErr bool
	}{
		{
			name:  "valid parameters",
			orgID: "org1",
			alert: createTestAlert(model.LabelSet{
				"alertname": "test_alert",
				"severity":  "critical",
			}),
			config: &nfmanager.NotificationConfig{
				RenotifyInterval: 2 * time.Hour,
			},
			wantErr: false,
		},
		{
			name:    "empty orgID",
			orgID:   "",
			alert:   createTestAlert(model.LabelSet{"alertname": "test"}),
			config:  &nfmanager.NotificationConfig{RenotifyInterval: time.Hour},
			wantErr: false, // Should not error but also not set anything
		},
		{
			name:    "nil alert",
			orgID:   "org1",
			alert:   nil,
			config:  &nfmanager.NotificationConfig{RenotifyInterval: time.Hour},
			wantErr: false, // Should not error but also not set anything
		},
		{
			name:  "nil config",
			orgID: "org1",
			alert: createTestAlert(model.LabelSet{"alertname": "test"}),
			config: nil,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := provider.SetNotificationConfig(tt.orgID, tt.alert, tt.config)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// If we set a config successfully, we should be able to retrieve it
				if tt.orgID != "" && tt.alert != nil && tt.config != nil {
					retrievedConfig, retrieveErr := provider.GetNotificationConfig(tt.orgID, tt.alert)
					assert.NoError(t, retrieveErr)
					assert.NotNil(t, retrievedConfig)
					assert.Equal(t, tt.config.RenotifyInterval, retrievedConfig.RenotifyInterval)
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
	customConfig := &nfmanager.NotificationConfig{
		RenotifyInterval: 30 * time.Minute,
	}

	// Set config for alert1
	err = provider.SetNotificationConfig(orgID, alert1, customConfig)
	require.NoError(t, err)

	tests := []struct {
		name           string
		orgID          string
		alert          *types.Alert
		expectedConfig *nfmanager.NotificationConfig
		shouldFallback bool
	}{
		{
			name:           "existing config",
			orgID:          orgID,
			alert:          alert1,
			expectedConfig: customConfig,
			shouldFallback: false,
		},
		{
			name:           "non-existing config - fallback",
			orgID:          orgID,
			alert:          alert2,
			expectedConfig: nil, // Will get fallback from standardnotification
			shouldFallback: true,
		},
		{
			name:           "empty orgID - fallback",
			orgID:          "",
			alert:          alert1,
			expectedConfig: nil, // Will get fallback
			shouldFallback: true,
		},
		{
			name:           "nil alert - fallback",
			orgID:          orgID,
			alert:          nil,
			expectedConfig: nil, // Will get fallback
			shouldFallback: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config, err := provider.GetNotificationConfig(tt.orgID, tt.alert)
			assert.NoError(t, err)

			if tt.shouldFallback {
				// Should get fallback config (4 hour default from standard)
				assert.NotNil(t, config)
				assert.Equal(t, 4*time.Hour, config.RenotifyInterval)
			} else {
				// Should get our custom config
				assert.NotNil(t, config)
				assert.Equal(t, tt.expectedConfig.RenotifyInterval, config.RenotifyInterval)
			}
		})
	}
}

func TestProvider_FingerprintIsolation(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	// Create alerts with different fingerprints
	alert1 := createTestAlert(model.LabelSet{
		"alertname": "cpu_high",
		"instance":  "server1",
	})
	alert2 := createTestAlert(model.LabelSet{
		"alertname": "cpu_high",
		"instance":  "server2", // Different instance = different fingerprint
	})
	alert3 := createTestAlert(model.LabelSet{
		"alertname": "memory_high", // Different alert name = different fingerprint
		"instance":  "server1",
	})

	orgID := "test-org"
	config1 := &nfmanager.NotificationConfig{RenotifyInterval: 1 * time.Hour}
	config2 := &nfmanager.NotificationConfig{RenotifyInterval: 2 * time.Hour}
	config3 := &nfmanager.NotificationConfig{RenotifyInterval: 3 * time.Hour}

	// Set different configs for each alert
	err = provider.SetNotificationConfig(orgID, alert1, config1)
	require.NoError(t, err)
	err = provider.SetNotificationConfig(orgID, alert2, config2)
	require.NoError(t, err)
	err = provider.SetNotificationConfig(orgID, alert3, config3)
	require.NoError(t, err)

	// Verify each alert gets its own config
	retrievedConfig1, err := provider.GetNotificationConfig(orgID, alert1)
	require.NoError(t, err)
	assert.Equal(t, 1*time.Hour, retrievedConfig1.RenotifyInterval)

	retrievedConfig2, err := provider.GetNotificationConfig(orgID, alert2)
	require.NoError(t, err)
	assert.Equal(t, 2*time.Hour, retrievedConfig2.RenotifyInterval)

	retrievedConfig3, err := provider.GetNotificationConfig(orgID, alert3)
	require.NoError(t, err)
	assert.Equal(t, 3*time.Hour, retrievedConfig3.RenotifyInterval)
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
			config := &nfmanager.NotificationConfig{
				RenotifyInterval: time.Duration(i+1) * time.Minute,
			}
			err := provider.SetNotificationConfig(orgID, alert, config)
			assert.NoError(t, err)
		}
	}()

	// Reader goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < 50; i++ {
			config, err := provider.GetNotificationConfig(orgID, alert)
			assert.NoError(t, err)
			assert.NotNil(t, config)
		}
	}()

	// Wait for both goroutines to complete
	wg.Wait()
}

func TestProvider_OrganizationIsolation(t *testing.T) {
	ctx := context.Background()
	providerSettings := createTestProviderSettings()
	config := nfmanager.Config{}

	provider, err := New(ctx, providerSettings, config)
	require.NoError(t, err)

	// Same alert for different organizations
	alert := createTestAlert(model.LabelSet{
		"alertname": "test_alert",
		"severity":  "critical",
	})

	org1Config := &nfmanager.NotificationConfig{RenotifyInterval: 1 * time.Hour}
	org2Config := &nfmanager.NotificationConfig{RenotifyInterval: 2 * time.Hour}

	// Set different configs for different orgs
	err = provider.SetNotificationConfig("org1", alert, org1Config)
	require.NoError(t, err)
	err = provider.SetNotificationConfig("org2", alert, org2Config)
	require.NoError(t, err)

	// Verify each org gets its own config
	retrievedConfig1, err := provider.GetNotificationConfig("org1", alert)
	require.NoError(t, err)
	assert.Equal(t, 1*time.Hour, retrievedConfig1.RenotifyInterval)

	retrievedConfig2, err := provider.GetNotificationConfig("org2", alert)
	require.NoError(t, err)
	assert.Equal(t, 2*time.Hour, retrievedConfig2.RenotifyInterval)

	// Verify org3 gets fallback
	retrievedConfig3, err := provider.GetNotificationConfig("org3", alert)
	require.NoError(t, err)
	assert.Equal(t, 4*time.Hour, retrievedConfig3.RenotifyInterval) // Standard fallback
}