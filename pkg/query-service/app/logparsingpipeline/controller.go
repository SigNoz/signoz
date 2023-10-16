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
	"go.uber.org/multierr"
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

type PipelinesPreviewRequest struct {
	Pipelines []Pipeline        `json:"pipelines"`
	Logs      []model.SignozLog `json:"logs"`
}

type PipelinesPreviewResponse struct {
	OutputLogs []model.SignozLog `json:"logs"`
}

func (ic *LogParsingPipelineController) PreviewLogsPipelines(
	ctx context.Context,
	request *PipelinesPreviewRequest,
) (*PipelinesPreviewResponse, *model.ApiError) {
	result, err := SimulatePipelinesProcessing(
		ctx, request.Pipelines, request.Logs,
	)

	if err != nil {
		return nil, err
	}

	return &PipelinesPreviewResponse{
		OutputLogs: result,
	}, nil
}

// Implements agentConf.AgentFeature interface.
func (pc *LogParsingPipelineController) AgentFeatureType() agentConf.AgentFeatureType {
	return LogPipelinesFeatureType
}

// Implements agentConf.AgentFeature interface.
func (pc *LogParsingPipelineController) RecommendAgentConfig(
	currentConfYaml []byte,
	configVersion *agentConf.ConfigVersion,
) (
	recommendedConfYaml []byte,
	serializedSettingsUsed string,
	apiErr *model.ApiError,
) {

	pipelines, errs := pc.getPipelinesByVersion(
		context.Background(), configVersion.Version,
	)
	if len(errs) > 0 {
		return nil, "", model.InternalError(multierr.Combine(errs...))
	}

	processors, procNames, err := PreparePipelineProcessor(pipelines)
	if err != nil {
		return nil, "", model.BadRequest(errors.Wrap(err, "could not prepare otel collector processors for log pipelines"))
	}

	updatedConf, apiErr := GenerateCollectorConfigWithPipelines(
		currentConfYaml, processors, procNames,
	)
	if apiErr != nil {
		return nil, "", model.WrapApiError(apiErr, "could not marshal yaml for updated conf")
	}

	rawPipelineData, err := json.Marshal(pipelines)
	if err != nil {
		return nil, "", model.BadRequest(errors.Wrap(err, "could not serialize pipelines to JSON"))
	}

	return updatedConf, string(rawPipelineData), nil

}
