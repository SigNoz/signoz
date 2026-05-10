package ruletypes

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/units"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/swaggest/jsonschema-go"
)

type ThresholdKind struct {
	valuer.String
}

var (
	BasicThresholdKind = ThresholdKind{valuer.NewString("basic")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for ThresholdKind.
func (ThresholdKind) Enum() []any {
	return []any{
		BasicThresholdKind,
	}
}

type RuleThresholdData struct {
	Kind ThresholdKind `json:"kind" required:"true"`
	Spec any           `json:"spec" required:"true"`
}

// thresholdBasic is the OpenAPI schema for a RuleThresholdData with kind=basic.
type thresholdBasic struct {
	Kind ThresholdKind       `json:"kind" description:"The kind of threshold." required:"true"`
	Spec BasicRuleThresholds `json:"spec" description:"The basic threshold specification (array of thresholds)." required:"true"`
}

var (
	_ jsonschema.OneOfExposer = RuleThresholdData{}
	_ jsonschema.Preparer     = RuleThresholdData{}
)

// JSONSchemaOneOf returns the oneOf variants for the RuleThresholdData discriminated union.
// Each variant represents a different threshold kind with its corresponding spec schema.
func (RuleThresholdData) JSONSchemaOneOf() []any {
	return []any{
		thresholdBasic{},
	}
}

// PrepareJSONSchema marks the schema with x-signoz-discriminator;
// signoz.attachDiscriminators promotes it to a real OpenAPI 3
// discriminator after reflection.
func (RuleThresholdData) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if schema.ExtraProperties == nil {
		schema.ExtraProperties = map[string]any{}
	}

	schema.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "kind",
		"mapping": map[string]string{
			"basic": "#/components/schemas/RuletypesThresholdBasic",
		},
	}

	return nil
}

func (r *RuleThresholdData) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal raw rule threshold json: %v", err)
	}
	if err := json.Unmarshal(raw["kind"], &r.Kind); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal rule threshold kind: %v", err)
	}
	switch r.Kind {
	case BasicThresholdKind:
		var basicThresholds BasicRuleThresholds
		if err := json.Unmarshal(raw["spec"], &basicThresholds); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal rule threshold spec: %v", err)
		}
		if err := basicThresholds.Validate(); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid rule threshold spec: %v", err)
		}
		r.Spec = basicThresholds

	default:
		return errors.NewInvalidInputf(errors.CodeUnsupported, "unknown threshold kind")
	}

	return nil
}

type RuleReceivers struct {
	Channels []string `json:"channels"`
	Name     string   `json:"name"`
}

// EvalData are other dependent values used to evaluate the threshold rules.
type EvalData struct {
	// ActiveAlerts is a map of active alert fingerprints
	// used to check if a sample is part of an active alert
	// when evaluating the recovery threshold.
	ActiveAlerts map[uint64]struct{}

	// SendUnmatched is a flag to return samples
	// even if they don't match the rule condition.
	// This is useful in testing the rule.
	SendUnmatched bool
}

// HasActiveAlert checks if the given sample fingerprint is active
// as an alert.
func (eval EvalData) HasActiveAlert(sampleLabelFp uint64) bool {
	if len(eval.ActiveAlerts) == 0 {
		return false
	}
	_, ok := eval.ActiveAlerts[sampleLabelFp]
	return ok
}

type RuleThreshold interface {
	// Eval runs the given series through the threshold rules
	// using the given EvalData and returns the matching series
	Eval(series *qbtypes.TimeSeries, unit string, evalData EvalData) (Vector, error)
	GetRuleReceivers() []RuleReceivers
}

type BasicRuleThreshold struct {
	Name            string          `json:"name" required:"true"`
	TargetValue     *float64        `json:"target" required:"true"`
	TargetUnit      string          `json:"targetUnit"`
	RecoveryTarget  *float64        `json:"recoveryTarget"`
	MatchType       MatchType       `json:"matchType" required:"true"`
	CompareOperator CompareOperator `json:"op" required:"true"`
	Channels        []string        `json:"channels"`
}

type BasicRuleThresholds []BasicRuleThreshold

func (r BasicRuleThresholds) GetRuleReceivers() []RuleReceivers {
	thresholds := []BasicRuleThreshold(r)
	var receiverRoutes []RuleReceivers
	sortThresholds(thresholds)
	for _, threshold := range thresholds {
		receiverRoutes = append(receiverRoutes, RuleReceivers{
			Name:     threshold.Name,
			Channels: threshold.Channels,
		})
	}
	return receiverRoutes
}

