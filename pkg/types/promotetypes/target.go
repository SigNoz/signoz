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

// Target identifies a promotion domain: the column evolution record written
// per promoted path, the table per-path indexes are created on, and the API
// path rules.
type Target struct {
	Entry            telemetrytypes.EvolutionEntry // evolution row template; FieldName and ReleaseTime are set per write
	DBName           string                        // index DDL database, used only when IndexesSupported
	LocalTableName   string                        // index DDL local table, used only when IndexesSupported
	BaseColumn       string                        // column holding every path; indexes for unpromoted paths are created on it
	IndexesSupported bool                          // whether per-path skip indexes can be created for this domain
}

func (t Target) PromotedColumn() string { return t.Entry.ColumnName }

func (t Target) BaseColumnPrefix() string { return t.BaseColumn + "." }

func (t Target) PromotedColumnPrefix() string { return t.PromotedColumn() + "." }

// RejectedPathPrefixes lists the prefixes API paths must not carry: the
// column prefixes of the domain, and for logs body the legacy `body.` context
// prefix (the context is already named by the API URL).
func (t Target) RejectedPathPrefixes() []string {
	switch t.Entry.Signal {
	case telemetrytypes.SignalLogs:
		return []string{telemetrytypes.BodyJSONStringSearchPrefix, t.BaseColumnPrefix(), t.PromotedColumnPrefix()}
	default:
		return []string{t.BaseColumnPrefix(), t.PromotedColumnPrefix()}
	}
}

// IndexExpression renders the skip-index expression for a path of the given
// parent column. Logs indexes fold strings to lower case over assumeNotNull
// for case-insensitive LIKE searches; traces indexes are a bare JSON type
// cast.
func (t Target) IndexExpression(column, path, jsonDataType string) string {
	switch t.Entry.Signal {
	case telemetrytypes.SignalLogs:
		return schemamigrator.JSONSubColumnIndexExpr(column, path, jsonDataType)
	default:
		return simpleJSONSubColumnIndexExpr(column, path, jsonDataType)
	}
}

// simpleJSONSubColumnIndexExpr renders `column.path::Type`: a bare type cast
// of the JSON sub-column. The cast unwraps the Nullable the sub-column access
// returns, which bloom filter indexes reject. Path segments that need it are
// backticked.
func simpleJSONSubColumnIndexExpr(column, path, jsonDataType string) string {
	parts := strings.Split(column+"."+path, ".")
	for idx, part := range parts {
		if keycheck.IsBacktickRequired(part) {
			part := strings.Trim(part, "`") // trim if already present
			parts[idx] = "`" + part + "`"
		}
	}
	return fmt.Sprintf("%s::%s", strings.Join(parts, "."), jsonDataType)
}

// IndexSource returns the table and column facts used to list the per-path
// skip indexes of this domain.
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

// NewTarget creates the Target for a promotion domain.
func NewTarget(entry telemetrytypes.EvolutionEntry, dbName, localTableName, baseColumn string, indexesSupported bool) Target {
	return Target{
		Entry:            entry,
		DBName:           dbName,
		LocalTableName:   localTableName,
		BaseColumn:       baseColumn,
		IndexesSupported: indexesSupported,
	}
}

// NewLogsBodyTarget returns the domain for the logs body JSON column
// (body_v2 -> body_promoted), with per-path skip index support.
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

// NewTracesAttributesTarget returns the domain for the spans attributes JSON
// column (attributes -> attributes_promoted), with per-path skip index
// support.
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

// NewTargetFromText validates the signal and context words of a promotion
// request and returns their promotion domain.
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

// Targets returns every supported promotion domain.
func Targets() []Target {
	return []Target{
		NewLogsBodyTarget(),
		NewTracesAttributesTarget(),
	}
}

// TargetFor resolves the domain for a (signal, context) pair; ok is false
// when no domain exists for the pair.
func TargetFor(signal telemetrytypes.Signal, context telemetrytypes.FieldContext) (Target, bool) {
	for _, target := range Targets() {
		if target.Entry.Signal.StringValue() == signal.StringValue() &&
			target.Entry.FieldContext.StringValue() == context.StringValue() {
			return target, true
		}
	}
	return Target{}, false
}
