package promotetypes

import (
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewTarget creates the Target for a promotion domain: the column evolution
// entry templating each promotion record, the table per-path indexes are
// created on, and the path rules enforced by the API.
func NewTarget(entry telemetrytypes.EvolutionEntry, dbName, localTableName, baseColumn, requiredPathPrefix string, indexesSupported bool) Target {
	return Target{
		Entry:              entry,
		DBName:             dbName,
		LocalTableName:     localTableName,
		BaseColumn:         baseColumn,
		RequiredPathPrefix: requiredPathPrefix,
		IndexesSupported:   indexesSupported,
	}
}

// NewLogsBodyTarget returns the promotion domain for the logs body JSON
// column (body_v2 -> body_promoted), with per-path skip index support.
func NewLogsBodyTarget() Target {
	return NewTarget(
		telemetrytypes.EvolutionEntry{
			Signal:       telemetrytypes.SignalLogs,
			ColumnName:   logstelemetryschema.LogsV2BodyPromotedColumn,
			ColumnType:   "JSON()",
			FieldContext: telemetrytypes.FieldContextBody,
		},
		logstelemetryschema.DBName,
		logstelemetryschema.LogsV2LocalTableName,
		logstelemetryschema.LogsV2BodyV2Column,
		telemetrytypes.BodyJSONStringSearchPrefix,
		true,
	)
}

// NewTracesAttributesTarget returns the promotion domain for the spans
// attributes JSON column (attributes -> attributes_promoted). Per-path skip
// indexes are not wired into the traces query builder yet, so only promotion
// is supported for now.
func NewTracesAttributesTarget() Target {
	return NewTarget(
		telemetrytypes.EvolutionEntry{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   tracestelemetryschema.SpanAttributesPromotedColumn,
			ColumnType:   "JSON()",
			FieldContext: telemetrytypes.FieldContextAttribute,
		},
		tracestelemetryschema.DBName,
		tracestelemetryschema.SpanIndexV3LocalTableName,
		tracestelemetryschema.SpanAttributesColumn,
		"",
		false,
	)
}

// Targets returns every supported promotion domain.
func Targets() []Target {
	return []Target{
		NewLogsBodyTarget(),
		NewTracesAttributesTarget(),
	}
}

// TargetFor resolves the promotion domain for a (signal, context) pair.
// ok is false when no domain exists for the pair.
func TargetFor(signal telemetrytypes.Signal, context telemetrytypes.FieldContext) (Target, bool) {
	for _, target := range Targets() {
		if target.Entry.Signal.StringValue() == signal.StringValue() &&
			target.Entry.FieldContext.StringValue() == context.StringValue() {
			return target, true
		}
	}
	return Target{}, false
}
