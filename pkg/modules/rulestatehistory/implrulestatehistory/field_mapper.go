package implrulestatehistory

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
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

type fieldMapper struct{}

func newFieldMapper() qbtypes.FieldMapper {
	return &fieldMapper{}
}

func (m *fieldMapper) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) { //nolint:unparam
	name := strings.TrimSpace(key.Name)
	if col, ok := ruleStateHistoryColumns[name]; ok {
		return col, nil
	}
	return ruleStateHistoryColumns["labels"], nil
}

func (m *fieldMapper) FieldFor(ctx context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	col, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}
	if col.Name == "labels" && key.Name != "labels" {
		return fmt.Sprintf("JSONExtractString(labels, '%s')", strings.ReplaceAll(key.Name, "'", "\\'")), nil
	}
	return col.Name, nil
}

func (m *fieldMapper) ColumnFor(ctx context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	col, err := m.getColumn(ctx, key)
	if err != nil {
		return nil, err
	}
	return []*schema.Column{col}, nil
}

func (m *fieldMapper) ColumnExpressionFor(ctx context.Context, tsStart, tsEnd uint64, field *telemetrytypes.TelemetryFieldKey, _ map[string][]*telemetrytypes.TelemetryFieldKey) (string, error) {
	colName, err := m.FieldFor(ctx, tsStart, tsEnd, field)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(colName), field.Name), nil
}
