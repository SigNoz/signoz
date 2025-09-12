package ruletypes

import (
	"encoding/json"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/converter"
	"github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/valuer"
	"math"
	"sort"
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

type RuleThreshold interface {
	ShouldAlert(series v3.Series) (Vector, error)
}

type BasicRuleThreshold struct {
	Name           string    `json:"name"`
	TargetValue    *float64  `json:"target"`
	TargetUnit     string    `json:"targetUnit"`
	RuleUnit       string    `json:"ruleUnit"`
	RecoveryTarget *float64  `json:"recoveryTarget"`
	MatchType      MatchType `json:"matchType"`
	CompareOp      CompareOp `json:"op"`
	SelectedQuery  string    `json:"selectedQuery"`
}

type BasicRuleThresholds []BasicRuleThreshold

func (r BasicRuleThresholds) Validate() error {
	var errs []error
	for _, basicThreshold := range r {
		if err := basicThreshold.Validate(); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

func (r BasicRuleThresholds) ShouldAlert(series v3.Series) (Vector, error) {
	var resultVector Vector
	thresholds := []BasicRuleThreshold(r)
	sort.Slice(thresholds, func(i, j int) bool {
		compareOp := thresholds[i].GetCompareOp()
		targetI := thresholds[i].Target()
		targetJ := thresholds[j].Target()

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
	for _, threshold := range thresholds {
		smpl, shouldAlert := threshold.ShouldAlert(series)
		if shouldAlert {
			resultVector = append(resultVector, smpl)
		}
	}
	return resultVector, nil
}

func (b BasicRuleThreshold) GetName() string {
	return b.Name
}

func (b BasicRuleThreshold) Target() float64 {
	unitConverter := converter.FromUnit(converter.Unit(b.TargetUnit))
	// convert the target value to the y-axis unit
	value := unitConverter.Convert(converter.Value{
		F: *b.TargetValue,
		U: converter.Unit(b.TargetUnit),
	}, converter.Unit(b.RuleUnit))
	return value.F
}

func (b BasicRuleThreshold) GetRecoveryTarget() float64 {
	if b.RecoveryTarget == nil {
		return 0
	} else {
		return *b.RecoveryTarget
	}
}

func (b BasicRuleThreshold) GetMatchType() MatchType {
	return b.MatchType
}

func (b BasicRuleThreshold) GetCompareOp() CompareOp {
	return b.CompareOp
}

func (b BasicRuleThreshold) GetSelectedQuery() string {
	return b.SelectedQuery
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

func removeGroupinSetPoints(series v3.Series) []v3.Point {
	var result []v3.Point
	for _, s := range series.Points {
		if s.Timestamp >= 0 && !math.IsNaN(s.Value) && !math.IsInf(s.Value, 0) {
			result = append(result, s)
		}
	}
	return result
}

func (b BasicRuleThreshold) ShouldAlert(series v3.Series) (Sample, bool) {
	var shouldAlert bool
	var alertSmpl Sample
	var lbls labels.Labels

	for name, value := range series.Labels {
		lbls = append(lbls, labels.Label{Name: name, Value: value})
	}

	lbls = append(lbls, labels.Label{Name: LabelThresholdName, Value: b.Name})

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
				if smpl.Value > b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value < b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp == ValueIsEq {
			for _, smpl := range series.Points {
				if smpl.Value == b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value != b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp == ValueOutsideBounds {
			for _, smpl := range series.Points {
				if math.Abs(smpl.Value) >= b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		}
	case AllTheTimes:
		// If all samples match the condition, the rule is firing.
		shouldAlert = true
		alertSmpl = Sample{Point: Point{V: b.Target()}, Metric: lbls}
		if b.CompareOp == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value <= b.Target() {
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
				if smpl.Value >= b.Target() {
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
				if smpl.Value != b.Target() {
					shouldAlert = false
					break
				}
			}
		} else if b.CompareOp == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value == b.Target() {
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
				if math.Abs(smpl.Value) < b.Target() {
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
			if avg > b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsBelow {
			if avg < b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsEq {
			if avg == b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsNotEq {
			if avg != b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueOutsideBounds {
			if math.Abs(avg) >= b.Target() {
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
			if sum > b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsBelow {
			if sum < b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsEq {
			if sum == b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsNotEq {
			if sum != b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueOutsideBounds {
			if math.Abs(sum) >= b.Target() {
				shouldAlert = true
			}
		}
	case Last:
		// If the last sample matches the condition, the rule is firing.
		shouldAlert = false
		alertSmpl = Sample{Point: Point{V: series.Points[len(series.Points)-1].Value}, Metric: lbls}
		if b.CompareOp == ValueIsAbove {
			if series.Points[len(series.Points)-1].Value > b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsBelow {
			if series.Points[len(series.Points)-1].Value < b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsEq {
			if series.Points[len(series.Points)-1].Value == b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp == ValueIsNotEq {
			if series.Points[len(series.Points)-1].Value != b.Target() {
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
