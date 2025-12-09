package api

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
)

type GettableIngestionConfig struct {
	URL string `json:"url"`
}

func (ah *APIHandler) getIngestionConfig(rw http.ResponseWriter, r *http.Request) {
	gettableIngestionConfig := &GettableIngestionConfig{
		URL: ah.opts.IngestionConfig.URL.String(),
	}

	render.Success(rw, http.StatusOK, gettableIngestionConfig)
}
