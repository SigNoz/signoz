package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
)

// Controller takes care of deployment cycle of log parsing pipelines.
type LogParsingPipelineController struct {
	Repo

	GetIntegrationPipelines func(context.Context) ([]Pipeline, *model.ApiError)
}

func NewLogParsingPipelinesController(
	db *sqlx.DB,
	engine string,
	getIntegrationPipelines func(context.Context) ([]Pipeline, *model.ApiError),
) (*LogParsingPipelineController, error) {
	repo := NewRepo(db)
	err := repo.InitDB(engine)
	return &LogParsingPipelineController{
		Repo:                    repo,
		GetIntegrationPipelines: getIntegrationPipelines,
	}, err
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
	for idx, r := range postable {

		// note: we process only new and changed pipelines here, deleted pipelines are not expected
		// from client. if user deletes a pipelines, the client should not send that pipelines in the update.
		// in effect, the new config version will not have that pipelines.

		// Given the schema right now, all calls to apply Pipeline are expected to provide
		// fresh pipelines with unique ids.
		// This is required since agentConf versions include element ids in them and updating
		// pipelines while preserving ids would alter history
		r.Id = uuid.NewString()
		r.OrderId = idx + 1
		pipeline, apiErr := ic.insertPipeline(ctx, &r)
		if apiErr != nil {
			return nil, model.WrapApiError(apiErr, "failed to insert pipeline")
		}
		pipelines = append(pipelines, *pipeline)

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

// Returns effective list of pipelines including user created
// pipelines and pipelines for installed integrations
func (ic *LogParsingPipelineController) getEffectivePipelinesByVersion(
	ctx context.Context, version int,
) ([]Pipeline, *model.ApiError) {
	pipelines := []Pipeline{}
	if version >= 0 {
		pvs, errors := ic.getPipelinesByVersion(ctx, version)
		if errors != nil {
			zap.S().Errorf("failed to get pipelines for version %d, %w", version, errors)
			return nil, model.InternalError(fmt.Errorf("failed to get pipelines for given version"))
		}
		pipelines = pvs
	}

	integrationPipelines, apiErr := ic.GetIntegrationPipelines(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not get pipelines for installed integrations",
		)
	}

	// Filter out any integration pipelines included in user pipelines if the
	// integration is no longer installed.
	ipAliases := utils.MapSlice(integrationPipelines, func(p Pipeline) string {
		return p.Alias
	})
	pipelines = utils.FilterSlice(pipelines, func(p Pipeline) bool {
		if !strings.HasPrefix(p.Alias, constants.IntegrationPipelineIdPrefix) {
			return true
		}
		return slices.Contains(ipAliases, p.Alias)
	})

	for _, ip := range integrationPipelines {
		// Return in user defined order if the user included an integration pipeline
		// when saving pipelines (potentially after reordering pipelines).
		userPipelineIdx := slices.IndexFunc(pipelines, func(p Pipeline) bool {
			return p.Alias == ip.Alias
		})
		if userPipelineIdx >= 0 {
			pipelines[userPipelineIdx] = ip
			pipelines[userPipelineIdx].OrderId = userPipelineIdx + 1
		} else {
			pipelines = append(pipelines, ip)
		}
	}

	return pipelines, nil
}

// GetPipelinesByVersion responds with version info and associated pipelines
func (ic *LogParsingPipelineController) GetPipelinesByVersion(
	ctx context.Context, version int,
) (*PipelinesResponse, *model.ApiError) {
	pipelines, errors := ic.getEffectivePipelinesByVersion(ctx, version)
	if errors != nil {
		zap.S().Errorf("failed to get pipelines for version %d, %w", version, errors)
		return nil, model.InternalError(fmt.Errorf("failed to get pipelines for given version"))
	}

	var configVersion *agentConf.ConfigVersion
	if version >= 0 {
		cv, err := agentConf.GetConfigVersion(ctx, agentConf.ElementTypeLogPipelines, version)
		if err != nil {
			zap.S().Errorf("failed to get config for version %d, %s", version, err.Error())
			return nil, model.WrapApiError(err, "failed to get config for given version")
		}
		configVersion = cv
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
	OutputLogs    []model.SignozLog `json:"logs"`
	CollectorLogs []string          `json:"collectorLogs"`
}

func (ic *LogParsingPipelineController) PreviewLogsPipelines(
	ctx context.Context,
	request *PipelinesPreviewRequest,
) (*PipelinesPreviewResponse, *model.ApiError) {
	result, collectorLogs, err := SimulatePipelinesProcessing(
		ctx, request.Pipelines, request.Logs,
	)

	if err != nil {
		return nil, err
	}

	return &PipelinesPreviewResponse{
		OutputLogs:    result,
		CollectorLogs: collectorLogs,
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

	pipelinesResp, apiErr := pc.GetPipelinesByVersion(
		context.Background(), configVersion.Version,
	)
	if apiErr != nil {
		return nil, "", apiErr
	}

	updatedConf, apiErr := GenerateCollectorConfigWithPipelines(
		currentConfYaml, pipelinesResp.Pipelines,
	)
	if apiErr != nil {
		return nil, "", model.WrapApiError(apiErr, "could not marshal yaml for updated conf")
	}

	rawPipelineData, err := json.Marshal(pipelinesResp.Pipelines)
	if err != nil {
		return nil, "", model.BadRequest(errors.Wrap(err, "could not serialize pipelines to JSON"))
	}

	return updatedConf, string(rawPipelineData), nil
}
