package ruletypes

const (
	CriticalThresholdName = "critical"
	ErrorThresholdName    = "error"
	WarningThresholdName  = "warning"
	InfoThresholdName     = "info"
	LabelThresholdName    = "threshold.name"
	LabelSeverityName     = "severity"
	LabelLastSeen         = "lastSeen"
	LabelRuleId           = "ruleId"
	LabelRuleSource       = "ruleSource"
	LabelNoData           = "nodata"
	LabelTestAlert        = "testalert"
	LabelAlertName        = "alertname"
)

const (
	AnnotationRelatedLogs   = "related_logs"
	AnnotationRelatedTraces = "related_traces"
	AnnotationTitleTemplate = "title_template"
	AnnotationBodyTemplate  = "body_template"
	AnnotationValue         = "value"
	AnnotationThreshold     = "threshold"
	AnnotationCompareOp     = "compare_op"
	AnnotationMatchType     = "match_type"
)
