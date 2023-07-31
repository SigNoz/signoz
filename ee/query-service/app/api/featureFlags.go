package api

import (
	"net/http"

	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

func (ah *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet, err := ah.FF().GetFeatureFlags()
	if err != nil {
		ah.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	if ah.opts.PreferSpanMetrics {
		for idx := range featureSet {
			feature := &featureSet[idx]
			if feature.Name == basemodel.UseSpanMetrics {
				featureSet[idx].Active = true
			}
		}
	}
	ah.Respond(w, featureSet)
}
