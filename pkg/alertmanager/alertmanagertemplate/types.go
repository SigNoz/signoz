package alertmanagertemplate

import (
	"time"

	"github.com/prometheus/alertmanager/template"
)

// TemplateInput carries the title/body templates
// and their defaults to apply in case the custom templates
// are result in empty strings.
type TemplateInput struct {
	TitleTemplate        string
	BodyTemplate         string
	DefaultTitleTemplate string
	DefaultBodyTemplate  string
}

// ExpandedTemplates is the result of ExpandTemplates.
type ExpandedTemplates struct {
	Title       string
	Body        string
	MissingVars map[string]bool // union of unknown vars from title + body templates
}

// AlertData holds per-alert data used when expanding body templates
type AlertData struct {
	Receiver     string      `json:"receiver" mapstructure:"receiver"`
	Status       string      `json:"status" mapstructure:"status"`
	Labels       template.KV `json:"labels" mapstructure:"labels"`
	Annotations  template.KV `json:"annotations" mapstructure:"annotations"`
	StartsAt     time.Time   `json:"starts_at" mapstructure:"starts_at"`
	EndsAt       time.Time   `json:"ends_at" mapstructure:"ends_at"`
	GeneratorURL string      `json:"generator_url" mapstructure:"generator_url"`
	Fingerprint  string      `json:"fingerprint" mapstructure:"fingerprint"`

	// Convenience fields extracted from well-known labels/annotations.
	AlertName string `json:"rule_name" mapstructure:"rule_name"`
	RuleID    string `json:"rule_id" mapstructure:"rule_id"`
	RuleLink  string `json:"rule_link" mapstructure:"rule_link"`
	Severity  string `json:"severity" mapstructure:"severity"`

	// Alert internal data fields
	Value     string `json:"value" mapstructure:"value"`
	Threshold string `json:"threshold" mapstructure:"threshold"`
	CompareOp string `json:"compare_op" mapstructure:"compare_op"`
	MatchType string `json:"match_type" mapstructure:"match_type"`

	// Link annotations added by the rule evaluator.
	LogLink   string `json:"log_link" mapstructure:"log_link"`
	TraceLink string `json:"trace_link" mapstructure:"trace_link"`

	// Status booleans for easy conditional templating.
	IsFiring      bool `json:"is_firing" mapstructure:"is_firing"`
	IsResolved    bool `json:"is_resolved" mapstructure:"is_resolved"`
	IsMissingData bool `json:"is_missing_data" mapstructure:"is_missing_data"`
	IsRecovering  bool `json:"is_recovering" mapstructure:"is_recovering"`
}

// NotificationTemplateData is the top-level data struct provided to custom templates.
type NotificationTemplateData struct {
	Receiver string `json:"receiver" mapstructure:"receiver"`
	Status   string `json:"status" mapstructure:"status"`

	// Convenience fields for title templates.
	AlertName     string `json:"rule_name" mapstructure:"rule_name"`
	RuleID        string `json:"rule_id" mapstructure:"rule_id"`
	RuleLink      string `json:"rule_link" mapstructure:"rule_link"`
	TotalFiring   int    `json:"total_firing" mapstructure:"total_firing"`
	TotalResolved int    `json:"total_resolved" mapstructure:"total_resolved"`

	// Per-alert data, also available as filtered sub-slices.
	Alerts []AlertData `json:"-" mapstructure:"-"`

	// Cross-alert aggregates, computed as intersection across all alerts.
	GroupLabels       template.KV `json:"group_labels" mapstructure:"group_labels"`
	CommonLabels      template.KV `json:"common_labels" mapstructure:"common_labels"`
	CommonAnnotations template.KV `json:"common_annotations" mapstructure:"common_annotations"`
	ExternalURL       string      `json:"external_url" mapstructure:"external_url"`
	// Labels and Annotations that are collection of labels
	// and annotations from all alerts, it includes only the common labels and annotations
	// and for non-common labels and annotations, it picks some first few labels/annotations
	// and joins them with ", " to avoid blank values in the template
	Labels      template.KV `json:"labels" mapstructure:"labels"`
	Annotations template.KV `json:"annotations" mapstructure:"annotations"`
}
