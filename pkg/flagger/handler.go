package flagger

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Handler interface {
	GetFeatures(http.ResponseWriter, *http.Request)
}

type handler struct {
	flagger   Flagger
	orgGetter organization.Getter
}

func NewHandler(flagger Flagger, orgGetter organization.Getter) Handler {
	return &handler{
		flagger:   flagger,
		orgGetter: orgGetter,
	}
}

func (handler *handler) GetFeatures(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	org, err := handler.orgGetter.Get(ctx, orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	evalCtx := featuretypes.NewFlaggerEvaluationContext(org.ID)

	features, err := handler.flagger.List(ctx, evalCtx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, features)
}
