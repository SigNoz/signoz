package nfmanager

import (
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"testing"

	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
)

func TestNotificationGroupsInterface(t *testing.T) {
	// Test that the interface can be implemented
	var ng NotificationManager = &mockNotificationGroups{}

	alert := &types.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"alertname": "test_alert",
				"severity":  "critical",
			},
		},
	}

	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			GroupBy: map[model.LabelName]struct{}{
				"alertname": {},
			},
		},
	}

	config := &alertmanagertypes.NotificationConfig{
		NotificationGroup: map[model.LabelName]struct{}{"alertname": {}},
	}
	err := ng.SetNotificationConfig("test-org", "test-rule", config)
	assert.NoError(t, err)

	retrievedConfig, err := ng.GetNotificationConfig("test-org", "test-rule")
	assert.NoError(t, err)
	assert.NotNil(t, retrievedConfig)
}

type mockNotificationGroups struct{}

func (m *mockNotificationGroups) GetGroupLabels(orgID string, alert *types.Alert, route *dispatch.Route) model.LabelSet {
	return model.LabelSet{
		"alertname": alert.Labels["alertname"],
	}
}

func (m *mockNotificationGroups) GetNotificationConfig(orgID string, ruleID string) (*alertmanagertypes.NotificationConfig, error) {
	return &alertmanagertypes.NotificationConfig{
		NotificationGroup: map[model.LabelName]struct{}{"alertname": {}},
	}, nil
}

func (m *mockNotificationGroups) SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error {
	return nil
}
