package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/ee/query-service/pipelines"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.uber.org/zap"
)

const logPipelines = "log_pipelines"

func (ah *APIHandler) listPipelinesHandler(w http.ResponseWriter, r *http.Request) {

	version, err := parseAgentConfigVersion(r)
	if err != nil {
		RespondError(w, model.BadRequestStr("invalid version"), nil)
		return
	}

	var payload *pipelines.PipelinesResponse
	var apierr *model.ApiError

	if version != 0 {
		payload, apierr = ah.listPipelinesByVersion(context.Background(), version)
	} else {
		payload, apierr = ah.listPipelines(context.Background())
	}

	if apierr != nil {
		RespondError(w, apierr, payload)
		return
	}
	ah.Respond(w, payload)
}

// listIngestionRules lists rules for latest version
func (ah *APIHandler) listPipelines(ctx context.Context) (*pipelines.PipelinesResponse, *model.ApiError) {

	// get lateset agent config
	lastestConfig, err := agentConf.GetLatestVersion(ctx, logPipelines)
	if err != nil || lastestConfig == nil {
		zap.S().Errorf("failed to get latest agent config version ", err)
		return nil, model.InternalErrorStr("Failed to get latest agent config version")
	}

	payload, apierr := ah.opts.PipelinesController.GetPipelinesByVersion(ctx, lastestConfig.Version)
	if apierr != nil {
		return payload, apierr
	}

	history, err := agentConf.GetConfigHistory(ctx, logPipelines)
	if err != nil {
		return payload, apierr
	}
	payload.History = history
	return payload, nil
}

// listIngestionRulesByVersion lists rules along with config version history
func (ah *APIHandler) listPipelinesByVersion(ctx context.Context, version int) (*pipelines.PipelinesResponse, *model.ApiError) {

	payload, apierr := ah.opts.PipelinesController.GetPipelinesByVersion(ctx, version)
	if apierr != nil {
		return payload, apierr
	}

	history, err := agentConf.GetConfigHistory(ctx, logPipelines)
	if err != nil {
		zap.S().Errorf("failed to retreive config history for element type", logPipelines, err)
		return payload, model.InternalErrorStr("failed to retrieve agent config history")
	}

	payload.History = history
	return payload, nil
}

func (ah *APIHandler) createPipeline(w http.ResponseWriter, r *http.Request) {

	ctx := context.Background()
	req := pipelines.PostablePipelines{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}
	fmt.Println("req:", req)
	createPipeline := func(ctx context.Context, postable []pipelines.PostablePipeline) (*pipelines.PipelinesResponse, *model.ApiError) {
		if len(postable) == 0 {
			zap.S().Warnf("found no pipelines in the http request, this will delete all the pipelines")
		}

		for _, p := range postable {
			if apierr := p.IsValid(); apierr != nil {
				zap.S().Debugf("received invalid pipeline in the POST request", apierr)
				return nil, apierr
			}
		}

		return ah.opts.PipelinesController.ApplyPipelines(ctx, postable)
	}

	res, apierr := createPipeline(ctx, req.Pipelines)
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, res)
}
