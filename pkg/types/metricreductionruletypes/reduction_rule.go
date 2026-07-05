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
	ErrCodeMetricReductionRuleAlreadyExists         = errors.MustNewCode("metric_reduction_rule_already_exists")
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

type ReductionRule struct {
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

func NewReductionRule(orgID valuer.UUID, metricName string, matchType MatchType, labels []string, effectiveFrom time.Time, by string) *ReductionRule {
	now := time.Now()
	return &ReductionRule{
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
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	MetricName       string    `json:"metricName" required:"true"`
	MatchType        MatchType `json:"matchType" required:"true"`
	Labels           []string  `json:"labels" required:"true" nullable:"true"`
	EffectiveFrom    time.Time `json:"effectiveFrom" required:"true"`
	Active           bool      `json:"active" required:"true"`
	IngestedSeries   uint64    `json:"ingestedSeries" required:"true"`
	RetainedSeries   uint64    `json:"retainedSeries" required:"true"`
	IngestedSamples  uint64    `json:"ingestedSamples" required:"true"`
	RetainedSamples  uint64    `json:"retainedSamples" required:"true"`
}

type GettableReductionRules struct {
	Rules []GettableReductionRule `json:"rules" required:"true" nullable:"true"`
	Total int                     `json:"total" required:"true"`
}

type UpdatableReductionRule struct {
	MatchType MatchType `json:"matchType" required:"true"`
	Labels    []string  `json:"labels" required:"true" nullable:"true"`
}

type PostableReductionRule struct {
	MetricName string `json:"metricName" required:"true"`
	UpdatableReductionRule
}

var protectedLabels = map[string]struct{}{
	"le":                     {},
	"quantile":               {},
	"__name__":               {},
	"__temporality__":        {},
	"deployment.environment": {},
}

// IsProtectedLabel reports whether a label is always retained regardless of a reduction rule.
func IsProtectedLabel(label string) bool {
	_, ok := protectedLabels[label]
	return ok
}

func (req *UpdatableReductionRule) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}
	if req.MatchType != MatchTypeDrop && req.MatchType != MatchTypeKeep {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"matchType must be one of %q or %q", MatchTypeDrop.StringValue(), MatchTypeKeep.StringValue())
	}
	if len(req.Labels) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"labels must not be empty; to allow all attributes, delete the rule instead")
	}
	if req.MatchType == MatchTypeDrop {
		for _, label := range req.Labels {
			if IsProtectedLabel(label) {
				return errors.Newf(errors.TypeInvalidInput, ErrCodeMetricReductionRuleProtectedLabel,
					"label %q is protected and cannot be dropped", label)
			}
		}
	}
	return nil
}

func (req *PostableReductionRule) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}
	if req.MetricName == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}
	return req.UpdatableReductionRule.Validate()
}
