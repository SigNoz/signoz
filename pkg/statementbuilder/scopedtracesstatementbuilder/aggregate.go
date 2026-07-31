package scopedtracesstatementbuilder

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// This file holds the Aggregate constructors a TraceScope's columns are declared
// with. All SQL rendering goes through the resolvers: columns/values via the
// columnResolver, predicates via the predicateResolver.

// Aggregate renders one column's SQL through the resolvers and lists the attribute
// keys it references so the builder can pre-fetch their metadata. Build one with the
// constructors below; the zero value is not usable.
type Aggregate struct {
	keys   []*telemetrytypes.TelemetryFieldKey
	render func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, preds *predicateResolver) (expr string, err error)
}

// IntrinsicSpanKey references an intrinsic span-index field (timestamp, name, …) by
// its canonical name; the field mapper resolves it to the physical column.
func IntrinsicSpanKey(name string) *telemetrytypes.TelemetryFieldKey {
	return &telemetrytypes.TelemetryFieldKey{
		Name:         name,
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextSpan,
	}
}

// AggFunc is a ClickHouse aggregate function name.
type AggFunc string

const (
	AggSum AggFunc = "sum"
	AggMax AggFunc = "max"
	AggMin AggFunc = "min"
)

// PickDirection selects the earliest (argMin) or latest (argMax) span by ordering.
type PickDirection int

const (
	PickLatest PickDirection = iota
	PickEarliest
)

// CountAll renders count().
func CountAll() Aggregate {
	return Aggregate{render: func(context.Context, valuer.UUID, uint64, uint64, *columnResolver, *predicateResolver) (string, error) {
		return "count()", nil
	}}
}

// FieldReduce renders <fn>(<field>) over a field-mapper-resolved column.
func FieldReduce(fn AggFunc, key *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, _ *predicateResolver) (string, error) {
		f, err := cols.FieldFor(ctx, orgID, startNs, endNs, key)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("%s(%s)", fn, f), nil
	}}
}

// TraceDuration renders the full-trace wall duration: last span end minus first
// span start.
func TraceDuration(tsKey, durationKey *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, _ *predicateResolver) (string, error) {
		ts, err := cols.FieldFor(ctx, orgID, startNs, endNs, tsKey)
		if err != nil {
			return "", err
		}
		dur, err := cols.FieldFor(ctx, orgID, startNs, endNs, durationKey)
		if err != nil {
			return "", err
		}
		tsNano := tracestelemetryschema.UnixNanoExpr(ts)
		return fmt.Sprintf("(max(%s + %s) - min(%s))", tsNano, dur, tsNano), nil
	}}
}

// FieldAnyWhere renders anyIf(<field>, <cond>) — the field value from any span
// matching the condition.
func FieldAnyWhere(valueKey, condKey *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, condValue any) Aggregate {
	return Aggregate{render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, preds *predicateResolver) (string, error) {
		v, err := cols.FieldFor(ctx, orgID, startNs, endNs, valueKey)
		if err != nil {
			return "", err
		}
		cond, err := preds.ConditionFor(ctx, orgID, startNs, endNs, condKey, op, condValue)
		return fmt.Sprintf("anyIf(%s, %s)", v, cond), err
	}}
}

// AnyValue renders any(<value>) over a metadata-resolved attribute value.
func AnyValue(key *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) Aggregate {
	return Aggregate{keys: []*telemetrytypes.TelemetryFieldKey{key}, render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, _ *predicateResolver) (string, error) {
		v, err := cols.ValueFor(ctx, orgID, startNs, endNs, key, dt)
		return fmt.Sprintf("any(%s)", v), err
	}}
}

// CountExists renders countIf(<key> EXISTS) — counts spans carrying key.
func CountExists(key *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: []*telemetrytypes.TelemetryFieldKey{key}, render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, _ *columnResolver, preds *predicateResolver) (string, error) {
		cond, err := preds.ExistsFor(ctx, orgID, startNs, endNs, key)
		return fmt.Sprintf("countIf(%s)", cond), err
	}}
}

// CondCount renders countIf(<cond>) over a condition-builder-resolved predicate.
func CondCount(key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, value any) Aggregate {
	return Aggregate{render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, _ *columnResolver, preds *predicateResolver) (string, error) {
		cond, err := preds.ConditionFor(ctx, orgID, startNs, endNs, key, op, value)
		return fmt.Sprintf("countIf(%s)", cond), err
	}}
}

