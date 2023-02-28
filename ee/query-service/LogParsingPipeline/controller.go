package logparsingpipeline

import (
	"context"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.uber.org/zap"
)

// Controller takes care of deployment cycle of ingestion pipelines.
type PipelineController struct {
	Repo
}

func NewPipelinesController(db *sqlx.DB, engine string) (*PipelineController, error) {
	repo := NewRepo(db)
	err := repo.InitDB(engine)
	return &PipelineController{Repo: repo}, err
}

// PipelinesResponse is used to prepare http response for pipelines config related requests
type PipelinesResponse struct {
	*agentConf.ConfigVersion

	Pipelines []model.Pipeline          `json:"pipelines"`
	History   []agentConf.ConfigVersion `json:"history"`
}

// ApplyPipelines stores new or changed pipelines and initiates a new config update
func (ic *PipelineController) ApplyPipelines(ctx context.Context, postable []PostablePipeline) (*PipelinesResponse, *model.ApiError) {
	var pipelines []model.Pipeline

	// scan through postable pipelines, to select the existing pipelines or insert missing ones
	for _, r := range postable {

		// note: we process only new and changed pipelines here, deleted pipelines are not expected
		// from client. if user deletes a pipelines, the client should not send that pipelines in the update.
		// in effect, the new config version will not have that pipelines.

		if r.Id == "" {
			// looks like a new or changed pipeline, store it first
			inserted, err := ic.insertPipeline(ctx, &r)
			if err != nil || inserted == nil {
				zap.S().Errorf("failed to insert edited pipeline", err)
				return nil, model.BadRequestStr("failed to insert edited pipeline")
			} else {
				pipelines = append(pipelines, *inserted)
			}
		} else {
			selected, err := ic.GetPipeline(ctx, r.Id)
			if err != nil || selected == nil {
				zap.S().Errorf("failed to find edited pipeline", err)
				return nil, model.BadRequestStr("failed to find pipeline, invalid request")
			}
			pipelines = append(pipelines, *selected)
		}

	}

	// prepare filter config (processor) from the pipelines
	filterConfig, names, err := PreparePipelineProcessor(pipelines)
	if err != nil {
		zap.S().Errorf("failed to generate processor config from pipelines for deployment", err)
		return nil, model.BadRequest(err)
	}

	if !agentConf.Ready() {
		return nil, model.InternalErrorStr("Agent updater unavailable at the moment. Please try in sometime")
	}

	// prepare config elements
	elements := make([]string, len(pipelines))
	for i, p := range pipelines {
		elements[i] = p.Id
	}

	// prepare config by calling gen func
	cfg, err := agentConf.StartNewVersion(ctx, agentConf.ElementTypeLogPipelines, elements)
	if err != nil || cfg == nil {
		return nil, model.InternalError(err)
	}

	zap.S().Info("applying drop pipeline config", cfg)

	// queue up the config to push to opamp
	err = agentConf.UpsertPipelineProcessors(filterConfig, names)
	history, _ := agentConf.GetConfigHistory(ctx, agentConf.ElementTypeLogPipelines)

	response := &PipelinesResponse{
		ConfigVersion: cfg,
		Pipelines:     pipelines,
		History:       history,
	}

	if err != nil {
		zap.S().Errorf("failed to insert pipelines into agent config", filterConfig, err)
		return response, model.InternalErrorStr("failed to apply piplines ")
	}
	return response, nil
}

// GetPipelinesByVersion responds with version info and associated pipelines
func (ic *PipelineController) GetPipelinesByVersion(ctx context.Context, version int) (*PipelinesResponse, *model.ApiError) {
	pipelines, apierr := ic.getPipelinesByVersion(ctx, version)
	if apierr != nil {
		zap.S().Errorf("failed to get pipelines for version", version, apierr)
		return nil, model.InternalErrorStr("failed to get drop pipelines for given version")
	}
	configVersion, err := agentConf.GetConfigVersion(ctx, agentConf.ElementTypeLogPipelines, version)
	if err != nil || configVersion == nil {
		zap.S().Errorf("failed to get pipelines for version", version, err)
		return nil, model.InternalErrorStr("failed to get pipelines for given version")
	}

	return &PipelinesResponse{
		ConfigVersion: configVersion,
		Pipelines:     pipelines,
	}, nil
}
