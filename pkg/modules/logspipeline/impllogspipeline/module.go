package impllogspipeline

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/logspipeline"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const elementType = "log_pipelines"

type module struct {
	sqlStore sqlstore.SQLStore
}

func NewModule(sqlStore sqlstore.SQLStore) logspipeline.Module {
	return &module{sqlStore: sqlStore}
}

func (m *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	subq := m.sqlStore.BunDB().NewSelect().
		TableExpr("agent_config_version").
		ColumnExpr("MAX(version)").
		Where("org_id = ?", orgID).
		Where("element_type = ?", elementType)

	var count int
	err := m.sqlStore.BunDB().NewSelect().
		TableExpr("agent_config_element AS e").
		Join("JOIN agent_config_version AS v ON v.id = e.version_id").
		Where("v.org_id = ?", orgID).
		Where("v.element_type = ?", elementType).
		Where("v.version = (?)", subq).
		ColumnExpr("COUNT(*) AS count").
		Scan(ctx, &count)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"logs_pipeline.count": count,
	}, nil
}
