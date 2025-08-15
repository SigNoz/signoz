// Package notificationgrouping provides interfaces and implementations for alert notification grouping strategies.
// It supports multi-tenancy and rule-based grouping configurations.
package notificationgrouping

import (
	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// NotificationGroups defines how alerts should be grouped for notification with multi-tenancy support.
type NotificationGroups interface {
	GetGroupLabels(orgID string, alert *types.Alert, route *dispatch.Route) model.LabelSet
	SetGroupLabels(orgID string, ruleID string, groupByLabels []string) error
}
