package api

import (
	"net/http"
)

// methods that use user session or jwt to return
// user specific data

func (ah *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet := ah.LM().GetFeatureFlags()
	ah.WriteJSON(w, r, featureSet)
}

func (ah *APIHandler) CheckFeature(f string) error {
	return ah.FF().CheckFeature(f)
}
