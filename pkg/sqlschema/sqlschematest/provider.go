package sqlschematest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/schema"
)

var _ sqlschema.SQLSchema = (*Provider)(nil)

type Provider struct {
	Fmter             sqlschema.Formatter
	Tables            map[string]*sqlschema.Table
	UniqueConstraints map[string][]*sqlschema.UniqueConstraint
	Indices           map[string]sqlschema.Index
}

func New(tables map[string]*sqlschema.Table, uniqueConstraints map[string][]*sqlschema.UniqueConstraint, indices map[string]sqlschema.Index) *Provider {
	return &Provider{
		Fmter:             sqlschema.NewFormatter(schema.NewNopFormatter().Dialect()),
		Tables:            tables,
		UniqueConstraints: uniqueConstraints,
		Indices:           indices,
	}
}

func (provider *Provider) Formatter() sqlschema.SQLFormatter {
	return provider.Fmter
}

func (provider *Provider) Operator() sqlschema.SQLOperator {
	return sqlschema.NewOperator(provider.Fmter, sqlschema.OperatorSupport{})
}

func (provider *Provider) GetTable(ctx context.Context, name sqlschema.TableName) (*sqlschema.Table, []*sqlschema.UniqueConstraint, error) {
	table, ok := provider.Tables[string(name)]
	if !ok {
		return nil, nil, errors.NewNotFoundf(errors.CodeNotFound, "table %s not found", name)
	}

	return table, provider.UniqueConstraints[string(name)], nil
}

func (provider *Provider) GetIndices(ctx context.Context, name sqlschema.TableName) ([]sqlschema.Index, error) {
	indices, ok := provider.Indices[string(name)]
	if !ok {
		return []sqlschema.Index{}, nil
	}

	return []sqlschema.Index{indices}, nil
}

func (provider *Provider) ToggleFKEnforcement(_ context.Context, _ bun.IDB, _ bool) error {
	return nil
}
