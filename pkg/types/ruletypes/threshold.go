package ruletypes

import (
	"encoding/json"
	"math"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/converter"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type ThresholdKind struct {
	valuer.String
}

var (
	BasicThresholdKind = ThresholdKind{valuer.NewString("basic")}
)

type RuleThresholdData struct {
	Kind ThresholdKind `json:"kind"`
	Spec any           `json:"spec"`
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
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal rule threhsold spec: %v", err)
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
}

// HasActiveAlert checks if the given sample figerprint is active
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
	Eval(series v3.Series, unit string, evalData EvalData) (Vector, error)
	GetRuleReceivers() []RuleReceivers
}

type BasicRuleThreshold struct {
	Name           string    `json:"name"`
	TargetValue    *float64  `json:"target"`
	TargetUnit     string    `json:"targetUnit"`
	RecoveryTarget *float64  `json:"recoveryTarget"`
	MatchType      MatchType `json:"matchType"`
	CompareOp      CompareOp `json:"op"`
	Channels       []string  `json:"channels"`
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
	var errs []error
	for _, basicThreshold := range r {
		if err := basicThreshold.Validate(); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

func (r BasicRuleThresholds) Eval(series v3.Series, unit string, evalData EvalData) (Vector, error) {
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
		}

		// Prepare alert hash from series labels and threshold name if recovery target option was provided
		if threshold.RecoveryTarget == nil {
			continue
		}
		sampleLabels := PrepareSampleLabelsForRule(series.Labels, threshold.Name)
		alertHash := sampleLabels.Hash()
		// check if alert is active and then check if recovery threshold matches
		if evalData.HasActiveAlert(alertHash) {
			smpl, matchesRecoveryThrehold := threshold.matchesRecoveryThreshold(series, unit)
			if matchesRecoveryThrehold {
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

		compareOp := thresholds[i].getCompareOp()
		targetI := thresholds[i].target(thresholds[i].TargetUnit) //for sorting we dont need rule unit
		targetJ := thresholds[j].target(thresholds[j].TargetUnit)

		switch compareOp {
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

// convertToRuleUnit converts the given value from the target unit to the rule unit
func (b BasicRuleThreshold) convertToRuleUnit(val float64, ruleUnit string) float64 {
	unitConverter := converter.FromUnit(converter.Unit(b.TargetUnit))
	// convert the target value to the y-axis unit
	value := unitConverter.Convert(converter.Value{
		F: val,
		U: converter.Unit(b.TargetUnit),
	}, converter.Unit(ruleUnit))
	return value.F
}

// target returns the target value in the rule unit
func (b BasicRuleThreshold) target(ruleUnit string) float64 {
	return b.convertToRuleUnit(*b.TargetValue, ruleUnit)
}

// recoveryTarget returns the recovery target value in the rule unit
func (b BasicRuleThreshold) recoveryTarget(ruleUnit string) float64 {
	return b.convertToRuleUnit(*b.RecoveryTarget, ruleUnit)
}

func (b BasicRuleThreshold) getCompareOp() CompareOp {
	return b.CompareOp
}

func (b BasicRuleThreshold) Validate() error {
	var errs []error
	if b.Name == "" {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "threshold name cannot be empty"))
	}

	if b.TargetValue == nil {
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "target value cannot be nil"))
	}

	switch b.CompareOp {
	case ValueIsAbove, ValueIsBelow, ValueIsEq, ValueIsNotEq, ValueAboveOrEq, ValueBelowOrEq, ValueOutsideBounds:
		// valid compare operations
	case CompareOpNone:
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "compare operation cannot be none"))
	default:
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid compare operation: %s", string(b.CompareOp)))
	}

	switch b.MatchType {
	case AtleastOnce, AllTheTimes, OnAverage, InTotal, Last:
		// valid match types
	case MatchTypeNone:
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "match type cannot be none"))
	default:
		errs = append(errs, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid match type: %s", string(b.MatchType)))
	}

	return errors.Join(errs...)
}

func (b BasicRuleThreshold) matchesRecoveryThreshold(series v3.Series, ruleUnit string) (Sample, bool) {
	return b.shouldAlertWithTarget(series, b.recoveryTarget(ruleUnit))
}
func (b BasicRuleThreshold) shouldAlert(series v3.Series, ruleUnit string) (Sample, bool) {
	return b.shouldAlertWithTarget(series, b.target(ruleUnit))
}

func removeGroupinSetPoints(series v3.Series) []v3.Point {
	var result []v3.Point
	for _, s := range series.Points {
		if s.Timestamp >= 0 && !math.IsNaN(s.Value) && !math.IsInf(s.Value, 0) {
			result = append(result, s)
		}
	}
	return result
}

