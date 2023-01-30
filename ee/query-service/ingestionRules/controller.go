package ingestionRules

import (
	"context"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/model"
	agentConf "go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.uber.org/zap"
)

// Controller takes care of deployment cycle of ingestion rules.
type IngestionController struct {
	repo Repo
}

func NewIngestionController(db *sqlx.DB) (*IngestionController, error) {
	repo := NewRepo(db)
	return &IngestionController{repo: repo}, nil
}

// IngestionRulesResponse is used to prepare http response for rule config related requests
type IngestionRulesResponse struct {
	*agentConf.ConfigVersion

	Rules   []model.IngestionRule     `json:"rules"`
	History []agentConf.ConfigVersion `json:"history"`
}

// ApplyDropRules stores new or changed drop rules and initiates a new config update
func (ic *IngestionController) ApplyDropRules(ctx context.Context, postable []PostableIngestionRule) (*IngestionRulesResponse, *model.ApiError) {
	var dropRules []model.IngestionRule

	// scan through postable rules, to select the existing rules or insert missing ones
	for _, r := range postable {

		// note: we process only new and changed rules here, deleted rules are not expected
		// from client. if user deletes a rule, the client should not send that rule in the update.
		// in effect, the new config version will not have that rule.

		if r.Id == "" {
			// looks like a new or changed rule, store it first
			inserted, err := ic.repo.InsertRule(ctx, &r)
			if err != nil || inserted == nil {
				zap.S().Errorf("failed to insert edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to insert edited rule")
			} else {
				dropRules = append(dropRules, *inserted)
			}
		} else {
			selected, err := ic.repo.GetRule(ctx, r.Id)
			if err != nil || selected == nil {
				zap.S().Errorf("failed to find edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to find edited rule, invalid request")
			}
			dropRules = append(dropRules, *selected)
		}

	}

	// prepare filter config (processor) from the drop rules
	filterConfig, err := PrepareDropFilter(dropRules)
	if err != nil {
		zap.S().Errorf("failed to generate processor config from ingestion rules for deployment", err)
		return nil, model.BadRequest(err)
	}

	if !agentConf.Ready() {
		return nil, model.InternalErrorStr("Agent updater unavailable at the moment. Please try in sometime")
	}

	// prepare config elements
	elements := make([]string, len(dropRules))
	for i, r := range dropRules {
		elements[i] = r.Id
	}

	// prepare config by calling gen func
	cfg, err := agentConf.StartNewVersion(ctx, agentConf.ElementTypeDropRules, elements)
	if err != nil || cfg == nil {
		return nil, model.InternalError(err)
	}

	zap.S().Info("applying drop rule config", cfg)

	// queue up the config to push to opamp
	err = agentConf.UpsertFilterProcessor("filter/1000", filterConfig)
	history, _ := agentConf.GetConfigHistory(ctx, agentConf.ElementTypeDropRules)

	response := &IngestionRulesResponse{
		ConfigVersion: cfg,
		Rules:         dropRules,
		History:       history
	}

	if err != nil {
		zap.S().Errorf("failed to insert drop rules into agent config", zap.String("filterConfig", filterConfig), err)
		return response, model.InternalErrorStr("failed to apply drop rules ")
	}
	return response, nil
}

// GetDropRules responds with version info and associated drop rules
func (ic *IngestionController) GetDropRules(ctx context.Context, version float32) (*IngestionRulesResponse, *model.ApiError) {
	dropRules, errs := ic.repo.GetDropRules(ctx, version)
	if len(errs) != 0 {
		zap.S().Errorf("failed to get drop rules for version", version, errs)
		return nil, model.InternalErrorStr("failed to get drop rules for given version")
	}
	configVersion, err := agentConf.GetConfigVersion(ctx, agentConf.ElementTypeDropRules, version)
	if err != nil || configVersion == nil {
		zap.S().Errorf("failed to get drop rules for version", version, err)
		return nil, model.InternalErrorStr("failed to get drop rules for given version")
	}

	return &IngestionRulesResponse{
		ConfigVersion: configVersion,
		Rules:         dropRules,
	}, nil
}

