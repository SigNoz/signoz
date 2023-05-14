package alertManager

import (
	"fmt"
	"time"

	"go.signoz.io/signoz/pkg/query-service/utils/labels"
)

// Receiver configuration provides configuration on how to contact a receiver.
type Receiver struct {
	// A unique identifier for this receiver.
	Name string `yaml:"name" json:"name"`

	EmailConfigs     interface{} `yaml:"email_configs,omitempty" json:"email_configs,omitempty"`
	PagerdutyConfigs interface{} `yaml:"pagerduty_configs,omitempty" json:"pagerduty_configs,omitempty"`
	SlackConfigs     interface{} `yaml:"slack_configs,omitempty" json:"slack_configs,omitempty"`
	WebhookConfigs   interface{} `yaml:"webhook_configs,omitempty" json:"webhook_configs,omitempty"`
	OpsGenieConfigs  interface{} `yaml:"opsgenie_configs,omitempty" json:"opsgenie_configs,omitempty"`
	WechatConfigs    interface{} `yaml:"wechat_configs,omitempty" json:"wechat_configs,omitempty"`
	PushoverConfigs  interface{} `yaml:"pushover_configs,omitempty" json:"pushover_configs,omitempty"`
	VictorOpsConfigs interface{} `yaml:"victorops_configs,omitempty" json:"victorops_configs,omitempty"`
	SNSConfigs       interface{} `yaml:"sns_configs,omitempty" json:"sns_configs,omitempty"`
	MSTeamsConfigs   interface{} `yaml:"msteams_configs,omitempty" json:"msteams_configs,omitempty"`
}

type ReceiverResponse struct {
	Status string   `json:"status"`
	Data   Receiver `json:"data"`
}

// Alert is a generic representation of an alert in the Prometheus eco-system.
type Alert struct {
	// Label value pairs for purpose of aggregation, matching, and disposition
	// dispatching. This must minimally include an "alertname" label.
	Labels labels.BaseLabels `json:"labels"`

	// Extra key/value information which does not define alert identity.
	Annotations labels.BaseLabels `json:"annotations"`

	// The known time range for this alert. Both ends are optional.
	StartsAt     time.Time `json:"startsAt,omitempty"`
	EndsAt       time.Time `json:"endsAt,omitempty"`
	GeneratorURL string    `json:"generatorURL,omitempty"`

	Receivers []string `json:"receivers,omitempty"`
}

// Name returns the name of the alert. It is equivalent to the "alertname" label.
func (a *Alert) Name() string {
	return a.Labels.Get(labels.AlertNameLabel)
}

// Hash returns a hash over the alert. It is equivalent to the alert labels hash.
func (a *Alert) Hash() uint64 {
	return a.Labels.Hash()
}

func (a *Alert) String() string {
	s := fmt.Sprintf("%s[%s][%s]", a.Name(), fmt.Sprintf("%016x", a.Hash())[:7], a.Receivers)
	if a.Resolved() {
		return s + "[resolved]"
	}
	return s + "[active]"
}

// Resolved returns true iff the activity interval ended in the past.
func (a *Alert) Resolved() bool {
	return a.ResolvedAt(time.Now())
}

// ResolvedAt returns true off the activity interval ended before
// the given timestamp.
func (a *Alert) ResolvedAt(ts time.Time) bool {
	if a.EndsAt.IsZero() {
		return false
	}
	return !a.EndsAt.After(ts)
}
