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
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

// Controller takes care of deployment cycle of log parsing pipelines.
type LogParsingPipelineController struct {
	Repo

	GetIntegrationPipelines func(context.Context) ([]Pipeline, *model.ApiError)
}

func NewLogParsingPipelinesController(
	db *sqlx.DB,
	getIntegrationPipelines func(context.Context) ([]Pipeline, *model.ApiError),
) (*LogParsingPipelineController, error) {
	repo := NewRepo(db)
	return &LogParsingPipelineController{
		Repo:                    repo,
		GetIntegrationPipelines: getIntegrationPipelines,
	}, nil
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
	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return nil, model.UnauthorizedError(fmt.Errorf("failed to get userId from context"))
	}

	var pipelines []Pipeline

	// scan through postable pipelines, to select the existing pipelines or insert missing ones
	for idx, r := range postable {

		// note: we process only new and changed pipelines here, deleted pipelines are not expected
		// from client. if user deletes a pipelines, the client should not send that pipelines in the update.
		// in effect, the new config version will not have that pipelines.

		// For versioning, pipelines get stored with unique ids each time they are saved.
		// This ensures updating a pipeline doesn't alter historical versions that referenced
		// the same pipeline id.
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
	cfg, err := agentConf.StartNewVersion(ctx, claims.UserID, agentConf.ElementTypeLogPipelines, elements)
	if err != nil || cfg == nil {
		return nil, err
	}

	return ic.GetPipelinesByVersion(ctx, cfg.Version)
}

func (ic *LogParsingPipelineController) ValidatePipelines(
	ctx context.Context,
	postedPipelines []PostablePipeline,
) *model.ApiError {
	for _, p := range postedPipelines {
		if err := p.IsValid(); err != nil {
			return model.BadRequestStr(err.Error())
		}
	}

	// Also run a collector simulation to ensure config is fit
	// for e2e use with a collector
	pipelines := []Pipeline{}
	for _, pp := range postedPipelines {
		pipelines = append(pipelines, Pipeline{
			Id:          uuid.New().String(),
			OrderId:     pp.OrderId,
			Enabled:     pp.Enabled,
			Name:        pp.Name,
			Alias:       pp.Alias,
			Description: &pp.Description,
			Filter:      pp.Filter,
			Config:      pp.Config,
		})
	}

	sampleLogs := []model.SignozLog{{Body: ""}}
	_, _, simulationErr := SimulatePipelinesProcessing(
		ctx, pipelines, sampleLogs,
	)
	if simulationErr != nil {
		return model.BadRequest(fmt.Errorf(
			"invalid pipelines config: %w", simulationErr.ToError(),
		))
	}

	return nil
}

// Returns effective list of pipelines including user created
// pipelines and pipelines for installed integrations
func (ic *LogParsingPipelineController) getEffectivePipelinesByVersion(
	ctx context.Context, version int,
) ([]Pipeline, *model.ApiError) {
	result := []Pipeline{}

	if version >= 0 {
		savedPipelines, errors := ic.getPipelinesByVersion(ctx, version)
		if errors != nil {
			zap.L().Error("failed to get pipelines for version", zap.Int("version", version), zap.Errors("errors", errors))
			return nil, model.InternalError(fmt.Errorf("failed to get pipelines for given version"))
		}
		result = savedPipelines
	}

	integrationPipelines, apiErr := ic.GetIntegrationPipelines(ctx)
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not get pipelines for installed integrations",
		)
	}

	// Filter out any integration pipelines included in pipelines saved by user
	// if the corresponding integration is no longer installed.
	ipAliases := utils.MapSlice(integrationPipelines, func(p Pipeline) string {
		return p.Alias
	})
	result = utils.FilterSlice(result, func(p Pipeline) bool {
		if !strings.HasPrefix(p.Alias, constants.IntegrationPipelineIdPrefix) {
			return true
		}
		return slices.Contains(ipAliases, p.Alias)
	})

	// Add installed integration pipelines to the list of pipelines saved by user.
	// Users are allowed to enable/disable and reorder integration pipelines while
	// saving the pipeline list.
	for _, ip := range integrationPipelines {
		userPipelineIdx := slices.IndexFunc(result, func(p Pipeline) bool {
			return p.Alias == ip.Alias
		})
		if userPipelineIdx >= 0 {
			ip.Enabled = result[userPipelineIdx].Enabled
			result[userPipelineIdx] = ip
		} else {
			// installed integration pipelines get added to the end of the list by default.
			result = append(result, ip)
		}
	}

	for idx := range result {
		result[idx].OrderId = idx + 1
	}

	return result, nil
}

// GetPipelinesByVersion responds with version info and associated pipelines
func (ic *LogParsingPipelineController) GetPipelinesByVersion(
	ctx context.Context, version int,
) (*PipelinesResponse, *model.ApiError) {
	pipelines, errors := ic.getEffectivePipelinesByVersion(ctx, version)
	if errors != nil {
		zap.L().Error("failed to get pipelines for version", zap.Int("version", version), zap.Error(errors))
		return nil, model.InternalError(fmt.Errorf("failed to get pipelines for given version"))
	}

	var configVersion *agentConf.ConfigVersion
	if version >= 0 {
		cv, err := agentConf.GetConfigVersion(ctx, agentConf.ElementTypeLogPipelines, version)
		if err != nil {
			zap.L().Error("failed to get config for version", zap.Int("version", version), zap.Error(err))
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
	pipelinesVersion := -1
	if configVersion != nil {
		pipelinesVersion = configVersion.Version
	}

	pipelinesResp, apiErr := pc.GetPipelinesByVersion(
		context.Background(), pipelinesVersion,
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
