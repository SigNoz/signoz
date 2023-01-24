package ingestionRules

import (
	"context"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/app/agentConf"
	baseopamp "go.signoz.io/signoz/pkg/query-service/app/opamp"
	"go.uber.org/zap"
)

// Provisioner takes care of deployment cycle of ingestion rules.
type Provisioner struct {
	repo         Repo
	AgentUpdater *baseopamp.RequestQueue
}

func NewProvisioner(db *sqlx.DB) (*Provisioner, error) {
	repo := NewRepo(db)
	return &Provisioner{repo: repo, AgentUpdater: baseopamp.AgentConfigUpdater}, nil
}

func (p *Provisioner) ApplyDropRules(ctx context.Context, postable []PostableIngestionRule) (*ConfigVersion, *model.ApiError) {
	var dropRules []*model.IngestionRule

	// scan through postable rules, to select the existing rules or insert missing ones
	for _, r := range postable {
		if r.Id == "" {
			inserted, err := p.repo.InsertRule(ctx, &r)
			if err != nil {
				zap.S().Errorf("failed to insert edited ingestion rule", err)
				return model.BadRequestStr("failed to insert edited rule")
			} else {
				dropRules = append(dropRules, inserted)
			}
		} else {
			selected, err := p.repo.GetRule(ctx, r.Id)
			if err != nil {
				zap.S().Errorf("failed to find edited ingestion rule", err)
				return model.BadRequestStr("failed to find edited rule, invalid request")
			}
			dropRules = append(dropRules, selected)
		}
	}

	// prepare filter config (processor) from the drop rules
	filterConfig, err := PrepareDropFilter(dropRules)
	if err != nil {
		zap.S().Errorf("failed to generate processor config from ingestion rules for deployment", err)
		return model.BadRequest(err)
	}

	if !agentConf.Updater.Available() {
		return model.InternalErrorStr("Agent updater unavailable at the moment. Please try in sometime")
	}

	// prepare config by calling gen func
	cfg, err := agentConf.Updater.StartNewVersion(ctx, agentConf.ElementTypeDropRules, dropRules)
	if err != nil {
		return cfg, model.InternalError(err)
	}

	zap.S().Info("applying drop rule config", cfg)

	// queue up the config to push to opamp
	return agentConf.Updater.UpsertFilterProcessor("filter/1000", filterConfig)
}
