package ingestionRules

import (
	"context"
	"math/rand"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	baseopamp "go.signoz.io/signoz/pkg/query-service/app/opamp"
	"go.uber.org/zap"
)

func init() {
	rand.Seed(42)
}

// Provisioner takes care of deployment cycle of ingestion rules.
type Provisioner struct {
	repo         Repo
	AgentUpdater *baseopamp.RequestQueue
}

func NewProvisioner(db *sqlx.DB) (*Provisioner, error) {
	repo := NewRepo(db)
	return &Provisioner{repo: repo, AgentUpdater: baseopamp.AgentConfigUpdater}, nil
}

// StartDeploy pushes dirty (changed) rules to collector config
// steps:
// 1. marks them as DEPLOYING, assign a deployment_sequence
// 2. if a rule gets changed in between from the ui, they will be marked as dirty again
// 3. at the end of process, provisioner will mark the Deployed records with deployment_sequence as DEPLOYED
// 4. for failure, mark record as FAILED, set deployment_sequence to null
// we do not take care of config rollback in case of failure here. we expect
// opamp to automatically restore older config (file) if the new update fails.
// this method also does not handle mutex and expects the request queue (app>>opamp) to
// handle the sequential execution in the order.
func (p *Provisioner) StartDeploy(ctx context.Context) (fnerr error) {

	seq := rand.Int()
	var dirtyRules []IngestionRule
	defer func() {
		if fnerr != nil {
			p.repo.UpdateStatusBySeq(ctx, seq, DeployFailed, fnerr.Error())
		} else {
			if len(dirtyRules) != 0 {
				p.repo.UpdateStatusBySeq(ctx, seq, Deployed, "")
			}
		}
	}()

	err := p.repo.MarkDeploying(ctx, seq, IngestionRuleTypeDrop)
	if err != nil {
		zap.S().Errorf("failed to mark rules for deployment", err)
		return errors.Wrap(err, "failed to mark rules for deployment")
	}

	dropRules, errs := p.repo.GetDropRules(context.Background())
	if len(errs) == 0 {
		zap.S().Errorf("failed to fetch ingestion rules for deployment", errs)
		return errs[0]
	}

	config, err := PrepareDropFilter(dropRules)
	if err != nil {
		zap.S().Errorf("failed to generate processor config from ingestion rules for deployment", err)
		return err
	}

	return p.AgentUpdater.ApplyFilterConfig(config)
}
