package licensetypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	// Feature Key
	SSO               = valuer.NewString("sso")
	Onboarding        = valuer.NewString("onboarding")
	ChatSupport       = valuer.NewString("chat_support")
	Gateway           = valuer.NewString("gateway")
	PremiumSupport    = valuer.NewString("premium_support")
	UseSpanMetrics    = valuer.NewString("use_span_metrics")
	AnomalyDetection  = valuer.NewString("anomaly_detection")
	DotMetricsEnabled = valuer.NewString("dot_metrics_enabled")

	// License State
	LicenseStatusInvalid = valuer.NewString("invalid")

	// Plan
	PlanNameEnterprise = valuer.NewString("enterprise")
	PlanNameBasic      = valuer.NewString("basic")
)

type Feature struct {
	Name       valuer.String `json:"name"`
	Active     bool          `json:"active"`
	Usage      int64         `json:"usage"`
	UsageLimit int64         `json:"usage_limit"`
	Route      string        `json:"route"`
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
