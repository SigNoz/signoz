package sqlschematest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/uptrace/bun/schema"
)

var _ sqlschema.SQLSchema = (*Provider)(nil)

type Provider struct {
	Fmter sqlschema.Formatter
}

func New() *Provider {
	return &Provider{
		Fmter: sqlschema.NewFormatter(schema.NewNopFormatter().Dialect()),
	}
}

func (provider *Provider) Tabled() sqlschema.TabledSQLSchema {
	return nil
}

func (provider *Provider) CreateIndex(ctx context.Context, index sqlschema.Index) ([][]byte, error) {
	return [][]byte{index.ToCreateSQL(provider.Fmter)}, nil
}

func (provider *Provider) DropConstraint(ctx context.Context, tableName sqlschema.TableName, constraint sqlschema.Constraint) ([][]byte, error) {
	return nil, nil
}

func (provider *Provider) AddColumn(ctx context.Context, tableName sqlschema.TableName, column *sqlschema.Column, val any) ([][]byte, error) {
	return nil, nil
}

func (provider *Provider) GetTable(ctx context.Context, name sqlschema.TableName) (*sqlschema.Table, []*sqlschema.UniqueConstraint, []sqlschema.Index, error) {
	return nil, nil, nil, nil
}
