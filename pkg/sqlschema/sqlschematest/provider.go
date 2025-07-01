package sqlschematest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/uptrace/bun/schema"
)

type Provider struct {
	Fmtter schema.Formatter
}

func New() *Provider {
	return &Provider{
		Fmtter: schema.NewFormatter(schema.NewNopFormatter().Dialect()),
	}
}

func (provider *Provider) Formatter() sqlschema.SQLFormatter {
	return provider
}

func (provider *Provider) AppendIdent(b []byte, ident string) []byte {
	return provider.Fmtter.AppendIdent(b, ident)
}

func (provider *Provider) SQLDataTypeOf(dataType sqlschema.DataType) string {
	return dataType.String()
}

func (provider *Provider) CreateIndex(ctx context.Context, index sqlschema.Index) [][]byte {
	return [][]byte{index.ToCreateSQL(provider)}
}

func (provider *Provider) DropConstraintUnsafe(ctx context.Context, table *sqlschema.Table, constraint sqlschema.Constraint) [][]byte {
	return table.ToCreateTempInsertDropAlterSQL(provider)
}
