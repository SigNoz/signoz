package featuretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/open-feature/go-sdk/openfeature"
)

// A concrete wrapper around the openfeature.EvaluationContext
type FlagrEvaluationContext struct {
	ctx openfeature.EvaluationContext
}

// Creates a new FlagrEvaluationContext with given details
func NewFlagrEvaluationContext(orgID valuer.UUID) FlagrEvaluationContext {
	ctx := openfeature.NewTargetlessEvaluationContext(map[string]any{
		"orgId": orgID.String(),
	})
	return FlagrEvaluationContext{ctx: ctx}
}
