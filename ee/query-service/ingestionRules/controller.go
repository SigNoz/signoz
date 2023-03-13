package ingestionRules

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/model"
	agentConf "go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.uber.org/zap"
)

// Controller takes care of deployment cycle of ingestion rules.
type IngestionController struct {
	Repo
}

func NewIngestionController(db *sqlx.DB, engine string) (*IngestionController, error) {
	repo := NewRepo(db)
	err := repo.InitDB(engine)
	return &IngestionController{Repo: repo}, err
}

// IngestionRulesResponse is used to prepare http response for rule config related requests
type IngestionRulesResponse struct {
	*agentConf.ConfigVersion

	Rules   []model.IngestionRule     `json:"rules"`
	History []agentConf.ConfigVersion `json:"history"`
}

// ApplyRules conditionally calls applyDropRules or applySampling rules
func (ic *IngestionController) ApplyRules(ctx context.Context, elementType agentConf.ElementTypeDef, postable []PostableIngestionRule) (*IngestionRulesResponse, *model.ApiError) {
	switch elementType {
	case agentConf.ElementTypeDropRules:
		return ic.ApplyDropRules(ctx, postable)
	case agentConf.ElementTypeSamplingRules:
		return ic.ApplySamplingRules(ctx, postable)
	}
	return nil, model.BadRequestStr("unexpected element type")
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
			inserted, err := ic.insertRule(ctx, &r)
			if err != nil || inserted == nil {
				zap.S().Errorf("failed to insert edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to insert edited rule")
			} else {
				dropRules = append(dropRules, *inserted)
			}
		} else {
			// we pick the latest rule instead of one sent from client (browser)
			// to make sure the ID is valid and relates to an ingestion rule.
			// since rules are immutable, we can also use stored version from DB
			// instead of picking the update from client (browser) request
			selected, err := ic.GetRule(ctx, r.Id)
			if err != nil || selected == nil {
				zap.S().Errorf("failed to find edited ingestion rule", err, r.Id)
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
		// todo(amol): may be good idea to new ingestion rules created in this request?
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
		zap.S().Errorf("failed to start a new config version for drop rules", err)
		return nil, model.InternalError(err)
	}

	zap.S().Info("applying drop rule config", cfg)

	// queue up the config to push to opamp
	err = agentConf.UpsertFilterProcessor(ctx, cfg.Version, filterConfig)
	history, _ := agentConf.GetConfigHistory(ctx, agentConf.ElementTypeDropRules)

	response := &IngestionRulesResponse{
		ConfigVersion: cfg,
		Rules:         dropRules,
		History:       history,
	}

	if err != nil {
		zap.S().Errorf("failed to insert drop rules into agent config", filterConfig, err)
		return response, model.InternalErrorStr(fmt.Sprintf("failed to apply drop rules:  %s", err.Error()))
	}

	return response, nil
}

// GetRulesByVersion responds with version info and associated drop rules
func (ic *IngestionController) GetRulesByVersion(ctx context.Context, version int, typ agentConf.ElementTypeDef) (*IngestionRulesResponse, *model.ApiError) {
	rules, apierr := ic.getRulesByVersion(ctx, version)
	if apierr != nil {
		zap.S().Errorf("failed to get ingestion rules for version", version, apierr)
		return nil, model.InternalErrorStr("failed to get drop rules for given version")
	}

	configVersion, err := agentConf.GetConfigVersion(ctx, typ, version)
	if err != nil || configVersion == nil {
		zap.S().Errorf("failed to get version info", version, err)
		return nil, model.InternalErrorStr("failed to get info on the given version")
	}

	return &IngestionRulesResponse{
		ConfigVersion: configVersion,
		Rules:         rules,
	}, nil
}

// ApplySamplingRules stores new or changed sampling rules and initiates a new config update
func (ic *IngestionController) ApplySamplingRules(ctx context.Context, postable []PostableIngestionRule) (*IngestionRulesResponse, *model.ApiError) {
	var smplRules []model.IngestionRule

	// scan through postable rules, to select the existing rules or insert missing ones
	for _, r := range postable {
		if apierr := r.IsValid(); apierr != nil {
			return nil, apierr
		}

		if err := r.Config.SamplingConfig.Valid(); err != nil {
			return nil, model.BadRequest(err)
		}

		// note: we process only new and changed rules here, deleted rules are not expected
		// from client. if user deletes a rule, the client should not send that rule in the update.
		// in effect, the new config version will not have that rule.

		if r.Id == "" {
			// looks like a new or changed rule, store it first
			inserted, err := ic.insertRule(ctx, &r)
			if err != nil || inserted == nil {
				zap.S().Errorf("failed to insert edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to insert edited rule")
			} else {
				smplRules = append(smplRules, *inserted)
			}
		} else {
			selected, err := ic.GetRule(ctx, r.Id)
			if err != nil || selected == nil {
				zap.S().Errorf("failed to find edited ingestion rule", err)
				return nil, model.BadRequestStr("failed to find edited rule, invalid request")
			}
			smplRules = append(smplRules, *selected)
		}

	}

	// prepare params for sampling processor from the rules
	params, err := PrepareTailSamplingParams(smplRules)
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

	params.Version = cfg.Version
	zap.S().Info("applying sampling rule config", cfg)

	// queue up the config to push to opamp
	err = agentConf.UpsertSamplingProcessor(ctx, cfg.Version, params)
	history, _ := agentConf.GetConfigHistory(ctx, agentConf.ElementTypeSamplingRules)

	response := &IngestionRulesResponse{
		ConfigVersion: cfg,
		Rules:         smplRules,
		History:       history,
	}

	if err != nil {
		zap.S().Errorf("failed to insert sampling rules into agent config: ", params, err)
		return response, model.InternalErrorStr(fmt.Sprintf("failed to apply drop rules:  %s", err.Error()))
	}
	return response, nil
}
