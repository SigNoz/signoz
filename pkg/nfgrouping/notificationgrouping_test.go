package nfgrouping

import (
	"testing"

	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
)

func TestNotificationGroupsInterface(t *testing.T) {
	// Test that the interface can be implemented
	var ng NotificationGroups = &mockNotificationGroups{}

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

	groupLabels := ng.GetGroupLabels("test-org", alert, route)
	assert.NotNil(t, groupLabels)

	err := ng.SetGroupLabels("test-org", "test-rule", []string{"alertname"})
	assert.NoError(t, err)
}

type mockNotificationGroups struct{}

func (m *mockNotificationGroups) GetGroupLabels(orgID string, alert *types.Alert, route *dispatch.Route) model.LabelSet {
	return model.LabelSet{
		"alertname": alert.Labels["alertname"],
	}
}

func (m *mockNotificationGroups) SetGroupLabels(orgID string, ruleID string, groupByLabels []string) error {
	return nil
}
