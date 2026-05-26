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
	LabelIsRecovering     = "is_recovering"
)

// Annotations set by the rule manager and consumed by the alertmanager
// templating layer.
//
// Those prefixed with "_" are private: they're stripped from
// notification-visible surfaces by alertmanagertypes.FilterPublicAnnotations
// before rendering. Only the raw template strings are private — echoing
// them into a notification is circular and never useful.
//
// The rest are public: they describe the firing alert (the breached value,
// the configured threshold, the comparator, the match type, and deep links
// to relevant logs/traces) and users may reference them directly as
// {{ .Annotations.value }}, {{ .Annotations.threshold.value }}, etc. in
// their channel templates.
const (
	AnnotationTitleTemplate  = "_title_template"
	AnnotationBodyTemplate   = "_body_template"
	AnnotationRelatedLogs    = "related_logs"
	AnnotationRelatedTraces  = "related_traces"
	AnnotationValue          = "value"
	AnnotationThresholdValue = "threshold.value"
	AnnotationCompareOp      = "compare_op"
	AnnotationMatchType      = "match_type"
)
