package api

import (
	"net/http"
)

func (ah *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet := ah.FF().GetFeatureFlags()
	ah.Respond(w, featureSet)
}
