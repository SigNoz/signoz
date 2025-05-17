package featuretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/open-feature/go-sdk/openfeature"
)

type EvaluationContext struct {
	ctx openfeature.EvaluationContext
}

func NewEvaluationContext(orgID valuer.UUID) EvaluationContext {
	return EvaluationContext{
		ctx: openfeature.NewTargetlessEvaluationContext(map[string]interface{}{
			"orgId": orgID,
		}),
	}
}

func (ctx EvaluationContext) Ctx() openfeature.EvaluationContext {
	return ctx.ctx
}

func (ctx EvaluationContext) OrgID() valuer.UUID {
	orgId, ok := ctx.ctx.Attribute("orgId").(valuer.UUID)
	if !ok {
		// This should never happen
		return valuer.UUID{}
	}

	return orgId
}
