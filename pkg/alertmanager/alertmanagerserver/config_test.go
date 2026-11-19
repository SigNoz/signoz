package alertmanagerserver

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/stretchr/testify/assert"
)

func TestNewConfigNFLogRetentionCoversRenotifyOff(t *testing.T) {
	testCases := []struct {
		name     string
		settings ruletypes.NotificationSettings
	}{
		{
			name:     "RenotifyNil",
			settings: ruletypes.NotificationSettings{},
		},
		{
			name:     "RenotifyDisabled",
			settings: ruletypes.NotificationSettings{Renotify: &ruletypes.Renotify{Enabled: false}},
		},
	}

	retention := NewConfig().NFLog.Retention

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			renotify := testCase.settings.GetAlertManagerNotificationConfig().Renotify

			assert.GreaterOrEqual(t, retention, 2*renotify.RenotifyInterval)
			assert.GreaterOrEqual(t, retention, 2*renotify.NoDataInterval)
		})
	}
}
