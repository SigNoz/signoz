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

// ExpandedTemplates is the result of ExpandAlertTemplates.
type ExpandedTemplates struct {
	Title string
	Body  string
}

// AlertData holds per-alert data used when expanding body templates
type AlertData struct {
	Receiver     string      `json:"receiver"`
	Status       string      `json:"status"`
	Labels       template.KV `json:"labels"`
	Annotations  template.KV `json:"annotations"`
	StartsAt     time.Time   `json:"starts_at"`
	EndsAt       time.Time   `json:"ends_at"`
	GeneratorURL string      `json:"generator_url"`
	Fingerprint  string      `json:"fingerprint"`

	// Convenience fields extracted from well-known labels/annotations.
	AlertName string `json:"rule_name"`
	RuleID    string `json:"rule_id"`
	RuleLink  string `json:"rule_link"`
	Severity  string `json:"severity"`

	// Alert internal data fields
	Value     string `json:"value"`
	Threshold string `json:"threshold"`
	CompareOp string `json:"compare_op"`
	MatchType string `json:"match_type"`

	// Link annotations added by the rule evaluator.
	LogLink   string `json:"log_link"`
	TraceLink string `json:"trace_link"`

	// Status booleans for easy conditional templating.
	IsFiring      bool `json:"is_firing"`
	IsResolved    bool `json:"is_resolved"`
	IsMissingData bool `json:"is_missing_data"`
	IsRecovering  bool `json:"is_recovering"`
}

// NotificationTemplateData is the top-level data struct provided to custom templates.
type NotificationTemplateData struct {
	Receiver string `json:"receiver"`
	Status   string `json:"status"`

	// Convenience fields for title templates.
	AlertName     string `json:"rule_name"`
	RuleID        string `json:"rule_id"`
	RuleLink      string `json:"rule_link"`
	TotalFiring   int    `json:"total_firing"`
	TotalResolved int    `json:"total_resolved"`

	// Per-alert data, also available as filtered sub-slices.
	Alerts []AlertData `json:"-" mapstructure:"-"`

	// Cross-alert aggregates, computed as intersection across all alerts.
	GroupLabels       template.KV `json:"group_labels"`
	CommonLabels      template.KV `json:"common_labels"`
	CommonAnnotations template.KV `json:"common_annotations"`
	ExternalURL       string      `json:"external_url"`
	// Labels and Annotations that are collection of labels
	// and annotations from all alerts, it includes only the common labels and annotations
	// and for non-common labels and annotations, it picks some first few labels/annotations
	// and joins them with ", " to avoid blank values in the template
	Labels      template.KV `json:"labels"`
	Annotations template.KV `json:"annotations"`
}
