package api

import (
	"net/http"

	"go.signoz.io/signoz/pkg/query-service/agentConf"
)

func (ah *APIHandler) listSamplingRules(w http.ResponseWriter, r *http.Request) {
	ah.listIngestionRulesHandler(w, r, agentConf.ElementTypeSamplingRules)
}

func (ah *APIHandler) createSamplingRule(w http.ResponseWriter, r *http.Request) {
	ah.createIngestionRule(w, r, agentConf.ElementTypeSamplingRules)
}

func (ah *APIHandler) deploySamplingRules(w http.ResponseWriter, r *http.Request) {
	ah.redeployIngestionRule(w, r, agentConf.ElementTypeSamplingRules)
}
