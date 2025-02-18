package alertmanagertypes

import (
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"time"

	"github.com/go-openapi/runtime/middleware"
	v2 "github.com/prometheus/alertmanager/api/v2"
	"github.com/prometheus/alertmanager/api/v2/models"
	"github.com/prometheus/alertmanager/api/v2/restapi/operations/alert"
	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/matcher/compat"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/alertmanager/provider"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"go.signoz.io/signoz/pkg/errors"
)

type (
	// An alias for the Alert type from the alertmanager package.
	Alert = types.Alert

	// An alias for the PostableAlert type from the alertmanager package.
	PostableAlert = models.PostableAlert

	// A slice of PostableAlert.
	PostableAlerts = []*PostableAlert

	// An alias for the GettableAlert type from the alertmanager package.
	GettableAlert = models.GettableAlert

	// A slice of GettableAlert.
	GettableAlerts = models.GettableAlerts

	// An alias for the GettableAlertsParams type from the alertmanager package.
	GettableAlertsParams = alert.GetAlertsParams
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

func NewTestAlert(receiver Receiver, startsAt time.Time, updatedAt time.Time) *Alert {
	return &Alert{
		Alert: model.Alert{
			StartsAt: startsAt,
			Labels: model.LabelSet{
				"alertname": model.LabelValue(fmt.Sprintf("Test Alert (%s)", receiver.Name)),
				"severity":  "critical",
			},
			Annotations: model.LabelSet{
				"description": "Test alert fired from SigNoz",
				"summary":     "Test alert fired from SigNoz",
				"message":     "Test alert fired from SigNoz",
			},
		},
		UpdatedAt: updatedAt,
	}
}

func NewGettableAlertsParams(req *http.Request) (GettableAlertsParams, error) {
	params := alert.NewGetAlertsParams()
	err := (&params).BindRequest(req, &middleware.MatchedRoute{})
	if err != nil {
		return GettableAlertsParams{}, err
	}

	return params, nil
}

func NewGettableAlertsFromAlertProvider(
	alerts provider.Alerts,
	cfg *Config,
	getAlertStatusFunc func(model.Fingerprint) types.AlertStatus,
	setAlertStatusFunc func(model.LabelSet),
	params GettableAlertsParams,
) (GettableAlerts, error) {
	res := GettableAlerts{}

	matchers, err := parseFilter(params.Filter)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "invalid filter")
	}

	var receiverFilter *regexp.Regexp
	if params.Receiver != nil {
		receiverFilter, err = regexp.Compile("^(?:" + *params.Receiver + ")$")
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "failed to parse receiver param")
		}
	}

	iterator := alerts.GetPending()
	defer iterator.Close()

	alertFilter := alertFilter(getAlertStatusFunc, setAlertStatusFunc, matchers, *params.Silenced, *params.Inhibited, *params.Active)
	now := time.Now()

	for a := range iterator.Next() {
		if err = iterator.Err(); err != nil {
			break
		}

		routes := dispatch.NewRoute(cfg.alertmanagerConfig.Route, nil).Match(a.Labels)
		receivers := make([]string, 0, len(routes))
		for _, r := range routes {
			receivers = append(receivers, r.RouteOpts.Receiver)
		}

		if receiverFilter != nil && !receiversMatchFilter(receivers, receiverFilter) {
			continue
		}

		if !alertFilter(a, now) {
			continue
		}

		alert := v2.AlertToOpenAPIAlert(a, getAlertStatusFunc(a.Fingerprint()), receivers, nil)

		res = append(res, alert)
	}

	sort.Slice(res, func(i, j int) bool {
		return *res[i].Fingerprint < *res[j].Fingerprint
	})

	return res, nil
}

func alertFilter(
	getAlertStatusFunc func(model.Fingerprint) types.AlertStatus,
	setAlertStatusFunc func(model.LabelSet),
	matchers []*labels.Matcher,
	silenced bool,
	inhibited bool,
	active bool,
) func(a *types.Alert, now time.Time) bool {
	return func(a *types.Alert, now time.Time) bool {
		if !a.EndsAt.IsZero() && a.EndsAt.Before(now) {
			return false
		}

		// Set alert's current status based on its label set.
		setAlertStatusFunc(a.Labels)

		// Get alert's current status after seeing if it is suppressed.
		status := getAlertStatusFunc(a.Fingerprint())

		if !active && status.State == types.AlertStateActive {
			return false
		}

		if !silenced && len(status.SilencedBy) != 0 {
			return false
		}

		if !inhibited && len(status.InhibitedBy) != 0 {
			return false
		}

		return alertMatchesFilterLabels(&a.Alert, matchers)
	}
}

func parseFilter(filter []string) ([]*labels.Matcher, error) {
	matchers := make([]*labels.Matcher, 0, len(filter))
	for _, matcherString := range filter {
		matcher, err := compat.Matcher(matcherString, "api")
		if err != nil {
			return nil, err
		}

		matchers = append(matchers, matcher)
	}
	return matchers, nil
}

func alertMatchesFilterLabels(a *model.Alert, matchers []*labels.Matcher) bool {
	sms := make(map[string]string)
	for name, value := range a.Labels {
		sms[string(name)] = string(value)
	}

	return matchFilterLabels(matchers, sms)
}

func matchFilterLabels(matchers []*labels.Matcher, sms map[string]string) bool {
	for _, m := range matchers {
		v, prs := sms[m.Name]
		switch m.Type {
		case labels.MatchNotRegexp, labels.MatchNotEqual:
			if m.Value == "" && prs {
				continue
			}
			if !m.Matches(v) {
				return false
			}
		default:
			if m.Value == "" && !prs {
				continue
			}
			if !m.Matches(v) {
				return false
			}
		}
	}

	return true
}

func receiversMatchFilter(receivers []string, filter *regexp.Regexp) bool {
	for _, r := range receivers {
		if filter.MatchString(r) {
			return true
		}
	}

	return false
}
