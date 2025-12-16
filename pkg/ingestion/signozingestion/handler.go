package signozingestion

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/ingestion"
	"github.com/SigNoz/signoz/pkg/types/ingestiontypes"
)

type signozapi struct {
	ingestion ingestion.Ingestion
}

func NewHandler(ingestion ingestion.Ingestion) ingestion.Handler {
	return &signozapi{ingestion: ingestion}
}

func (api *signozapi) Get(rw http.ResponseWriter, r *http.Request) {
	cfg := api.ingestion.GetConfig()

	render.Success(rw, http.StatusOK, ingestiontypes.NewGettableIngestion(cfg.URL))
}
