package alertmanagertypes

import (
	"strings"
	"time"

	"github.com/prometheus/alertmanager/template"
)

// privateAnnotationPrefix marks annotations the rule manager attaches for
// alertmanager-internal use (raw template strings, threshold metadata, link
// targets). Annotations whose key starts with this prefix are stripped from
// any surface that ends up visible to a template author or a notification
// recipient; the alertmanager reads them off the raw alert before stripping.
const privateAnnotationPrefix = "_"

// IsPrivateAnnotation reports whether an annotation key is considered
// private — i.e. internal to alertmanager and should not be rendered in
// notifications.
func IsPrivateAnnotation(key string) bool {
	return strings.HasPrefix(key, privateAnnotationPrefix)
}

// FilterPublicAnnotations returns a copy of kv with all private-prefixed
// keys removed. Callers that expose annotations to templates or notification
// payloads should pass them through this first.
func FilterPublicAnnotations(kv template.KV) template.KV {
	out := make(template.KV, len(kv))
	for k, v := range kv {
		if IsPrivateAnnotation(k) {
			continue
		}
		out[k] = v
	}
	return out
}

// ExpandRequest carries the title/body templates and their defaults handed to
// Templater.Expand. Default templates are used when the custom templates
// expand to empty strings.
type ExpandRequest struct {
	TitleTemplate        string
	BodyTemplate         string
	DefaultTitleTemplate string
	DefaultBodyTemplate  string
}

// ExpandResult is the rendered output of Templater.Expand.
type ExpandResult struct {
	// Title is the expanded notification title (plain text).
	Title string
	// Body is the expanded notification body, one entry per input alert. The
	// body template is applied per-alert and concatenated by the caller.
	Body []string
	// IsDefaultBody is true when Body came from the default template (no
	// user-authored body was supplied), false when a custom template was used.
	IsDefaultBody bool
	// MissingVars is the union of $-references in the title and body templates
	// that did not resolve to any known field. Surfaced for preview warnings;
	// at runtime these render as "<no value>".
	MissingVars []string
	// NotificationData is the aggregate data that fed the title template,
	// exposed so callers can reuse it when rendering a channel-specific layout
	// (e.g. the email HTML shell) without rebuilding it from the alerts.
	NotificationData *NotificationTemplateData
}

// AlertData holds per-alert data used when expanding body templates.
//
// Field paths follow OpenTelemetry-style dotted namespaces (via mapstructure
// tags) so user templates can reference paths like $alert.is_firing,
// $rule.threshold.value, or $log.url. JSON tags use camelCase for the wire
// format.
type AlertData struct {
	Alert       AlertInfo   `json:"alert"       mapstructure:"alert"`
	Rule        RuleInfo    `json:"rule"        mapstructure:"rule"`
	Log         LinkInfo    `json:"log"         mapstructure:"log"`
	Trace       LinkInfo    `json:"trace"       mapstructure:"trace"`
	Labels      template.KV `json:"labels"      mapstructure:"labels"`
	Annotations template.KV `json:"annotations" mapstructure:"annotations"`
}

// AlertInfo holds the per-alert state and timing data.
type AlertInfo struct {
	Status        string    `json:"status"        mapstructure:"status"`
	Receiver      string    `json:"receiver"      mapstructure:"receiver"`
	Value         string    `json:"value"         mapstructure:"value"`
	StartsAt      time.Time `json:"startsAt"      mapstructure:"starts_at"`
	EndsAt        time.Time `json:"endsAt"        mapstructure:"ends_at"`
	GeneratorURL  string    `json:"generatorURL"  mapstructure:"generator_url"`
	Fingerprint   string    `json:"fingerprint"   mapstructure:"fingerprint"`
	IsFiring      bool      `json:"isFiring"      mapstructure:"is_firing"`
	IsResolved    bool      `json:"isResolved"    mapstructure:"is_resolved"`
	IsMissingData bool      `json:"isMissingData" mapstructure:"is_missing_data"`
	IsRecovering  bool      `json:"isRecovering"  mapstructure:"is_recovering"`
}

// RuleInfo holds the rule metadata extracted from well-known labels and
// annotations.
type RuleInfo struct {
	Name      string    `json:"name"      mapstructure:"name"`
	ID        string    `json:"id"        mapstructure:"id"`
	URL       string    `json:"url"       mapstructure:"url"`
	Severity  string    `json:"severity"  mapstructure:"severity"`
	MatchType string    `json:"matchType" mapstructure:"match_type"`
	Threshold Threshold `json:"threshold" mapstructure:"threshold"`
}

// Threshold describes the breach condition.
type Threshold struct {
	Value string `json:"value" mapstructure:"value"`
	Op    string `json:"op"    mapstructure:"op"`
}

// LinkInfo groups a single URL so templates can reference $log.url and
// $trace.url uniformly.
type LinkInfo struct {
	URL string `json:"url" mapstructure:"url"`
}

// NotificationTemplateData is the top-level data struct provided to title
// templates, representing the aggregate of a grouped notification.
type NotificationTemplateData struct {
	Alert             NotificationAlert `json:"alert"             mapstructure:"alert"`
	Rule              RuleInfo          `json:"rule"              mapstructure:"rule"`
	Labels            template.KV       `json:"labels"            mapstructure:"labels"`
	Annotations       template.KV       `json:"annotations"       mapstructure:"annotations"`
	CommonLabels      template.KV       `json:"commonLabels"      mapstructure:"common_labels"`
	CommonAnnotations template.KV       `json:"commonAnnotations" mapstructure:"common_annotations"`
	GroupLabels       template.KV       `json:"groupLabels"       mapstructure:"group_labels"`
	ExternalURL       string            `json:"externalURL"       mapstructure:"external_url"`

	// Per-alert data kept for body expansion; not exposed to the title template.
	Alerts []AlertData `json:"-" mapstructure:"-"`
}

// NotificationAlert holds the aggregate alert fields available to title
// templates (counts, overall status, receiver).
type NotificationAlert struct {
	Receiver      string `json:"receiver"      mapstructure:"receiver"`
	Status        string `json:"status"        mapstructure:"status"`
	TotalFiring   int    `json:"totalFiring"   mapstructure:"total_firing"`
	TotalResolved int    `json:"totalResolved" mapstructure:"total_resolved"`
}
