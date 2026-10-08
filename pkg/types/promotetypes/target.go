package promotetypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// Target identifies a promotion domain.
type Target struct {
	Entry              telemetrytypes.EvolutionEntry // evolution row template; FieldName and ReleaseTime are set per write
	DBName             string                        // index DDL database, used only when IndexesSupported
	LocalTableName     string                        // index DDL local table, used only when IndexesSupported
	BaseColumn         string                        // column holding every path; indexes for unpromoted paths are created on it
	RequiredPathPrefix string                        // prefix API paths must carry, stripped before storing; empty for bare names
	IndexesSupported   bool
}

func (t Target) PromotedColumn() string { return t.Entry.ColumnName }

func (t Target) BaseColumnPrefix() string { return t.BaseColumn + "." }

func (t Target) PromotedColumnPrefix() string { return t.PromotedColumn() + "." }

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

// NewLogsBodyTarget returns the logs body domain (body_v2 -> body_promoted).
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

// NewTracesAttributesTarget returns the spans attributes domain (attributes
// -> attributes_promoted).
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

func NewTargetFromText(signal, context string) (Target, error) {
	parsedSignal, ok := telemetrytypes.SignalFromText(signal)
	if !ok {
		return Target{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid signal: %s", signal)
	}
	parsedContext, ok := telemetrytypes.FieldContextFromText(context)
	if !ok {
		return Target{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid context: %s", context)
	}
	target, ok := TargetFor(parsedSignal, parsedContext)
	if !ok {
		return Target{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "promotion is not supported for %s %s", parsedSignal.StringValue(), parsedContext.StringValue())
	}
	return target, nil
}

func Targets() []Target {
	return []Target{
		NewLogsBodyTarget(),
		NewTracesAttributesTarget(),
	}
}

func TargetFor(signal telemetrytypes.Signal, context telemetrytypes.FieldContext) (Target, bool) {
	for _, target := range Targets() {
		if target.Entry.Signal.StringValue() == signal.StringValue() &&
			target.Entry.FieldContext.StringValue() == context.StringValue() {
			return target, true
		}
	}
	return Target{}, false
}
