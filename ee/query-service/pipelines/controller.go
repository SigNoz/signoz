package pipelines

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.uber.org/zap"
)

// Controller takes care of deployment cycle of ingestion rules.
type PipelinesController struct {
	Repo
}

func NewPipelinesController(db *sqlx.DB, engine string) (*PipelinesController, error) {
	repo := NewRepo(db)
	err := repo.InitDB(engine)
	return &PipelinesController{Repo: repo}, err
}

// PipelinesResponse is used to prepare http response for rule config related requests
type PipelinesResponse struct {
	*agentConf.ConfigVersion

	Pipelines []model.Pipeline          `json:"pipelines"`
	History   []agentConf.ConfigVersion `json:"history"`
}

// ApplyPipelines stores new or changed drop rules and initiates a new config update
func (ic *PipelinesController) ApplyPipelines(ctx context.Context, postable []PostablePipeline) (*PipelinesResponse, *model.ApiError) {
	var pipelines []model.Pipeline

	// scan through postable rules, to select the existing rules or insert missing ones
	for _, r := range postable {

		// note: we process only new and changed rules here, deleted rules are not expected
		// from client. if user deletes a rule, the client should not send that rule in the update.
		// in effect, the new config version will not have that rule.

		if r.Id == "" {
			// looks like a new or changed rule, store it first
			inserted, err := ic.insertPipeline(ctx, &r)
			if err != nil || inserted == nil {
				zap.S().Errorf("failed to insert edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to insert edited rule")
			} else {
				pipelines = append(pipelines, *inserted)
			}
		} else {
			selected, err := ic.GetPipeline(ctx, r.Id)
			if err != nil || selected == nil {
				zap.S().Errorf("failed to find edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to find edited rule, invalid request")
			}
			pipelines = append(pipelines, *selected)
		}

	}

	// prepare filter config (processor) from the drop rules
	filterConfig, err := PreparePipelineProcessor(pipelines)
	if err != nil {
		zap.S().Errorf("failed to generate processor config from ingestion rules for deployment", err)
		return nil, model.BadRequest(err)
	}

	fmt.Println("filter: ", filterConfig)

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

	zap.S().Info("applying drop rule config", cfg)

	// queue up the config to push to opamp
	err = agentConf.UpsertPipelineProcessors(filterConfig)
	history, _ := agentConf.GetConfigHistory(ctx, agentConf.ElementTypeLogPipelines)

	response := &PipelinesResponse{
		ConfigVersion: cfg,
		Pipelines:     pipelines,
		History:       history,
	}

	if err != nil {
		zap.S().Errorf("failed to insert drop rules into agent config", filterConfig, err)
		return response, model.InternalErrorStr("failed to apply drop rules ")
	}
	return response, nil
}

// GetRulesByVersion responds with version info and associated drop rules
func (ic *PipelinesController) GetPipelinesByVersion(ctx context.Context, version int) (*PipelinesResponse, *model.ApiError) {
	rules, apierr := ic.getPipelinesByVersion(ctx, version)
	if apierr != nil {
		zap.S().Errorf("failed to get drop rules for version", version, apierr)
		return nil, model.InternalErrorStr("failed to get drop rules for given version")
	}
	configVersion, err := agentConf.GetConfigVersion(ctx, agentConf.ElementTypeDropRules, version)
	if err != nil || configVersion == nil {
		zap.S().Errorf("failed to get drop rules for version", version, err)
		return nil, model.InternalErrorStr("failed to get drop rules for given version")
	}

	return &PipelinesResponse{
		ConfigVersion: configVersion,
		Pipelines:     rules,
	}, nil
}
