package alertmanagertypes

import (
	"time"

	v2 "github.com/prometheus/alertmanager/api/v2"
	"github.com/prometheus/alertmanager/api/v2/models"
	"github.com/prometheus/alertmanager/types"
)

type (
	// An alias for the Alert type from the alertmanager package.
	Alert = types.Alert

	// An alias for the PostableAlert type from the alertmanager package.
	PostableAlert = models.PostableAlert

	// A slice of PostableAlert.
	PostableAlerts = []*PostableAlert
)

// Converts a slice of PostableAlert to a slice of Alert.
func NewAlertsFromPostableAlerts(postableAlerts PostableAlerts, resolveTimeout time.Duration, now time.Time) ([]*types.Alert, []error) {
	alerts := v2.OpenAPIAlertsToAlerts(postableAlerts)

	for _, alert := range alerts {
		alert.UpdatedAt = now

		// Ensure StartsAt is set.
		if alert.StartsAt.IsZero() {
			if alert.EndsAt.IsZero() {
				alert.StartsAt = now
			} else {
				alert.StartsAt = alert.EndsAt
			}
		}
		// If no end time is defined, set a timeout after which an alert
		// is marked resolved if it is not updated.
		if alert.EndsAt.IsZero() {
			alert.Timeout = true
			alert.EndsAt = now.Add(resolveTimeout)
		}
	}

	// Make a best effort to insert all alerts that are valid.
	validAlerts := make([]*types.Alert, 0, len(alerts))
	var errs []error
	for _, a := range alerts {
		for k, v := range a.Labels {
			if string(v) == "" {
				delete(a.Labels, k)
			}
		}

		if err := a.Validate(); err != nil {
			errs = append(errs, err)
			continue
		}

		validAlerts = append(validAlerts, a)
	}

	return validAlerts, errs
}
