package licensetypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	// Feature Key
	SSO               = valuer.NewString("SSO")
	Onboarding        = valuer.NewString("ONBOARDING")
	ChatSupport       = valuer.NewString("CHAT_SUPPORT")
	Gateway           = valuer.NewString("GATEWAY")
	PremiumSupport    = valuer.NewString("PREMIUM_SUPPORT")
	UseSpanMetrics    = valuer.NewString("USE_SPAN_METRICS")
	AnomalyDetection  = valuer.NewString("ANOMALY_DETECTION")
	DotMetricsEnabled = valuer.NewString("DOT_METRICS_ENABLED")

	// License State
	LicenseStatusInvalid = valuer.NewString("INVALID")

	// Plan
	PlanNameEnterprise = valuer.NewString("ENTERPRISE")
	PlanNameBasic      = valuer.NewString("BASIC")
)

type Feature struct {
	Name       valuer.String `json:"name"`
	Active     bool          `json:"active"`
	Usage      int64         `json:"usage"`
	UsageLimit int64         `json:"usage_limit"`
	Route      string        `son:"route"`
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
