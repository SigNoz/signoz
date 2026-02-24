package impllogspipeline

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/logspipeline"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	sqlstore sqlstore.SQLStore
}

func NewModule(sqlstore sqlstore.SQLStore) logspipeline.Module {
	return &module{sqlstore: sqlstore}
}

func (m *module) ListPipelines(ctx context.Context, orgID valuer.UUID) ([]pipelinetypes.GettablePipeline, error) {
	latestVersion := -1
	// get latest agent config
	lastestConfig, err := agentConf.GetLatestVersion(ctx, orgID, opamptypes.ElementTypeLogPipelines)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if lastestConfig != nil {
		latestVersion = lastestConfig.Version
	}
	return m.ListPipelinesByVersion(ctx, orgID, latestVersion)
}

func (m *module) ListPipelinesByVersion(ctx context.Context, orgID valuer.UUID, version int) ([]pipelinetypes.GettablePipeline, error) {
	var stored []pipelinetypes.StoreablePipeline
	err := m.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Join("JOIN agent_config_element e ON p.id = e.element_id").
		Join("JOIN agent_config_version v ON v.id = e.version_id").
		Where("e.element_type = ?", opamptypes.ElementTypeLogPipelines.StringValue()).
		Where("v.version = ?", version).
		Where("v.org_id = ?", orgID.StringValue()).
		Order("p.order_id ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	pipelines := make([]pipelinetypes.GettablePipeline, len(stored))
	if len(stored) == 0 {
		return pipelines, nil
	}

	for i := range stored {
		pipelines[i].StoreablePipeline = stored[i]
		if err := pipelines[i].ParseRawConfig(); err != nil {
			return nil, err
		}
		if err := pipelines[i].ParseFilter(); err != nil {
			return nil, err
		}
	}

	return pipelines, nil
}

func (m *module) GetPipeline(ctx context.Context, orgID valuer.UUID, id string) (*pipelinetypes.GettablePipeline, error) {
	return nil, nil
}

func (m *module) CreatePipeline(ctx context.Context, orgID valuer.UUID, pipeline *pipelinetypes.PostablePipeline) (*pipelinetypes.GettablePipeline, error) {
	return nil, nil
}

func (m *module) UpdatePipeline(ctx context.Context, orgID valuer.UUID, id string, pipeline *pipelinetypes.PostablePipeline) (*pipelinetypes.GettablePipeline, error) {
	if err := pipeline.IsValid(); err != nil {
		return nil, err
	}

	

	return nil, nil
}

func (m *module) DeletePipeline(ctx context.Context, orgID valuer.UUID, id string) error {
	return nil
}
