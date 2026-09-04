package querybuilder

import (
	"context"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// Condition compiles a resolved key into the conditions of one filter term:
// the storage's part in the fingerprint split narrows the fields, and every
// field compiles through the storage's Compile. It returns the per-field
// warnings; the resolution carries its own.
func Condition(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	resolved qbtypes.Resolved,
	dropResourceFields bool,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	if resolved.Skipped {
		return nil, nil, nil
	}

	fields := resolved.Fields
	switch storage.Traits().Split {
	case qbtypes.MainOfSplit:
		// the sub-query cannot know fallback keys, so those stay
		if dropResourceFields && !resolved.FromFallback {
			filtered := make([]*telemetrytypes.LogicalField, 0, len(fields))
			for _, logical := range fields {
				if logical.FieldContext != telemetrytypes.FieldContextResource {
					filtered = append(filtered, logical)
				}
			}
			if len(filtered) == 0 {
				return nil, nil, nil
			}
			fields = filtered
		}
	case qbtypes.FingerprintOfSplit:
		filtered := make([]*telemetrytypes.LogicalField, 0, len(fields))
		for _, logical := range fields {
			if logical.FieldContext == telemetrytypes.FieldContextResource {
				filtered = append(filtered, logical)
			}
		}
		fields = filtered
	}

	conds := make([]string, 0, len(fields))
	var warnings []string
	for _, logical := range fields {
		compiled, err := storage.Compile(ctx, q, logical, operator, value, sb)
		if err != nil {
			return nil, nil, err
		}
		if compiled.Condition != "" {
			conds = append(conds, compiled.Condition)
		}
		warnings = append(warnings, compiled.Warnings...)
	}
	return conds, warnings, nil
}

// RejectsBodyFunction reports the error a storage without body functions
// returns for one, before resolution; the fingerprint side of a split skips
// the term instead, because the main query evaluates it.
func RejectsBodyFunction(traits qbtypes.Traits, operator qbtypes.FilterOperator) (skip bool, err error) {
	if !operator.IsFunctionOperator() && operator != qbtypes.FilterOperatorSearch {
		return false, nil
	}
	if traits.SupportsBodyFunctions {
		return false, nil
	}
	if traits.Split == qbtypes.FingerprintOfSplit {
		return true, nil
	}
	return false, NewFunctionUnsupportedError(operator)
}

// Conditions resolves one key and compiles it: the condition builder for callers
// that do not run the filter visitor. The warnings carry the resolution's
// warnings first.
func Conditions(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	dropResourceFields bool,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	if _, err := RejectsBodyFunction(storage.Traits(), operator); err != nil {
		return nil, nil, err
	}
	resolved, err := Resolve(ctx, q, storage, key, operator, value, fieldKeys)
	if err != nil {
		return nil, nil, err
	}
	conds, warnings, err := Condition(ctx, q, storage, resolved, dropResourceFields, operator, value, sb)
	if err != nil {
		return nil, nil, err
	}
	return conds, append(resolved.Warnings, warnings...), nil
}
