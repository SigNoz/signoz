package implinframonitoring

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
)

// splitBucket partitions one component bucket's metric and attribute lists
// against the module-wide missing sets into up to six response entries.
// Empty partitions are left nil so callers can skip them.
func splitBucket(b onboardingComponentBucket, missingMetrics, missingAttrs map[string]bool) bucketSplit {
	var s bucketSplit
	presentDef, missDef := partitionList(b.DefaultMetrics, missingMetrics)
	if len(presentDef) > 0 {
		s.PresentDefault = &inframonitoringtypes.MetricsComponentEntry{
			Metrics:             presentDef,
			AssociatedComponent: b.Component,
		}
	}
	if len(missDef) > 0 {
		s.MissingDefault = &inframonitoringtypes.MissingMetricsComponentEntry{
			MetricsComponentEntry: inframonitoringtypes.MetricsComponentEntry{
				Metrics:             missDef,
				AssociatedComponent: b.Component,
			},
			Message:           buildMissingDefaultMetricsMessage(missDef, b.Component.Name),
			DocumentationLink: b.DocumentationLink,
		}
	}

	presentOpt, missOpt := partitionList(b.OptionalMetrics, missingMetrics)
	if len(presentOpt) > 0 {
		s.PresentOptional = &inframonitoringtypes.MetricsComponentEntry{
			Metrics:             presentOpt,
			AssociatedComponent: b.Component,
		}
	}
	if len(missOpt) > 0 {
		s.MissingOptional = &inframonitoringtypes.MissingMetricsComponentEntry{
			MetricsComponentEntry: inframonitoringtypes.MetricsComponentEntry{
				Metrics:             missOpt,
				AssociatedComponent: b.Component,
			},
			Message:           buildMissingOptionalMetricsMessage(missOpt, b.Component.Name),
			DocumentationLink: b.DocumentationLink,
		}
	}

	presentA, missA := partitionList(b.RequiredAttrs, missingAttrs)
	if len(presentA) > 0 {
		s.PresentAttrs = &inframonitoringtypes.AttributesComponentEntry{
			Attributes:          presentA,
			AssociatedComponent: b.Component,
		}
	}
	if len(missA) > 0 {
		s.MissingAttrs = &inframonitoringtypes.MissingAttributesComponentEntry{
			AttributesComponentEntry: inframonitoringtypes.AttributesComponentEntry{
				Attributes:          missA,
				AssociatedComponent: b.Component,
			},
			Message:           buildMissingRequiredAttrsMessage(missA, b.Component.Name),
			DocumentationLink: b.DocumentationLink,
		}
	}

	return s
}

// getSpecForType returns the onboardingSpec for a given OnboardingType, or an error if the type is invalid.
func getSpecForType(t inframonitoringtypes.OnboardingType) (*onboardingSpec, error) {
	spec, ok := onboardingSpecs[t]
	if !ok {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "no onboarding spec for type: %s", t)
	}
	return &spec, nil
}

// partitionList splits items into those NOT in `missing` and those in `missing`.
// Preserves input order.
func partitionList(items []string, missing map[string]bool) (present, miss []string) {
	for _, x := range items {
		if missing[x] {
			miss = append(miss, x)
		} else {
			present = append(present, x)
		}
	}
	return present, miss
}

func buildMissingDefaultMetricsMessage(metrics []string, componentName string) string {
	return fmt.Sprintf(
		"Missing default metrics %s from %s. Learn how to configure here.",
		strings.Join(metrics, ", "), componentName,
	)
}

func buildMissingOptionalMetricsMessage(metrics []string, componentName string) string {
	return fmt.Sprintf(
		"Missing optional metrics %s from %s. Learn how to enable here.",
		strings.Join(metrics, ", "), componentName,
	)
}

func buildMissingRequiredAttrsMessage(attrs []string, componentName string) string {
	return fmt.Sprintf(
		"Missing required attributes %s from %s. Learn how to configure here.",
		strings.Join(attrs, ", "), componentName,
	)
}
