package flagger

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Handler interface {
	GetFeatures(http.ResponseWriter, *http.Request)
}

type handler struct {
	flagger          Flagger
	providerSettings factory.ProviderSettings
}

func NewHandler(flagger Flagger, providerSettings factory.ProviderSettings) Handler {
	return &handler{
		flagger:          flagger,
		providerSettings: providerSettings,
	}
}

func (h *handler) GetFeatures(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Create evaluation context (could get orgID from claims if needed)
	evalCtx := featuretypes.NewFlaggerEvaluationContext(valuer.GenerateUUID())

	features, err := h.flagger.List(ctx, evalCtx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, features)
}
