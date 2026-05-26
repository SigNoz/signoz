package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"slices"
	"strings"

	"github.com/google/uuid"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"log/slog"
)

var (
	CodeRawPipelinesMarshalFailed = errors.MustNewCode("raw_pipelines_marshal_failed")
)

// Controller takes care of deployment cycle of log parsing pipelines.
type LogParsingPipelineController struct {
	Repo

	GetIntegrationPipelines func(context.Context, string) ([]pipelinetypes.GettablePipeline, error)
	// TODO(Piyush): remove with qbv5 migration
	reader interfaces.Reader
	fl     flagger.Flagger
}

func NewLogParsingPipelinesController(
	sqlStore sqlstore.SQLStore,
	getIntegrationPipelines func(context.Context, string) ([]pipelinetypes.GettablePipeline, error),
	reader interfaces.Reader,
	fl flagger.Flagger,
) (*LogParsingPipelineController, error) {
	repo := NewRepo(sqlStore)
	return &LogParsingPipelineController{
		Repo:                    repo,
		GetIntegrationPipelines: getIntegrationPipelines,
		reader:                  reader,
		fl:                      fl,
	}, nil
}

// enrichPipelinesFilters resolves the type (tag vs resource) for filter keys that are
// missing type info, by looking them up in the store.
//
// TODO(Piyush): remove with qbv5 migration
func (pc *LogParsingPipelineController) enrichPipelinesFilters(
	ctx context.Context, pipelines []pipelinetypes.GettablePipeline,
) ([]pipelinetypes.GettablePipeline, error) {
	// Collect names of non-static keys that are missing type info.
	// Static fields (body, trace_id, etc.) are intentionally Unspecified and map
	// to top-level OTEL fields — they do not need enrichment.
	unspecifiedNames := map[string]struct{}{}
	for _, p := range pipelines {
		if p.Filter != nil {
			for _, item := range p.Filter.Items {
				if item.Key.Type == v3.AttributeKeyTypeUnspecified {
					// Skip static fields
					if _, isStatic := constants.StaticFieldsLogsV3[item.Key.Key]; isStatic {
						continue
					}
					// Skip enrich body.* fields
					if strings.HasPrefix(item.Key.Key, "body.") {
						continue
					}
					unspecifiedNames[item.Key.Key] = struct{}{}
				}
			}
		}
	}
	if len(unspecifiedNames) == 0 {
		return pipelines, nil
	}

	logFields, apiErr := pc.reader.GetLogFieldsFromNames(ctx, slices.Collect(maps.Keys(unspecifiedNames)))
	if apiErr != nil {
		slog.ErrorContext(ctx, "failed to fetch log fields for pipeline filter enrichment", "error", apiErr)
		return pipelines, apiErr
	}

	// Build a simple name → AttributeKeyType map from the response.
	fieldTypes := map[string]v3.AttributeKeyType{}
	for _, f := range append(logFields.Selected, logFields.Interesting...) {
		switch f.Type {
		case constants.Resources:
			fieldTypes[f.Name] = v3.AttributeKeyTypeResource
		case constants.Attributes:
			fieldTypes[f.Name] = v3.AttributeKeyTypeTag
		}
	}

	// Set the resolved type on each untyped filter key in-place.
	for i := range pipelines {
		if pipelines[i].Filter != nil {
			for j := range pipelines[i].Filter.Items {
				key := &pipelines[i].Filter.Items[j].Key
				if key.Type == v3.AttributeKeyTypeUnspecified {
					// Skip static fields
					if _, isStatic := constants.StaticFieldsLogsV3[key.Key]; isStatic {
						continue
					}
					// Skip enrich body.* fields
					if strings.HasPrefix(key.Key, "body.") {
						continue
					}

					if t, ok := fieldTypes[key.Key]; ok {
						key.Type = t
					} else {
						// default to attribute
						key.Type = v3.AttributeKeyTypeTag
					}
				}
			}
		}
	}

	return pipelines, nil
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

func (ic *LogParsingPipelineController) getNormalizePipeline() pipelinetypes.GettablePipeline {
	return pipelinetypes.GettablePipeline{
		StoreablePipeline: pipelinetypes.StoreablePipeline{
			Name:    "Default Pipeline - PreProcessing Body",
			Alias:   "NormalizeBodyDefault",
			Enabled: true,
		},
		Filter: &v3.FilterSet{
			Items: []v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key: "body",
					},
					Operator: v3.FilterOperatorExists,
				},
			},
		},
		Config: []pipelinetypes.PipelineOperator{
			{
				ID:      uuid.NewString(),
				Type:    "normalize",
				Enabled: true,
				If:      "body != nil",
			},
		},
	}
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
			slog.ErrorContext(ctx, "failed to get pipelines for version", "version", version, errors.Attr(err))
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
		slog.ErrorContext(ctx, "failed to get pipelines for version", "version", version, errors.Attr(err))
		return nil, err
	}

	var configVersion *opamptypes.AgentConfigVersion
	if version >= 0 {
		cv, err := agentConf.GetConfigVersion(ctx, orgId, opamptypes.ElementTypeLogPipelines, version)
		if err != nil {
			slog.ErrorContext(ctx, "failed to get config for version", "version", version, errors.Attr(err))
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
	pipelines, err := ic.enrichPipelinesFilters(ctx, request.Pipelines)
	if err != nil {
		return nil, err
	}

	result, collectorLogs, err := SimulatePipelinesProcessing(ctx, pipelines, request.Logs)
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
// RecommendAgentConfig generates the collector config to be sent to agents.
// The normalize pipeline (when use_json_body feature flag is on) is injected here, after
// rawPipelineData is serialized. So it is only present in the config sent to
// the collector and never persisted to the database as part of the user's pipeline list.
//
// NOTE: The configId sent to agents is derived from the pipeline version number
// (e.g. "LogPipelines:5"), not the YAML content. If server-side logic changes
// the generated YAML without bumping the version (e.g. toggling the use_json_body
// flag or updating operator IfExpressions), agents that already applied that version will
// not re-apply the new config. In such cases, users must save a new pipeline version
// via the API to force agents to pick up the change.
func (pc *LogParsingPipelineController) RecommendAgentConfig(
	orgId valuer.UUID,
	currentConfYaml []byte,
	configVersion *opamptypes.AgentConfigVersion,
) ([]byte, string, error) {
	pipelinesVersion := -1
	if configVersion != nil {
		pipelinesVersion = configVersion.Version
	}
	ctx := context.Background()
	pipelinesResp, err := pc.GetPipelinesByVersion(ctx, orgId, pipelinesVersion)
	if err != nil {
		return nil, "", err
	}

	rawPipelineData, err := json.Marshal(pipelinesResp.Pipelines)
	if err != nil {
		return nil, "", errors.WrapInternalf(err, CodeRawPipelinesMarshalFailed, "could not serialize pipelines to JSON")
	}

	enrichedPipelines, err := pc.enrichPipelinesFilters(ctx, pipelinesResp.Pipelines)
	if err != nil {
		return nil, "", err
	}

	// TODO(Tushar): thread orgID here to evaluate correctly
	if pc.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgId)) {
		// add default normalize pipeline at the beginning, only for sending to collector
		enrichedPipelines = append([]pipelinetypes.GettablePipeline{pc.getNormalizePipeline()}, enrichedPipelines...)
	}

	updatedConf, err := GenerateCollectorConfigWithPipelines(currentConfYaml, enrichedPipelines)
	if err != nil {
		return nil, "", err
	}

	return updatedConf, string(rawPipelineData), nil
}