// PrepareSampleLabelsForRule prepares the labels for the sample to be used in the alerting.
// It accepts seriesLabels and thresholdName as input and returns the labels with the threshold name label added.
func PrepareSampleLabelsForRule(seriesLabels map[string]string, thresholdName string) (lbls labels.Labels) {
	lb := labels.NewBuilder(labels.Labels{})
	for name, value := range seriesLabels {
		lb.Set(name, value)
	}
	lb.Set(LabelThresholdName, thresholdName)
	lb.Set(LabelSeverityName, strings.ToLower(thresholdName))
	return lb.Labels()
}

func (b BasicRuleThreshold) shouldAlertWithTarget(series v3.Series, target float64) (Sample, bool) {
	var shouldAlert bool
	var alertSmpl Sample
	lbls := PrepareSampleLabelsForRule(series.Labels, b.Name)

	series.Points = removeGroupinSetPoints(series)

	// nothing to evaluate
	if len(series.Points) == 0 {
		return alertSmpl, false
	}

	switch b.MatchType {
	case AtleastOnce:
		// If any sample matches the condition, the rule is firing.
		if b.CompareOp == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value > target {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value < target {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp == ValueIsEq {
			for _, smpl := range series.Points {
				if smpl.Value == target {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value != target {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp == ValueOutsideBounds {
			for _, smpl := range series.Points {
				if math.Abs(smpl.Value) >= target {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		}
	case AllTheTimes:
		// If all samples match the condition, the rule is firing.
		shouldAlert = true
		alertSmpl = Sample{Point: Point{V: target}, Metric: lbls}
		if b.CompareOp == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value <= target {
					shouldAlert = false
					break
				}
			}
			// use min value from the series
			if shouldAlert {
				var minValue float64 = math.Inf(1)
				for _, smpl := range series.Points {
					if smpl.Value < minValue {
						minValue = smpl.Value
					}
				}
				alertSmpl = Sample{Point: Point{V: minValue}, Metric: lbls}
			}
		} else if b.CompareOp == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value >= target {
					shouldAlert = false
					break
				}
			}
			if shouldAlert {
				var maxValue float64 = math.Inf(-1)
				for _, smpl := range series.Points {
					if smpl.Value > maxValue {
						maxValue = smpl.Value
					}
				}
				alertSmpl = Sample{Point: Point{V: maxValue}, Metric: lbls}
			}
		} else if b.CompareOp == ValueIsEq {
			for _, smpl := range series.Points {
				if smpl.Value != target {
					shouldAlert = false
					break
				}
			}
		} else if b.CompareOp == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value == target {
					shouldAlert = false
					break
				}
			}
			// use any non-inf or nan value from the series
			if shouldAlert {
				for _, smpl := range series.Points {
					if !math.IsInf(smpl.Value, 0) && !math.IsNaN(smpl.Value) {
						alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
						break
					}
				}
			}
		} else if b.CompareOp == ValueOutsideBounds {
			for _, smpl := range series.Points {
				if math.Abs(smpl.Value) < target {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = false
					break
				}
			}
		}
	case OnAverage:
		// If the average of all samples matches the condition, the rule is firing.
		var sum, count float64
		for _, smpl := range series.Points {
			if math.IsNaN(smpl.Value) || math.IsInf(smpl.Value, 0) {
				continue
			}
			sum += smpl.Value
			count++
		}
		avg := sum / count
		alertSmpl = Sample{Point: Point{V: avg}, Metric: lbls}
		if b.CompareOp == ValueIsAbove {
			if avg > target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsBelow {
			if avg < target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsEq {
			if avg == target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsNotEq {
			if avg != target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueOutsideBounds {
			if math.Abs(avg) >= target {
				shouldAlert = true
			}
		}
	case InTotal:
		// If the sum of all samples matches the condition, the rule is firing.
		var sum float64

		for _, smpl := range series.Points {
			if math.IsNaN(smpl.Value) || math.IsInf(smpl.Value, 0) {
				continue
			}
			sum += smpl.Value
		}
		alertSmpl = Sample{Point: Point{V: sum}, Metric: lbls}
		if b.CompareOp == ValueIsAbove {
			if sum > target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsBelow {
			if sum < target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsEq {
			if sum == target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsNotEq {
			if sum != target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueOutsideBounds {
			if math.Abs(sum) >= target {
				shouldAlert = true
			}
		}
	case Last:
		// If the last sample matches the condition, the rule is firing.
		shouldAlert = false
		alertSmpl = Sample{Point: Point{V: series.Points[len(series.Points)-1].Value}, Metric: lbls}
		if b.CompareOp == ValueIsAbove {
			if series.Points[len(series.Points)-1].Value > target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsBelow {
			if series.Points[len(series.Points)-1].Value < target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsEq {
			if series.Points[len(series.Points)-1].Value == target {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsNotEq {
			if series.Points[len(series.Points)-1].Value != target {
				shouldAlert = true
			}
		}
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
