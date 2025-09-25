package alertmanagertest

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMockAlertmanager(t *testing.T) {
	ctx := context.Background()
	mock := NewMock()

	// Test service state
	assert.False(t, mock.IsStarted())
	assert.False(t, mock.IsStopped())

	// Test Start
	err := mock.Start(ctx)
	require.NoError(t, err)
	assert.True(t, mock.IsStarted())
	assert.False(t, mock.IsStopped())

	// Test Stop
	err = mock.Stop(ctx)
	require.NoError(t, err)
	assert.False(t, mock.IsStarted())
	assert.True(t, mock.IsStopped())

	// Test config operations
	orgID := "test-org"
	config, err := alertmanagertypes.NewDefaultConfig(
		alertmanagertypes.GlobalConfig{},
		alertmanagertypes.RouteConfig{
			GroupInterval:  1 * time.Minute,
			RepeatInterval: 1 * time.Minute,
			GroupWait:      1 * time.Minute,
		},
		orgID,
	)
	require.NoError(t, err)

	err = mock.SetConfig(ctx, config)
	require.NoError(t, err)
	assert.True(t, mock.HasConfig(orgID))

	retrievedConfig, err := mock.GetConfig(ctx, orgID)
	require.NoError(t, err)
	assert.NotNil(t, retrievedConfig)

	// Test notification config
	orgUUID := valuer.GenerateUUID()
	ruleID := "test-rule"
	notificationConfig := alertmanagertypes.NotificationConfig{}

	err = mock.SetNotificationConfig(ctx, orgUUID, ruleID, &notificationConfig)
	require.NoError(t, err)
	assert.True(t, mock.HasNotificationConfig(orgUUID.String(), ruleID))

	err = mock.DeleteNotificationConfig(ctx, orgUUID, ruleID)
	require.NoError(t, err)
	assert.False(t, mock.HasNotificationConfig(orgUUID.String(), ruleID))

	// Test error injection
	mock.SetMockError("GetConfig", orgID, assert.AnError)
	_, err = mock.GetConfig(ctx, orgID)
	assert.Error(t, err)

	// Test clear mock data
	mock.ClearMockData()
	assert.False(t, mock.HasConfig(orgID))
	assert.False(t, mock.IsStarted())
	assert.False(t, mock.IsStopped())
}