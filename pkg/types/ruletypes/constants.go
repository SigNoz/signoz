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
// The raw template strings, the breached value ($alert.value), the configured
// threshold ($rule.threshold.value), its comparator ($rule.threshold.op), the
// recovery threshold ($rule.threshold.recovery_value), the match type
// ($rule.match_type), the rule's signal ($rule.type) and the recovering flag
// ($alert.is_recovering) are private.
//
// The rest are public: they are deep links to relevant logs/traces and users
// may reference them directly as {{ .Annotations.related_logs }}, etc. in
// their channel templates.
const (
	AnnotationTitleTemplate     = "_title_template"
	AnnotationBodyTemplate      = "_body_template"
	AnnotationRelatedLogs       = "related_logs"
	AnnotationRelatedTraces     = "related_traces"
	AnnotationValue             = "_value"
	AnnotationIsRecovering      = "_is_recovering"
	AnnotationThresholdValue    = "_threshold"
	AnnotationRecoveryThreshold = "_recovery_threshold"
	AnnotationCompareOp         = "_compare_op"
	AnnotationMatchType         = "_match_type"
	AnnotationRuleType          = "_rule_type"
)
