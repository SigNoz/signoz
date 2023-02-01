package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/ee/query-service/ingestionRules"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.uber.org/zap"
)

// ingestion rules handler - combines common methods for drop and sampling rules

func parseAgentConfigVersion(r *http.Request) (float32, *model.ApiError) {
	versionString := mux.Vars(r)["version"]

	if versionString == "latest" {
		return 0, nil
	}

	version64, err := strconv.ParseFloat(versionString, 32)
	if err != nil {
		return 0, model.BadRequestStr("invalid version number")
	}

	return float32(version64), nil
}

func (ah *APIHandler) listIngestionRulesHandler(w http.ResponseWriter, r *http.Request, elementType agentConf.ElementTypeDef) {

	version, err := parseAgentConfigVersion(r)
	if err != nil {
		RespondError(w, model.BadRequestStr("invalid version"), nil)
		return
	}

	var payload *ingestionRules.IngestionRulesResponse
	var apierr *model.ApiError

	if version == 0 {
		payload, apierr = ah.listIngestionRulesByVersion(context.Background(), version, elementType)
	} else {
		payload, apierr = ah.listIngestionRules(context.Background(), elementType)
	}

	if apierr != nil {
		RespondError(w, apierr, payload)
		return
	}
	ah.Respond(w, payload)
}

// listIngestionRules lists rules for latest version
func (ah *APIHandler) listIngestionRules(ctx context.Context, elementType agentConf.ElementTypeDef) (*ingestionRules.IngestionRulesResponse, *model.ApiError) {

	// get lateset agent config
	lastestConfig, err := agentConf.GetLatestVersion(ctx, elementType)
	if err != nil || lastestConfig == nil {
		zap.S().Errorf("failed to get latest agent config version ", err)
		return nil, model.InternalErrorStr("Failed to get latest agent config version")
	}

	payload, apierr := ah.opts.IngestionController.GetRulesByVersion(ctx, lastestConfig.Version)
	if apierr != nil {
		return payload, apierr
	}

	history, err := agentConf.GetConfigHistory(ctx, elementType)
	if apierr != nil {
		return payload, apierr
	}
	payload.History = history
	return payload, nil
}

// listIngestionRulesByVersion lists rules along with config version history
func (ah *APIHandler) listIngestionRulesByVersion(ctx context.Context, version float32, elementType agentConf.ElementTypeDef) (*ingestionRules.IngestionRulesResponse, *model.ApiError) {

	payload, apierr := ah.opts.IngestionController.GetRulesByVersion(ctx, version)
	if apierr != nil {
		return payload, apierr
	}

	history, err := agentConf.GetConfigHistory(ctx, elementType)
	if err != nil {
		zap.S().Errorf("failed to retreive config history for element type", elementType, err)
		return payload, model.InternalErrorStr("failed to retrieve agent config history")
	}

	payload.History = history
	return payload, nil
}

func (ah *APIHandler) createIngestionRule(w http.ResponseWriter, r *http.Request, elementType agentConf.ElementTypeDef) {

	ctx := context.Background()
	req := ingestionRules.PostableIngestionRules{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	createRule := func(ctx context.Context, postable []ingestionRules.PostableIngestionRule) (*ingestionRules.IngestionRulesResponse, *model.ApiError) {
		if len(postable) == 0 {
			zap.S().Warnf("found no rules in the http request, this will delete all the rules")
		}

		for _, p := range postable {
			if apierr := p.IsValid(); apierr != nil {
				zap.S().Debugf("received invalid dropping rule in the POST request", apierr)
				return nil, apierr
			}
		}

		return ah.opts.IngestionController.ApplyRules(ctx, elementType, postable)
	}

	ingestionRuleResponse, apierr := createRule(ctx, req.Rules)
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, ingestionRuleResponse)
}
