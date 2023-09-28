package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

// Controller takes care of deployment cycle of log parsing pipelines.
type LogParsingPipelineController struct {
	Repo
}

func NewLogParsingPipelinesController(db *sqlx.DB, engine string) (*LogParsingPipelineController, error) {
	repo := NewRepo(db)
	err := repo.InitDB(engine)
	return &LogParsingPipelineController{Repo: repo}, err
}

// PipelinesResponse is used to prepare http response for pipelines config related requests
type PipelinesResponse struct {
	*agentConf.ConfigVersion

	Pipelines []Pipeline                `json:"pipelines"`
	History   []agentConf.ConfigVersion `json:"history"`
}

// ApplyPipelines stores new or changed pipelines and initiates a new config update
func (ic *LogParsingPipelineController) ApplyPipelines(
	ctx context.Context,
	postable []PostablePipeline,
) (*PipelinesResponse, *model.ApiError) {
	// get user id from context
	userId, authErr := auth.ExtractUserIdFromContext(ctx)
	if authErr != nil {
		return nil, model.UnauthorizedError(errors.Wrap(authErr, "failed to get userId from context"))
	}

	var pipelines []Pipeline

	// scan through postable pipelines, to select the existing pipelines or insert missing ones
	for _, r := range postable {

		// note: we process only new and changed pipelines here, deleted pipelines are not expected
		// from client. if user deletes a pipelines, the client should not send that pipelines in the update.
		// in effect, the new config version will not have that pipelines.

		if r.Id == "" {
			// looks like a new or changed pipeline, store it first
			inserted, err := ic.insertPipeline(ctx, &r)
			if err != nil {
				zap.S().Errorf("failed to insert edited pipeline %s", err.Error())
				return nil, model.WrapApiError(err, "failed to insert edited pipeline")
			} else {
				pipelines = append(pipelines, *inserted)
			}
		} else {
			selected, err := ic.GetPipeline(ctx, r.Id)
			if err != nil {
				zap.S().Errorf("failed to find edited pipeline %s", err.Error())
				return nil, model.WrapApiError(err, "failed to find edited pipeline")
			}
			pipelines = append(pipelines, *selected)
		}

	}

	// prepare filter config (processor) from the pipelines
	filterConfig, names, translationErr := PreparePipelineProcessor(pipelines)
	if translationErr != nil {
		zap.S().Errorf("failed to generate processor config from pipelines for deployment %w", translationErr)
		return nil, model.BadRequest(errors.Wrap(
			translationErr, "failed to generate processor config from pipelines for deployment",
		))
	}

	if !agentConf.Ready() {
		return nil, model.UnavailableError(fmt.Errorf(
			"agent updater unavailable at the moment. Please try in sometime",
		))
	}

	// prepare config elements
	elements := make([]string, len(pipelines))
	for i, p := range pipelines {
		elements[i] = p.Id
	}

	// prepare config by calling gen func
	cfg, err := agentConf.StartNewVersion(ctx, userId, agentConf.ElementTypeLogPipelines, elements)
	if err != nil || cfg == nil {
		return nil, err
	}

	zap.S().Info("applying drop pipeline config", cfg)
	// raw pipeline is needed since filterConfig doesn't contain inactive pipelines and operators
	rawPipelineData, _ := json.Marshal(pipelines)

	// queue up the config to push to opamp
	err = agentConf.UpsertLogParsingProcessor(ctx, cfg.Version, rawPipelineData, filterConfig, names)
	history, _ := agentConf.GetConfigHistory(ctx, agentConf.ElementTypeLogPipelines, 10)
	insertedCfg, _ := agentConf.GetConfigVersion(ctx, agentConf.ElementTypeLogPipelines, cfg.Version)

	response := &PipelinesResponse{
		ConfigVersion: insertedCfg,
		Pipelines:     pipelines,
		History:       history,
	}

	if err != nil {
		return response, model.WrapApiError(err, "failed to apply pipelines")
	}
	return response, nil
}

// GetPipelinesByVersion responds with version info and associated pipelines
func (ic *LogParsingPipelineController) GetPipelinesByVersion(
	ctx context.Context, version int,
) (*PipelinesResponse, *model.ApiError) {
	pipelines, errors := ic.getPipelinesByVersion(ctx, version)
	if errors != nil {
		zap.S().Errorf("failed to get pipelines for version %d, %w", version, errors)
		return nil, model.InternalError(fmt.Errorf("failed to get pipelines for given version"))
	}
	configVersion, err := agentConf.GetConfigVersion(ctx, agentConf.ElementTypeLogPipelines, version)
	if err != nil {
		zap.S().Errorf("failed to get config for version %d, %s", version, err.Error())
		return nil, model.WrapApiError(err, "failed to get config for given version")
	}

	return &PipelinesResponse{
		ConfigVersion: configVersion,
		Pipelines:     pipelines,
	}, nil
}
