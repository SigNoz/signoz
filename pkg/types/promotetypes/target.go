package promotetypes

import (
	"fmt"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/pkg/keycheck"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// Target identifies a promotion domain.
type Target struct {
	Entry            telemetrytypes.EvolutionEntry // evolution row template; FieldName and ReleaseTime are set per write
	DBName           string                        // index DDL database, used only when IndexesSupported
	LocalTableName   string                        // index DDL local table, used only when IndexesSupported
	BaseColumn       string                        // column holding every path; indexes for unpromoted paths are created on it
	IndexesSupported bool
}

func (t Target) PromotedColumn() string { return t.Entry.ColumnName }

func (t Target) BaseColumnPrefix() string { return t.BaseColumn + "." }

func (t Target) PromotedColumnPrefix() string { return t.PromotedColumn() + "." }

func (t Target) RejectedPathPrefixes() []string {
	switch t.Entry.Signal {
	case telemetrytypes.SignalLogs:
		return []string{telemetrytypes.BodyJSONStringSearchPrefix, t.BaseColumnPrefix(), t.PromotedColumnPrefix()}
	default:
		return []string{t.BaseColumnPrefix(), t.PromotedColumnPrefix()}
	}
}

// IndexExpression folds logs strings to lower case over assumeNotNull for
// case-insensitive LIKE searches; traces indexes are a bare type cast.
func (t Target) IndexExpression(column, path, jsonDataType string) string {
	switch t.Entry.Signal {
	case telemetrytypes.SignalLogs:
		return schemamigrator.JSONSubColumnIndexExpr(column, path, jsonDataType)
	default:
		return simpleJSONSubColumnIndexExpr(column, path, jsonDataType)
	}
}

// simpleJSONSubColumnIndexExpr renders `column.path::Type`; the cast unwraps
// the Nullable the sub-column access returns, which bloom filter indexes
// reject.
func simpleJSONSubColumnIndexExpr(column, path, jsonDataType string) string {
	parts := strings.Split(column+"."+path, ".")
	for idx, part := range parts {
		if keycheck.IsBacktickRequired(part) {
			part := strings.Trim(part, "`")
			parts[idx] = "`" + part + "`"
		}
	}
	return fmt.Sprintf("%s::%s", strings.Join(parts, "."), jsonDataType)
}

func (t Target) IndexSource() telemetrytypes.JSONIndexSource {
	return telemetrytypes.JSONIndexSource{
		Signal:               t.Entry.Signal,
		FieldContext:         t.Entry.FieldContext,
		DBName:               t.DBName,
		LocalTableName:       t.LocalTableName,
		BaseColumnPrefix:     t.BaseColumnPrefix(),
		PromotedColumnPrefix: t.PromotedColumnPrefix(),
	}
}

func NewTarget(entry telemetrytypes.EvolutionEntry, dbName, localTableName, baseColumn string, indexesSupported bool) Target {
	return Target{
		Entry:            entry,
		DBName:           dbName,
		LocalTableName:   localTableName,
		BaseColumn:       baseColumn,
		IndexesSupported: indexesSupported,
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
		true,
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
