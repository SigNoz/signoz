package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.uber.org/zap"
)

// Controller takes care of deployment cycle of log parsing pipelines.
type LogParsingPipelineController struct {
	Repo

	GetIntegrationPipelines func(context.Context, string) ([]pipelinetypes.GettablePipeline, *model.ApiError)
}

func NewLogParsingPipelinesController(
	sqlStore sqlstore.SQLStore,
	getIntegrationPipelines func(context.Context, string) ([]pipelinetypes.GettablePipeline, *model.ApiError),
) (*LogParsingPipelineController, error) {
	repo := NewRepo(sqlStore)
	return &LogParsingPipelineController{
		Repo:                    repo,
		GetIntegrationPipelines: getIntegrationPipelines,
	}, nil
}

// PipelinesResponse is used to prepare http response for pipelines config related requests
type PipelinesResponse struct {
	*opamptypes.AgentConfigVersion

	Pipelines []pipelinetypes.GettablePipeline `json:"pipelines"`
	History   []opamptypes.AgentConfigVersion  `json:"history"`
}

// ApplyPipelines stores new or changed pipelines and initiates a new config update
func (ic *LogParsingPipelineController) ApplyPipelines(
	ctx context.Context,
	orgID valuer.UUID,
	userID valuer.UUID,
	postable []pipelinetypes.PostablePipeline,
) (*PipelinesResponse, *model.ApiError) {
	var pipelines []pipelinetypes.GettablePipeline

	// scan through postable pipelines, to select the existing pipelines or insert missing ones
	for idx, r := range postable {

		// note: we process only new and changed pipelines here, deleted pipelines are not expected
		// from client. if user deletes a pipelines, the client should not send that pipelines in the update.
		// in effect, the new config version will not have that pipelines.

		// For versioning, pipelines get stored with unique ids each time they are saved.
		// This ensures updating a pipeline doesn't alter historical versions that referenced
		// the same pipeline id.
		r.ID = uuid.NewString()
		r.OrderID = idx + 1
		pipeline, apiErr := ic.insertPipeline(ctx, orgID, &r)
		if apiErr != nil {
			return nil, model.WrapApiError(apiErr, "failed to insert pipeline")
		}
		pipelines = append(pipelines, *pipeline)

	}

	// prepare config elements
	elements := make([]string, len(pipelines))
	for i, p := range pipelines {
		elements[i] = p.ID.StringValue()
	}

	cfg, err := agentConf.StartNewVersion(ctx, orgID, userID, opamptypes.ElementTypeLogPipelines, elements)
	if err != nil || cfg == nil {
		return nil, model.InternalError(fmt.Errorf("failed to start new version: %w", err))
	}

	return ic.GetPipelinesByVersion(ctx, orgID, cfg.Version)
}

func (ic *LogParsingPipelineController) ValidatePipelines(
	ctx context.Context,
	postedPipelines []pipelinetypes.PostablePipeline,
) *model.ApiError {
	for _, p := range postedPipelines {
		if err := p.IsValid(); err != nil {
			return model.BadRequestStr(err.Error())
		}
	}

	// Also run a collector simulation to ensure config is fit
	// for e2e use with a collector
	gettablePipelines := []pipelinetypes.GettablePipeline{}
	for _, pp := range postedPipelines {
		gettablePipelines = append(gettablePipelines, pipelinetypes.GettablePipeline{
			StoreablePipeline: pipelinetypes.StoreablePipeline{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				OrderID:     pp.OrderID,
				Enabled:     pp.Enabled,
				Name:        pp.Name,
				Alias:       pp.Alias,
				Description: pp.Description,
			},
			Filter: pp.Filter,
			Config: pp.Config,
		})
	}

	sampleLogs := []model.SignozLog{{Body: ""}}
	_, _, simulationErr := SimulatePipelinesProcessing(
		ctx, gettablePipelines, sampleLogs,
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
	ctx context.Context, orgID valuer.UUID, version int,
) ([]pipelinetypes.GettablePipeline, *model.ApiError) {

	result := []pipelinetypes.GettablePipeline{}
	if version >= 0 {
		savedPipelines, errors := ic.getPipelinesByVersion(ctx, orgID.String(), version)
		if errors != nil {
			zap.L().Error("failed to get pipelines for version", zap.Int("version", version), zap.Errors("errors", errors))
			return nil, model.InternalError(fmt.Errorf("failed to get pipelines for given version %v", errors))
		}
		result = savedPipelines
	}

	integrationPipelines, apiErr := ic.GetIntegrationPipelines(ctx, orgID.String())
	if apiErr != nil {
		return nil, model.WrapApiError(
			apiErr, "could not get pipelines for installed integrations",
		)
	}

	// Filter out any integration pipelines included in pipelines saved by user
	// if the corresponding integration is no longer installed.
	ipAliases := utils.MapSlice(integrationPipelines, func(p pipelinetypes.GettablePipeline) string {
		return p.Alias
	})
	result = utils.FilterSlice(result, func(p pipelinetypes.GettablePipeline) bool {
		if !strings.HasPrefix(p.Alias, constants.IntegrationPipelineIdPrefix) {
			return true
		}
		return slices.Contains(ipAliases, p.Alias)
	})

	// Add installed integration pipelines to the list of pipelines saved by user.
	// Users are allowed to enable/disable and reorder integration pipelines while
	// saving the pipeline list.
	for _, ip := range integrationPipelines {
		userPipelineIdx := slices.IndexFunc(result, func(p pipelinetypes.GettablePipeline) bool {
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
		result[idx].OrderID = idx + 1
	}

	return result, nil
}

// GetPipelinesByVersion responds with version info and associated pipelines
func (ic *LogParsingPipelineController) GetPipelinesByVersion(
	ctx context.Context, orgId valuer.UUID, version int,
) (*PipelinesResponse, *model.ApiError) {

	pipelines, errors := ic.getEffectivePipelinesByVersion(ctx, orgId, version)
	if errors != nil {
		zap.L().Error("failed to get pipelines for version", zap.Int("version", version), zap.Error(errors))
		return nil, model.InternalError(fmt.Errorf("failed to get pipelines for given version %v", errors))
	}

	var configVersion *opamptypes.AgentConfigVersion
	if version >= 0 {
		cv, err := agentConf.GetConfigVersion(ctx, orgId, opamptypes.ElementTypeLogPipelines, version)
		if err != nil {
			zap.L().Error("failed to get config for version", zap.Int("version", version), zap.Error(err))
			return nil, model.WrapApiError(err, "failed to get config for given version")
		}
		configVersion = cv
	}

	return &PipelinesResponse{
		AgentConfigVersion: configVersion,
		Pipelines:          pipelines,
	}, nil
}

type PipelinesPreviewRequest struct {
	Pipelines []pipelinetypes.GettablePipeline `json:"pipelines"`
	Logs      []model.SignozLog                `json:"logs"`
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
	orgId valuer.UUID,
	currentConfYaml []byte,
	configVersion *opamptypes.AgentConfigVersion,
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
		context.Background(), orgId, pipelinesVersion,
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
