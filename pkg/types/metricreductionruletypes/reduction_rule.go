package metricreductionruletypes

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeMetricReductionRuleUnsupported           = errors.MustNewCode("metric_reduction_rule_unsupported")
	ErrCodeMetricReductionRuleNotFound              = errors.MustNewCode("metric_reduction_rule_not_found")
	ErrCodeMetricReductionRuleProtectedLabel        = errors.MustNewCode("metric_reduction_rule_protected_label")
	ErrCodeMetricReductionRuleUnsupportedMetricType = errors.MustNewCode("metric_reduction_rule_unsupported_metric_type")
)

type MatchType struct {
	valuer.String
}

var (
	MatchTypeDrop = MatchType{valuer.NewString("drop")}
	MatchTypeKeep = MatchType{valuer.NewString("keep")}
)

func (MatchType) Enum() []any {
	return []any{MatchTypeDrop, MatchTypeKeep}
}

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

type Order struct {
	valuer.String
}

var (
	OrderAsc  = Order{valuer.NewString("asc")}
	OrderDesc = Order{valuer.NewString("desc")}
)

func (Order) Enum() []any {
	return []any{OrderAsc, OrderDesc}
}

type ReductionRuleOrderBy struct {
	valuer.String
}

var (
	OrderByMetricName     = ReductionRuleOrderBy{valuer.NewString("metricName")}
	OrderByIngestedVolume = ReductionRuleOrderBy{valuer.NewString("ingestedVolume")}
	OrderByReducedVolume  = ReductionRuleOrderBy{valuer.NewString("reducedVolume")}
	OrderByReduction      = ReductionRuleOrderBy{valuer.NewString("reduction")}
	OrderByLastUpdated    = ReductionRuleOrderBy{valuer.NewString("lastUpdated")}
)

func (ReductionRuleOrderBy) Enum() []any {
	return []any{OrderByMetricName, OrderByIngestedVolume, OrderByReducedVolume, OrderByReduction, OrderByLastUpdated}
}

// LabelList is a []string persisted as a single JSON text column.
type LabelList []string

func (l LabelList) Value() (driver.Value, error) {
	if l == nil {
		return "[]", nil
	}
	b, err := json.Marshal(l)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (l *LabelList) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	case nil:
		*l = nil
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "metricreductionruletypes: cannot scan %T into LabelList", src)
	}
	return json.Unmarshal(raw, l)
}

type StorableReductionRule struct {
	bun.BaseModel `bun:"table:metric_reduction_rule" json:"-"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID         valuer.UUID `bun:"org_id,type:text,notnull"`
	MetricName    string      `bun:"metric_name,type:text,notnull"`
	MatchType     MatchType   `bun:"match_type,type:text,notnull"`
	Labels        LabelList   `bun:"labels,type:text,notnull,default:'[]'"`
	EffectiveFrom time.Time   `bun:"effective_from,notnull"`
}

func NewReductionRule(orgID valuer.UUID, metricName string, matchType MatchType, labels []string, effectiveFrom time.Time, by string) *StorableReductionRule {
	now := time.Now()
	return &StorableReductionRule{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: by, UpdatedBy: by},
		OrgID:         orgID,
		MetricName:    metricName,
		MatchType:     matchType,
		Labels:        LabelList(labels),
		EffectiveFrom: effectiveFrom,
	}
}

type GettableReductionRule struct {
	MetricName       string    `json:"metricName" required:"true"`
	MatchType        MatchType `json:"matchType" required:"true"`
	Labels           []string  `json:"labels" required:"true" nullable:"true"`
	EffectiveFrom    time.Time `json:"effectiveFrom" required:"true"`
	UpdatedAt        time.Time `json:"updatedAt" required:"true"`
	UpdatedBy        string    `json:"updatedBy" required:"true"`
	Active           bool      `json:"active" required:"true"`
	IngestedSeries   uint64    `json:"ingestedSeries" required:"true"`
	ReducedSeries    uint64    `json:"reducedSeries" required:"true"`
	ReductionPercent float64   `json:"reductionPercent" required:"true"`
}

type GettableReductionRules struct {
	Rules []GettableReductionRule `json:"rules" required:"true" nullable:"true"`
	Total int                     `json:"total" required:"true"`
}

type ListReductionRulesParams struct {
	OrderBy ReductionRuleOrderBy `query:"orderBy,default=reduction" json:"orderBy"`
	Order   Order                `query:"order,default=desc" json:"order"`
	Offset  int                  `query:"offset" json:"offset"`
	Limit   int                  `query:"limit" json:"limit"`
}

func (p *ListReductionRulesParams) Validate() error {
	if p.Limit <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be greater than 0")
	}
	if p.Offset < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "offset must not be negative")
	}
	return nil
}

type PostableReductionRule struct {
	MetricName string    `json:"-"`
	MatchType  MatchType `json:"matchType" required:"true"`
	Labels     []string  `json:"labels" required:"true" nullable:"true"`
}

func (req *PostableReductionRule) Validate() error {
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
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"labels must not be empty; to allow all attributes, delete the rule instead")
	}
	return nil
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

type AffectedAsset struct {
	Type           AssetType `json:"type" required:"true"`
	ID             string    `json:"id" required:"true"`
	Name           string    `json:"name" required:"true"`
	Widget         string    `json:"widget,omitempty"`
	ImpactedLabels []string  `json:"impactedLabels" required:"true" nullable:"true"`
}

type GettableReductionRulePreview struct {
	IngestedSeries   uint64          `json:"ingestedSeries" required:"true"`
	ReducedSeries    uint64          `json:"reducedSeries" required:"true"`
	ReductionPercent float64         `json:"reductionPercent" required:"true"`
	DroppedLabels    []string        `json:"droppedLabels" required:"true" nullable:"true"`
	AffectedAssets   []AffectedAsset `json:"affectedAssets" required:"true" nullable:"true"`
	EffectiveFrom    time.Time       `json:"effectiveFrom" required:"true"`
}