func (r BasicRuleThresholds) Validate() error {
	if len(r) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "condition.thresholds.spec: must have at least one threshold")
	}
	var errs []error
	for _, basicThreshold := range r {
		if err := basicThreshold.Validate(); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

func (r BasicRuleThresholds) Eval(s *qbtypes.TimeSeries, unit string, evalData EvalData) (Vector, error) {

	series := &qbtypes.TimeSeries{
		Labels: s.Labels,
		Values: s.EvaluableValues(),
	}

	var resultVector Vector
	thresholds := []BasicRuleThreshold(r)
	sortThresholds(thresholds)
	for _, threshold := range thresholds {
		smpl, shouldAlert := threshold.shouldAlert(series, unit)
		if shouldAlert {
			smpl.Target = *threshold.TargetValue
			if threshold.RecoveryTarget != nil {
				smpl.RecoveryTarget = threshold.RecoveryTarget
			}
			smpl.TargetUnit = threshold.TargetUnit
			resultVector = append(resultVector, smpl)
			continue
		} else if evalData.SendUnmatched {
			// Sanitise the series points to remove any NaN or Inf values
			if len(series.Values) == 0 {
				continue
			}
			// prepare the sample with the first point of the series
			smpl := Sample{
				Point:      Point{T: series.Values[0].Timestamp, V: series.Values[0].Value},
				Metric:     PrepareSampleLabelsForRule(series.Labels, threshold.Name),
				Target:     *threshold.TargetValue,
				TargetUnit: threshold.TargetUnit,
			}
			if threshold.RecoveryTarget != nil {
				smpl.RecoveryTarget = threshold.RecoveryTarget
			}
			resultVector = append(resultVector, smpl)
			continue
		}

		// Prepare alert hash from series labels and threshold name if recovery target option was provided
		if threshold.RecoveryTarget == nil {
			continue
		}
		sampleLabels := PrepareSampleLabelsForRule(series.Labels, threshold.Name)
		alertHash := sampleLabels.Hash()
		// check if alert is active and then check if recovery threshold matches
		if evalData.HasActiveAlert(alertHash) {
			smpl, matchesRecoveryThreshold := threshold.matchesRecoveryThreshold(series, unit)
			if matchesRecoveryThreshold {
				smpl.Target = *threshold.TargetValue
				smpl.RecoveryTarget = threshold.RecoveryTarget
				smpl.TargetUnit = threshold.TargetUnit
				// IsRecovering to notify that metrics is in recovery stage
				smpl.IsRecovering = true
				resultVector = append(resultVector, smpl)
			}
		}
	}
	return resultVector, nil
}

func sortThresholds(thresholds []BasicRuleThreshold) {
	sort.Slice(thresholds, func(i, j int) bool {

		targetI := thresholds[i].target(thresholds[i].TargetUnit) //for sorting we dont need rule unit
		targetJ := thresholds[j].target(thresholds[j].TargetUnit)

		switch thresholds[i].CompareOperator.Normalize() {
		case ValueIsAbove, ValueAboveOrEq, ValueOutsideBounds:
			// For "above" operations, sort descending (higher values first)
			return targetI > targetJ
		case ValueIsBelow, ValueBelowOrEq:
			// For "below" operations, sort ascending (lower values first)
			return targetI < targetJ
		default:
			// For equal/not equal operations, use descending as default
			return targetI > targetJ
		}
	})
}

// convertToRuleUnit converts the given value from the target unit to the rule unit.
func (b BasicRuleThreshold) convertToRuleUnit(val float64, ruleUnit string) float64 {
	unitConverter := units.ConverterFromUnit(units.Unit(b.TargetUnit))
	// convert the target value to the y-axis unit
	value := unitConverter.Convert(units.Value{
		F: val,
		U: units.Unit(b.TargetUnit),
	}, units.Unit(ruleUnit))
	return value.F
}

// target returns the target value in the rule unit.
func (b BasicRuleThreshold) target(ruleUnit string) float64 {
	return b.convertToRuleUnit(*b.TargetValue, ruleUnit)
}

// recoveryTarget returns the recovery target value in the rule unit.
func (b BasicRuleThreshold) recoveryTarget(ruleUnit string) float64 {
	return b.convertToRuleUnit(*b.RecoveryTarget, ruleUnit)
}

func (b BasicRuleThreshold) Validate() error {
	var errs []error
	if b.Name == "" {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "threshold name cannot be empty"))
	}

	if b.TargetValue == nil {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "target value cannot be nil"))
	}

	if err := b.CompareOperator.Validate(); err != nil {
		errs = append(errs, err)
	}
	if err := b.MatchType.Validate(); err != nil {
		errs = append(errs, err)
	}

	return errors.Join(errs...)
}

func (b BasicRuleThreshold) matchesRecoveryThreshold(series *qbtypes.TimeSeries, ruleUnit string) (Sample, bool) {
	return b.shouldAlertWithTarget(series, b.recoveryTarget(ruleUnit))
}
func (b BasicRuleThreshold) shouldAlert(series *qbtypes.TimeSeries, ruleUnit string) (Sample, bool) {
	return b.shouldAlertWithTarget(series, b.target(ruleUnit))
}

