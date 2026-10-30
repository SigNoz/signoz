package resolvercore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// FamilyValueNames returns the spellings whose values merge into the
// suggestions. With the flag off, the requested name alone.
func FamilyValueNames(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger, signal telemetrytypes.Signal, fieldValueSelector *telemetrytypes.FieldValueSelector) []string {
	if !querybuilder.SemconvFamiliesEnabled(ctx, orgID, fl) {
		return []string{fieldValueSelector.Name}
	}
	selector := telemetrytypes.FieldKeySelector{
		Name:          fieldValueSelector.Name,
		Signal:        signal,
		FieldContext:  fieldValueSelector.FieldContext,
		MetricContext: fieldValueSelector.MetricContext,
	}
	if signal == telemetrytypes.SignalMetrics {
		return querybuilder.MetricLabelSpellings(selector)
	}
	return semconv.Members(semconv.KindAttribute, selector)
}