// Reduce renders <fn>(<value>) over a resolved numeric attribute value.
func Reduce(fn AggFunc, valueKey *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: []*telemetrytypes.TelemetryFieldKey{valueKey}, render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, _ *predicateResolver) (string, error) {
		v, err := cols.ValueFor(ctx, orgID, startNs, endNs, valueKey, telemetrytypes.FieldDataTypeFloat64)
		return fmt.Sprintf("%s(%s)", fn, v), err
	}}
}

// ScopedReduce renders <fn>If(<field>, <gate mask>) over a field-mapper-resolved column.
func ScopedReduce(fn AggFunc, key *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, preds *predicateResolver) (string, error) {
		f, err := cols.FieldFor(ctx, orgID, startNs, endNs, key)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("%sIf(%s, %s)", fn, f, preds.maskExpr), nil
	}}
}

// ScopedToKeyColumn renders <fn>If(<field>, <scopeKey> EXISTS) — a span-index field
// aggregated over spans carrying scopeKey (e.g. max LLM latency).
func ScopedToKeyColumn(fn AggFunc, columnKey, scopeKey *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: []*telemetrytypes.TelemetryFieldKey{scopeKey}, render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, preds *predicateResolver) (string, error) {
		col, err := cols.FieldFor(ctx, orgID, startNs, endNs, columnKey)
		if err != nil {
			return "", err
		}
		cond, err := preds.ExistsFor(ctx, orgID, startNs, endNs, scopeKey)
		return fmt.Sprintf("%sIf(%s, %s)", fn, col, cond), err
	}}
}

// PickBy renders argMinIf/argMaxIf(<value>, <orderField>, <value> EXISTS) — the value
// from the earliest/latest span that carries it.
func PickBy(valueKey *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType, orderKey *telemetrytypes.TelemetryFieldKey, dir PickDirection) Aggregate {
	fn := "argMaxIf"
	if dir == PickEarliest {
		fn = "argMinIf"
	}
	return Aggregate{keys: []*telemetrytypes.TelemetryFieldKey{valueKey}, render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, preds *predicateResolver) (string, error) {
		v, err := cols.ValueFor(ctx, orgID, startNs, endNs, valueKey, dt)
		if err != nil {
			return "", err
		}
		order, err := cols.FieldFor(ctx, orgID, startNs, endNs, orderKey)
		if err != nil {
			return "", err
		}
		cond, err := preds.ExistsFor(ctx, orgID, startNs, endNs, valueKey)
		return fmt.Sprintf("%s(%s, %s, %s)", fn, v, order, cond), err
	}}
}

// UniqCount renders uniqIf(<value>, <value> EXISTS) — distinct count of an attribute.
func UniqCount(valueKey *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) Aggregate {
	return Aggregate{keys: []*telemetrytypes.TelemetryFieldKey{valueKey}, render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, preds *predicateResolver) (string, error) {
		v, err := cols.ValueFor(ctx, orgID, startNs, endNs, valueKey, dt)
		if err != nil {
			return "", err
		}
		cond, err := preds.ExistsFor(ctx, orgID, startNs, endNs, valueKey)
		return fmt.Sprintf("uniqIf(%s, %s)", v, cond), err
	}}
}

// SumOfKeys renders coalesce(sum(<v1>), 0) + coalesce(sum(<v2>), 0) + … over several
// numeric attributes. Coalesced because a key absent from every span sums to NULL and
// NULL + n = NULL — a trace with only output tokens would otherwise total NULL.
func SumOfKeys(dt telemetrytypes.FieldDataType, valueKeys ...*telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: valueKeys, render: func(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, cols *columnResolver, _ *predicateResolver) (string, error) {
		parts := make([]string, 0, len(valueKeys))
		for _, k := range valueKeys {
			v, err := cols.ValueFor(ctx, orgID, startNs, endNs, k, dt)
			if err != nil {
				return "", err
			}
			parts = append(parts, fmt.Sprintf("coalesce(sum(%s), 0)", v))
		}
		return strings.Join(parts, " + "), nil
	}}
}
