package promotetypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// Target identifies a promotion domain: the column evolution record written
// per promoted path, the table per-path indexes are created on, and the API
// path rules.
type Target struct {
	Entry              telemetrytypes.EvolutionEntry // evolution row template; FieldName and ReleaseTime are set per write
	DBName             string                        // index DDL database, used only when IndexesSupported
	LocalTableName     string                        // index DDL local table, used only when IndexesSupported
	BaseColumn         string                        // column holding every path; indexes for unpromoted paths are created on it
	RequiredPathPrefix string                        // prefix API paths must carry, stripped before storing; empty for bare names
	IndexesSupported   bool                          // whether per-path skip indexes can be created for this domain
}

func (t Target) PromotedColumn() string { return t.Entry.ColumnName }

func (t Target) BaseColumnPrefix() string { return t.BaseColumn + "." }

func (t Target) PromotedColumnPrefix() string { return t.PromotedColumn() + "." }

// NewTarget creates the Target for a promotion domain.
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
		telemetrytypes.BodyJSONStringSearchPrefix,
		true,
	)
}

// NewTracesAttributesTarget returns the domain for the spans attributes JSON
// column (attributes -> attributes_promoted); promotion only for now.
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

// PathParams carries the raw {telemetry_signal} and {context} path variables
// of the promote paths API.
type PathParams struct {
	Signal  string
	Context string
}

// Validate ensures the path variables are known values naming a supported
// promotion domain.
func (p *PathParams) Validate() error {
	signal, ok := telemetrytypes.SignalFromText(p.Signal)
	if !ok {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid signal: %s", p.Signal)
	}
	context, ok := telemetrytypes.FieldContextFromText(p.Context)
	if !ok {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid context: %s", p.Context)
	}
	if _, ok := TargetFor(signal, context); !ok {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "promotion is not supported for %s %s", signal.StringValue(), context.StringValue())
	}
	return nil
}

// NewTargetFromPath validates the {telemetry_signal} and {context} path
// variables and returns their promotion domain.
func NewTargetFromPath(signal, context string) (Target, error) {
	params := &PathParams{Signal: signal, Context: context}
	if err := params.Validate(); err != nil {
		return Target{}, err
	}
	parsedSignal, _ := telemetrytypes.SignalFromText(params.Signal)
	parsedContext, _ := telemetrytypes.FieldContextFromText(params.Context)
	target, _ := TargetFor(parsedSignal, parsedContext)
	return target, nil
}
