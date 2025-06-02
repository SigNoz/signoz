package licensetypes

const (
	PlanNameEnterprise = "ENTERPRISE"
	PlanNameBasic      = "BASIC"
)

const (
	LicenseStatusInvalid = "INVALID"
)

const (
	SSO               = "SSO"
	Onboarding        = "ONBOARDING"
	ChatSupport       = "CHAT_SUPPORT"
	Gateway           = "GATEWAY"
	PremiumSupport    = "PREMIUM_SUPPORT"
	UseSpanMetrics    = "USE_SPAN_METRICS"
	AnomalyDetection  = "ANOMALY_DETECTION"
	DotMetricsEnabled = "DOT_METRICS_ENABLED"
)

type Feature struct {
	Name       string `db:"name" json:"name"`
	Active     bool   `db:"active" json:"active"`
	Usage      int64  `db:"usage" json:"usage"`
	UsageLimit int64  `db:"usage_limit" json:"usage_limit"`
	Route      string `db:"route" json:"route"`
}

var BasicPlan = []*Feature{
	{
		Name:       SSO,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       Gateway,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       PremiumSupport,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       AnomalyDetection,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       DotMetricsEnabled,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}

var EnterprisePlan = []*Feature{
	{
		Name:       SSO,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       Onboarding,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       ChatSupport,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       Gateway,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       PremiumSupport,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       AnomalyDetection,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       DotMetricsEnabled,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}

var DefaultFeatureSet = []*Feature{
	{
		Name:       UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	{
		Name:       DotMetricsEnabled,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}
