package api

import (
	"net/http"

	"go.signoz.io/signoz/pkg/query-service/agentConf"
)

func (ah *APIHandler) listSamplingRules(w http.ResponseWriter, r *http.Request) {
	ah.listIngestionRulesHandler(w, r, agentConf.ElementTypeSamplingRules)
}
