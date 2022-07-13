package alertManager

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
}

type ReceiverResponse struct {
	Status string   `json:"status"`
	Data   Receiver `json:"data"`
}
