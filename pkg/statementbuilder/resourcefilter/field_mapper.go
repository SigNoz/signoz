package resourcefilter

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	resourceColumns = map[string]*schema.Column{
		"labels":                  {Name: "labels", Type: schema.ColumnTypeString},
		"fingerprint":             {Name: "fingerprint", Type: schema.ColumnTypeString},
		"seen_at_ts_bucket_start": {Name: "seen_at_ts_bucket_start", Type: schema.ColumnTypeInt64},
	}
)

type storage struct{}

var _ qbtypes.Storage = (*storage)(nil)

func newStorage() *storage {
	return &storage{}
}

func (m *storage) getColumn(
	_ context.Context,
	_, _ uint64,
	key *telemetrytypes.TelemetryFieldKey,
) ([]*schema.Column, error) {
	if key.FieldContext == telemetrytypes.FieldContextResource {
		return []*schema.Column{resourceColumns["labels"]}, nil
	}
	if col, ok := resourceColumns[key.Name]; ok {
		return []*schema.Column{col}, nil
	}
	return nil, qbtypes.ErrColumnNotFound
}

func (m *storage) Read(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, q.StartNs, q.EndNs, key)
	if err != nil {
		return "", err
	}
	if key.FieldContext == telemetrytypes.FieldContextResource {
		return fmt.Sprintf("simpleJSONExtractString(%s, '%s')", columns[0].Name, key.Name), nil
	}
	return columns[0].Name, nil
}

// Exists reports key presence in the fingerprint labels JSON. Only resource
// context keys have a presence notion here; anything else is a real column
// and always present.
func (m *storage) Exists(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, exists bool) (qbtypes.Existence, error) {
	columns, err := m.getColumn(ctx, q.StartNs, q.EndNs, key)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	if key.FieldContext != telemetrytypes.FieldContextResource {
		predicate := "true"
		if !exists {
			predicate = "false"
		}
		return qbtypes.Existence{Predicate: predicate, WhenAbsent: qbtypes.AlwaysPresent}, nil
	}
	predicate := fmt.Sprintf("simpleJSONHas(%s, '%s')", columns[0].Name, key.Name)
	if !exists {
		predicate = "NOT " + predicate
	}
	return qbtypes.Existence{Predicate: predicate, WhenAbsent: qbtypes.AbsentIsSentinel}, nil
}

// Fallback returns nil: the fingerprint table holds only what the metadata
// reports, and a term it cannot serve is the main query's to evaluate.
func (m *storage) Fallback(context.Context, qbtypes.QueryInfo, *telemetrytypes.TelemetryFieldKey, qbtypes.FilterOperator, any) ([]*telemetrytypes.LogicalField, error) {
	return nil, nil
}

func (m *storage) Traits() qbtypes.Traits {
	return qbtypes.Traits{Split: qbtypes.FingerprintOfSplit, UnknownKey: qbtypes.IgnoreUnknownKey}
}

func (m *storage) ColumnRead(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, _ any) (qbtypes.ColumnExpr, error) {
	return querybuilder.DefaultRead(ctx, q, m, logical)
}
