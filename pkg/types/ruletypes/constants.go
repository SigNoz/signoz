package ruletypes

const (
	CriticalThresholdName = "critical"
	ErrorThresholdName    = "error"
	WarningThresholdName  = "warning"
	InfoThresholdName     = "info"
	LabelThresholdName    = "threshold.name"
	LabelSeverityName     = "severity"
	LabelLastSeen         = "lastSeen"
	LabelRuleID           = "ruleId"
	LabelRuleSource       = "ruleSource"
	LabelNoData           = "nodata"
	LabelTestAlert        = "testalert"
	LabelAlertName        = "alertname"
)

// Annotations set by the rule manager and consumed by the alertmanager
// templating layer.
//
// Those prefixed with "_" are private: the alertmanager reads them into
// structured template fields, then strips them from notification-visible
// surfaces by alertmanagertypes.FilterPublicAnnotations before rendering.
// The raw template strings, the breached value ($alert.value) and the
// recovering flag ($alert.is_recovering) are private.
//
// The rest are public: they describe the firing alert (the configured
// threshold, the comparator, the match type, and deep links to relevant
// logs/traces) and users may reference them directly as
// {{ .Annotations.threshold.value }}, etc. in their channel templates.
const (
	AnnotationTitleTemplate  = "_title_template"
	AnnotationBodyTemplate   = "_body_template"
	AnnotationRelatedLogs    = "related_logs"
	AnnotationRelatedTraces  = "related_traces"
	AnnotationValue          = "_value"
	AnnotationIsRecovering   = "_is_recovering"
	AnnotationThresholdValue = "threshold.value"
	AnnotationCompareOp      = "compare_op"
	AnnotationMatchType      = "match_type"
)
