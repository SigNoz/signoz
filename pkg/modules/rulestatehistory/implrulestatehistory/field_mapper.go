package implrulestatehistory

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var ruleStateHistoryColumns = map[string]*schema.Column{
	"rule_id":               {Name: "rule_id", Type: schema.ColumnTypeString},
	"rule_name":             {Name: "rule_name", Type: schema.ColumnTypeString},
	"overall_state":         {Name: "overall_state", Type: schema.ColumnTypeString},
	"overall_state_changed": {Name: "overall_state_changed", Type: schema.ColumnTypeBool},
	"state":                 {Name: "state", Type: schema.ColumnTypeString},
	"state_changed":         {Name: "state_changed", Type: schema.ColumnTypeBool},
	"unix_milli":            {Name: "unix_milli", Type: schema.ColumnTypeInt64},
	"labels":                {Name: "labels", Type: schema.ColumnTypeString},
	"fingerprint":           {Name: "fingerprint", Type: schema.ColumnTypeUInt64},
	"value":                 {Name: "value", Type: schema.ColumnTypeFloat64},
}

type storage struct{}

var _ qbtypes.Storage = (*storage)(nil)

func newStorage() *storage {
	return &storage{}
}

func (m *storage) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) { //nolint:unparam
	name := strings.TrimSpace(key.Name)
	if col, ok := ruleStateHistoryColumns[name]; ok {
		return col, nil
	}
	return ruleStateHistoryColumns["labels"], nil
}

func (m *storage) Read(ctx context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	col, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}
	if col.Name == "labels" && key.Name != "labels" {
		return fmt.Sprintf("JSONExtractString(labels, %s)", querybuilder.ClickHouseStringLiteral(key.Name)), nil
	}
	return col.Name, nil
}

// Exists answers a label inside the JSON with a membership check, with the
// same condition that Read uses for extraction. Absent, a label reads the
// empty string, and that is the keyless contract here, so no query guards
// it; every real column always exists.
func (m *storage) Exists(ctx context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, exists bool) (qbtypes.Existence, error) {
	col, err := m.getColumn(ctx, key)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	if col.Name == "labels" && key.Name != "labels" {
		predicate := fmt.Sprintf("JSONHas(labels, %s)", querybuilder.ClickHouseStringLiteral(key.Name))
		if !exists {
			predicate = "not " + predicate
		}
		return qbtypes.Existence{Predicate: predicate, WhenAbsent: qbtypes.AbsentIsValue}, nil
	}
	return qbtypes.Existence{Predicate: "true", WhenAbsent: qbtypes.AlwaysPresent}, nil
}

// Fallback returns nil: rule-state history has no attribute-map fallback, so
// a key metadata does not hold stays unresolved and the caller errors.
func (m *storage) Fallback(context.Context, qbtypes.QueryInfo, *telemetrytypes.TelemetryFieldKey, qbtypes.FilterOperator, any) ([]*telemetrytypes.LogicalField, error) {
	return nil, nil
}

func (m *storage) Traits() qbtypes.Traits {
	return qbtypes.Traits{}
}

func (m *storage) Compile(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	return querybuilder.SharedCondition(ctx, q, m, logical, operator, value, sb)
}

func (m *storage) ColumnRead(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, _ any) (qbtypes.ColumnExpr, error) {
	return querybuilder.DefaultRead(ctx, q, m, logical)
}
