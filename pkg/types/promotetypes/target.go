package promotetypes

import (
	"fmt"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// Target identifies a promotion context.
type Target struct {
	Entry          telemetrytypes.EvolutionEntry // evolution row template; FieldName and ReleaseTime are set per write
	DBName         string                        // index DDL database
	LocalTableName string                        // index DDL local table
	BaseColumn     string                        // column holding every path; indexes for unpromoted paths are created on it
}

func (t Target) PromotedColumn() string { return t.Entry.ColumnName }

func (t Target) BaseColumnPrefix() string { return t.BaseColumn + "." }

func (t Target) PromotedColumnPrefix() string { return t.PromotedColumn() + "." }

// IndexExpression folds logs strings to lower case over assumeNotNull for
// case-insensitive LIKE searches; traces indexes are the querier's read, which
// an index matches only as that exact text.
func (t Target) IndexExpression(column, path, jsonDataType string) string {
	if t.Entry.Signal == telemetrytypes.SignalLogs {
		return schemamigrator.JSONSubColumnIndexExpr(column, path, jsonDataType)
	}
	subColumn := fmt.Sprintf("%s.%s", column, clickhousesql.Identifier(path))
	expr, _ := tracestelemetryschema.AttributeJSONValueExpr(subColumn, telemetrytypes.MappingJSONDataTypeToFieldDataType[jsonDataType])
	return expr
}

// IndexDataType folds traces Int64 into Float64, the one type the querier
// reads every traces number as.
func (t Target) IndexDataType(jsonDataType telemetrytypes.JSONDataType) telemetrytypes.JSONDataType {
	if t.Entry.Signal != telemetrytypes.SignalLogs && jsonDataType == telemetrytypes.Int64 {
		return telemetrytypes.Float64
	}
	return jsonDataType
}

func (t Target) JSONIndexLookup() telemetrytypes.JSONIndexLookup {
	return telemetrytypes.JSONIndexLookup{
		Signal:               t.Entry.Signal,
		FieldContext:         t.Entry.FieldContext,
		DBName:               t.DBName,
		LocalTableName:       t.LocalTableName,
		BaseColumnPrefix:     t.BaseColumnPrefix(),
		PromotedColumnPrefix: t.PromotedColumnPrefix(),
	}
}

func NewTarget(entry telemetrytypes.EvolutionEntry, dbName, localTableName, baseColumn string) Target {
	return Target{
		Entry:          entry,
		DBName:         dbName,
		LocalTableName: localTableName,
		BaseColumn:     baseColumn,
	}
}

// NewLogsBodyTarget returns the logs body context (body_v2 -> body_promoted).
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
	)
}

// NewTracesAttributesTarget returns the spans attributes context (attributes
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

// reservedPathPrefix returns the target prefix path carries, if any: the base
// or promoted column prefix, or the logs body search alias, which is stripped
// from queries before metadata lookup and can never match.
func (t Target) reservedPathPrefix(path string) (string, bool) {
	prefixes := []string{t.BaseColumnPrefix(), t.PromotedColumnPrefix()}
	if t.Entry.Signal == telemetrytypes.SignalLogs {
		prefixes = append(prefixes, telemetrytypes.BodyJSONStringSearchPrefix)
	}
	for _, prefix := range prefixes {
		if strings.HasPrefix(path, prefix) {
			return prefix, true
		}
	}
	return "", false
}
