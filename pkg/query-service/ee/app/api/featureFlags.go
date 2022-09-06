package api

import (
	"net/http"
)

func (ah *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet := ah.FF().GetFeatureFlags()
	ah.WriteJSON(w, r, featureSet)
}

func (ah *APIHandler) CheckFeature(f string) error {
	return ah.FF().CheckFeature(f)
}
