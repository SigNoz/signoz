package api

import (
	"net/http"
)

func (ah *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet, err := ah.FF().GetFeatureFlags()
	if err != nil {
		ah.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	ah.Respond(w, featureSet)
}
