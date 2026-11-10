package metricreductionruletypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type AssetType struct {
	valuer.String
}

var (
	AssetTypeDashboard = AssetType{valuer.NewString("dashboard")}
	AssetTypeAlert     = AssetType{valuer.NewString("alert_rule")}
)

func (AssetType) Enum() []any {
	return []any{AssetTypeDashboard, AssetTypeAlert}
}

type PostableReductionRulePreview struct {
	MetricName string    `json:"metricName" required:"true"`
	MatchType  MatchType `json:"matchType" required:"true"`
	Labels     []string  `json:"labels" required:"true" nullable:"true"`
	LookbackMs int64     `json:"lookbackMs,omitempty"`
}

func (req *PostableReductionRulePreview) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}
	if req.MetricName == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}
	if req.MatchType != MatchTypeDrop && req.MatchType != MatchTypeKeep {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"matchType must be one of %q or %q", MatchTypeDrop.StringValue(), MatchTypeKeep.StringValue())
	}
	if len(req.Labels) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "labels must not be empty")
	}
	return nil
}

type AffectedWidget struct {
	ID   string `json:"id" required:"true"`
	Name string `json:"name" required:"true"`
}

type AffectedAsset struct {
	Type           AssetType       `json:"type" required:"true"`
	ID             string          `json:"id" required:"true"`
	Name           string          `json:"name" required:"true"`
	Widget         *AffectedWidget `json:"widget,omitempty"`
	ImpactedLabels []string        `json:"impactedLabels" required:"true" nullable:"true"`
}

type GettableReductionRulePreview struct {
	IngestedSeries        uint64          `json:"ingestedSeries" required:"true"`
	CurrentRetainedSeries uint64          `json:"currentRetainedSeries" required:"true"`
	RetainedSeries        uint64          `json:"retainedSeries" required:"true"`
	ReductionPercent      float64         `json:"reductionPercent" required:"true"`
	DroppedLabels         []string        `json:"droppedLabels" required:"true" nullable:"true"`
	AffectedAssets        []AffectedAsset `json:"affectedAssets" required:"true" nullable:"true"`
	EffectiveFrom         time.Time       `json:"effectiveFrom" required:"true"`
}