// ApplySamplingRules stores new or changed sampling rules and initiates a new config update
func (ic *IngestionController) ApplySamplingRules(ctx context.Context, postable []PostableIngestionRule) (*IngestionRulesResponse, *model.ApiError) {
	var smplRules []model.IngestionRule

	// scan through postable rules, to select the existing rules or insert missing ones
	for _, r := range postable {

		// note: we process only new and changed rules here, deleted rules are not expected
		// from client. if user deletes a rule, the client should not send that rule in the update.
		// in effect, the new config version will not have that rule.

		if r.Id == "" {
			// looks like a new or changed rule, store it first
			inserted, err := ic.repo.InsertRule(ctx, &r)
			if err != nil || inserted == nil {
				zap.S().Errorf("failed to insert edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to insert edited rule")
			} else {
				smplRules = append(smplRules, *inserted)
			}
		} else {
			selected, err := ic.repo.GetRule(ctx, r.Id)
			if err != nil || selected == nil {
				zap.S().Errorf("failed to find edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to find edited rule, invalid request")
			}
			smplRules = append(smplRules, *selected)
		}

	}

	// prepare params for sampling processor from the rules
	params, err := PrepareSamplingParams(smplRules)
	if err != nil {
		zap.S().Errorf("failed to generate processor config from ingestion rules for deployment", err)
		return nil, model.BadRequest(err)
	}

	if !agentConf.Ready() {
		return nil, model.InternalErrorStr("Agent updater unavailable at the moment. Please try in sometime")
	}

	// prepare config elements
	elements := make([]string, len(smplRules))
	for i, r := range smplRules {
		elements[i] = r.Id
	}

	// prepare config by calling gen func
	cfg, err := agentConf.StartNewVersion(ctx, agentConf.ElementTypeSamplingRules, elements)
	if err != nil || cfg == nil {
		return nil, model.InternalError(err)
	}

	zap.S().Info("applying sampling rule config", cfg)

	// queue up the config to push to opamp
	err = agentConf.UpsertSamplingProcessor("tail_sampling/1000", params)
	history, _ := agentConf.GetConfigHistory(ctx, agentConf.ElementTypeSamplingRules)

	response := &IngestionRulesResponse{
		ConfigVersion: cfg,
		Rules:         smplRules,
		History:       history
	}

	if err != nil {
		zap.S().Errorf("failed to insert sampling rules into agent config", zap.String("params", params), err)
		return response, model.InternalErrorStr("failed to apply sampling rules ")
	}
	return response, nil
}

// GetSamplingRules responds with version info and associated sampling rules
func (ic *IngestionController) GetSamplingRules(ctx context.Context, version float32) (*IngestionRulesResponse, *model.ApiError) {
	samplingRules, errs := ic.repo.GetSamplingRules(ctx, version)
	if len(errs) != 0 {
		zap.S().Errorf("failed to get drop rules for version", version, errs)
		return nil, model.InternalErrorStr("failed to get drop rules for given version")
	}
	configVersion, err := agentConf.GetConfigVersion(ctx, agentConf.ElementTypeSamplingRules, version)
	if err != nil || configVersion == nil {
		zap.S().Errorf("failed to get drop rules for version", version, err)
		return nil, model.InternalErrorStr("failed to get drop rules for given version")
	}

	return &IngestionRulesResponse{
		ConfigVersion: configVersion,
		Rules:         samplingRules,
	}, nil
}


// GetConfigHistory returns agent config version history for a given element type (e.g. Drop Rules, Sampling Rules)
func (ic *IngestionController) GetConfigHistory(ctx context.Context, elementType string) (*IngestionRulesResponse, *model.ApiError) {
	var typ agentConf.ElementTypeDef
	if elementType == string(agentConf.ElementTypeDropRules) {
		typ = agentConf.ElementTypeDropRules
	} else if elementType == string(agentConf.ElementTypeSamplingRules) {
		typ = agentConf.ElementTypeSamplingRules
	} else {
		return nil, model.BadRequestStr("invalid request for agent config history")
	}

	history, err := agentConf.GetConfigHistory(ctx, typ)
	if err != nil {
		zap.S().Errorf("failed to fetch agent config history for type", typ, err)
		return nil, model.InternalErrorStr("failed to get agent config history")
	}

	return &IngestionRulesResponse{
		History: history,
	}, nil
}
