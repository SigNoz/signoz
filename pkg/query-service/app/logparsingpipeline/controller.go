package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
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
	"go.uber.org/zap"
)

var (
	CodeRawPipelinesMarshalFailed = errors.MustNewCode("raw_pipelines_marshal_failed")
)

// Controller takes care of deployment cycle of log parsing pipelines.
type LogParsingPipelineController struct {
	Repo

	GetIntegrationPipelines func(context.Context, string) ([]pipelinetypes.GettablePipeline, error)
}

func NewLogParsingPipelinesController(
	sqlStore sqlstore.SQLStore,
	getIntegrationPipelines func(context.Context, string) ([]pipelinetypes.GettablePipeline, error),
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
) (*PipelinesResponse, error) {
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
		pipeline, err := ic.insertPipeline(ctx, orgID, &r)
		if err != nil {
			return nil, err
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

func (ic *LogParsingPipelineController) ValidatePipelines(ctx context.Context,
	postedPipelines []pipelinetypes.PostablePipeline,
) error {
	for _, p := range postedPipelines {
		if err := p.IsValid(); err != nil {
			return errors.WithAdditionalf(err, "invalid pipeline: %s", p.Name)
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
	_, _, err := SimulatePipelinesProcessing(ctx, gettablePipelines, sampleLogs)
	return err
}

// Returns effective list of pipelines including user created
// pipelines and pipelines for installed integrations
func (ic *LogParsingPipelineController) getEffectivePipelinesByVersion(
	ctx context.Context, orgID valuer.UUID, version int,
) ([]pipelinetypes.GettablePipeline, error) {

	result := []pipelinetypes.GettablePipeline{}
	if version >= 0 {
		savedPipelines, err := ic.getPipelinesByVersion(ctx, orgID.String(), version)
		if err != nil {
			zap.L().Error("failed to get pipelines for version", zap.Int("version", version), zap.Error(err))
			return nil, err
		}
		result = savedPipelines
	}

	integrationPipelines, err := ic.GetIntegrationPipelines(ctx, orgID.String())
	if err != nil {
		return nil, err
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
) (*PipelinesResponse, error) {
	pipelines, err := ic.getEffectivePipelinesByVersion(ctx, orgId, version)
	if err != nil {
		zap.L().Error("failed to get pipelines for version", zap.Int("version", version), zap.Error(err))
		return nil, err
	}

	var configVersion *opamptypes.AgentConfigVersion
	if version >= 0 {
		cv, err := agentConf.GetConfigVersion(ctx, orgId, opamptypes.ElementTypeLogPipelines, version)
		if err != nil {
			zap.L().Error("failed to get config for version", zap.Int("version", version), zap.Error(err))
			return nil, err
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
) (*PipelinesPreviewResponse, error) {
	result, collectorLogs, err := SimulatePipelinesProcessing(ctx, request.Pipelines, request.Logs)
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
) ([]byte, string, error) {
	pipelinesVersion := -1
	if configVersion != nil {
		pipelinesVersion = configVersion.Version
	}

	pipelinesResp, err := pc.GetPipelinesByVersion(
		context.Background(), orgId, pipelinesVersion,
	)
	if err != nil {
		return nil, "", err
	}

	updatedConf, err := GenerateCollectorConfigWithPipelines(currentConfYaml, pipelinesResp.Pipelines)
	if err != nil {
		return nil, "", err
	}

	rawPipelineData, err := json.Marshal(pipelinesResp.Pipelines)
	if err != nil {
		return nil, "", errors.WrapInternalf(err, CodeRawPipelinesMarshalFailed, "could not serialize pipelines to JSON")
	}

	return updatedConf, string(rawPipelineData), nil
}