// PrepareSampleLabelsForRule prepares the labels for the sample to be used in the alerting.
// It accepts seriesLabels and thresholdName as input and returns the labels with the threshold name label added.
func PrepareSampleLabelsForRule(seriesLabels []*qbtypes.Label, thresholdName string) Labels {
	lb := NewBuilder()
	for _, label := range seriesLabels {
		lb.Set(label.Key.Name, fmt.Sprint(label.Value))
	}
	lb.Set(LabelThresholdName, thresholdName)
	lb.Set(LabelSeverityName, strings.ToLower(thresholdName))
	return lb.Labels()
}

// matchesCompareOp checks if a value matches the compare operator against target.
func matchesCompareOp(op CompareOperator, value, target float64) bool {
	switch op {
	case ValueIsAbove:
		return value > target
	case ValueIsBelow:
		return value < target
	case ValueIsEq:
		return value == target
	case ValueIsNotEq:
		return value != target
	case ValueAboveOrEq:
		return value >= target
	case ValueBelowOrEq:
		return value <= target
	case ValueOutsideBounds:
		return math.Abs(value) >= target
	default:
		return false
	}
}

// negatesCompareOp checks if a value does NOT match the compare operator against target.
func negatesCompareOp(op CompareOperator, value, target float64) bool {
	return !matchesCompareOp(op, value, target)
}

func (b BasicRuleThreshold) shouldAlertWithTarget(series *qbtypes.TimeSeries, target float64) (Sample, bool) {
	var shouldAlert bool
	var alertSmpl Sample
	lbls := PrepareSampleLabelsForRule(series.Labels, b.Name)

	// nothing to evaluate
	if len(series.Values) == 0 {
		return alertSmpl, false
	}

	// Normalize to canonical forms so evaluation uses simple == checks
	op := b.CompareOperator.Normalize()
	matchType := b.MatchType.Normalize()

	switch matchType {
	case AtleastOnce:
		// If any sample matches the condition, the rule is firing.
		for _, smpl := range series.Values {
			if matchesCompareOp(op, smpl.Value, target) {
				alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
				shouldAlert = true
				break
			}
		}
	case AllTheTimes:
		// If all samples match the condition, the rule is firing.
		shouldAlert = true
		alertSmpl = Sample{Point: Point{V: target}, Metric: lbls}
		for _, smpl := range series.Values {
			if negatesCompareOp(op, smpl.Value, target) {
				alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
				shouldAlert = false
				break
			}
		}
		if shouldAlert {
			switch op {
			case ValueIsAbove, ValueAboveOrEq, ValueOutsideBounds:
				// use min value from the series
				var minValue = math.Inf(1)
				for _, smpl := range series.Values {
					if smpl.Value < minValue {
						minValue = smpl.Value
					}
				}
				alertSmpl = Sample{Point: Point{V: minValue}, Metric: lbls}
			case ValueIsBelow, ValueBelowOrEq:
				// use max value from the series
				var maxValue = math.Inf(-1)
				for _, smpl := range series.Values {
					if smpl.Value > maxValue {
						maxValue = smpl.Value
					}
				}
				alertSmpl = Sample{Point: Point{V: maxValue}, Metric: lbls}
			case ValueIsNotEq:
				// use any non-inf and non-nan value from the series
				for _, smpl := range series.Values {
					if !math.IsInf(smpl.Value, 0) && !math.IsNaN(smpl.Value) {
						alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
						break
					}
				}
			}
		}
	case OnAverage:
		// If the average of all samples matches the condition, the rule is firing.
		var sum, count float64
		for _, smpl := range series.Values {
			if math.IsNaN(smpl.Value) || math.IsInf(smpl.Value, 0) {
				continue
			}
			sum += smpl.Value
			count++
		}
		avg := sum / count
		alertSmpl = Sample{Point: Point{V: avg}, Metric: lbls}
		shouldAlert = matchesCompareOp(op, avg, target)
	case InTotal:
		// If the sum of all samples matches the condition, the rule is firing.
		var sum float64
		for _, smpl := range series.Values {
			if math.IsNaN(smpl.Value) || math.IsInf(smpl.Value, 0) {
				continue
			}
			sum += smpl.Value
		}
		alertSmpl = Sample{Point: Point{V: sum}, Metric: lbls}
		shouldAlert = matchesCompareOp(op, sum, target)
	case Last:
		// If the last sample matches the condition, the rule is firing.
		lastValue := series.Values[len(series.Values)-1].Value
		alertSmpl = Sample{Point: Point{V: lastValue}, Metric: lbls}
		shouldAlert = matchesCompareOp(op, lastValue, target)
	}
	return alertSmpl, shouldAlert
}

func (r *RuleThresholdData) GetRuleThreshold() (RuleThreshold, error) {
	if r == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "rule threshold is nil")
	}
	switch r.Kind {
	case BasicThresholdKind:
		if thresholds, ok := r.Spec.(BasicRuleThresholds); ok {
			basic := BasicRuleThresholds(thresholds)
			return basic, nil
		}
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid rule threshold spec")
	default:
		return nil, errors.NewInvalidInputf(errors.CodeUnsupported, "unknown threshold kind")
	}
}
