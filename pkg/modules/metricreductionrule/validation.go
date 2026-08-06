package metricreductionrule

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var protectedLabels = buildProtectedLabels()

// ValidatePostableReductionRule validates request structure and protected-label
// policy before a rule reaches storage.
func ValidatePostableReductionRule(req *metricreductionruletypes.PostableReductionRule) error {
	if err := req.Validate(); err != nil {
		return err
	}
	return validateProtectedLabels(req.MatchType, req.Labels)
}

// ValidateUpdatableReductionRule validates request structure and
// protected-label policy before a rule reaches storage.
func ValidateUpdatableReductionRule(req *metricreductionruletypes.UpdatableReductionRule) error {
	if err := req.Validate(); err != nil {
		return err
	}
	return validateProtectedLabels(req.MatchType, req.Labels)
}

// IsProtectedLabel reports whether metric reduction must always retain label.
func IsProtectedLabel(label string) bool {
	_, ok := protectedLabels[label]
	return ok
}

func buildProtectedLabels() map[string]struct{} {
	labels := map[string]struct{}{
		"le":              {},
		"quantile":        {},
		"__name__":        {},
		"__temporality__": {},
	}
	selector := telemetrytypes.FieldKeySelector{
		Name:         "deployment.environment.name",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextResource,
	}
	for _, member := range semconv.Members(semconv.KindAttribute, selector) {
		labels[member] = struct{}{}
	}
	return labels
}

func validateProtectedLabels(matchType metricreductionruletypes.MatchType, labels []string) error {
	if matchType != metricreductionruletypes.MatchTypeDrop {
		return nil
	}
	for _, label := range labels {
		if IsProtectedLabel(label) {
			return errors.Newf(errors.TypeInvalidInput, metricreductionruletypes.ErrCodeMetricReductionRuleProtectedLabel,
				"label %q is protected and cannot be dropped", label)
		}
	}
	return nil
}
