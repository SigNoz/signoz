package querybuilder

import (
	"context"
	"fmt"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// The two functions below are the only place family expressions are built.
// They compose exclusively from the mapper's per-key primitives (FieldFor,
// ExistsFor), so every member honors its own storage: materialized columns,
// evolutions, and JSON plans ride the member keys, and a signal supports
// families the moment its primitives are correct.

// LogicalValueExpr returns the value expression for a resolved logical field:
// the member's own expression for a single-member field, and a current-first
// merge across the members' expressions for a family.
func LogicalValueExpr(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	fm qbtypes.FieldMapper,
	logical *telemetrytypes.LogicalField,
) (string, error) {
	if !logical.IsFamily() {
		return fm.FieldFor(ctx, orgID, tsStart, tsEnd, logical.Single())
	}

	memberExprs := make([]string, 0, len(logical.Members))
	for _, member := range logical.Members {
		expr, err := fm.FieldFor(ctx, orgID, tsStart, tsEnd, member)
		if err != nil {
			return "", err
		}
		memberExprs = append(memberExprs, expr)
	}

	if logical.FieldDataType == telemetrytypes.FieldDataTypeString {
		// The trailing '' keeps single-key semantics for rows without any
		// member: string maps read '' for an absent key, and negative
		// operators must keep including such rows (see AddDefaultExistsFilter).
		// A NULL tail would drop them: NULL != 'x' evaluates to NULL, and the
		// row falls out of the result.
		values := make([]string, 0, len(memberExprs))
		for _, expr := range memberExprs {
			values = append(values, fmt.Sprintf("NULLIF(%s, '')", expr))
		}
		return "COALESCE(" + strings.Join(values, ", ") + ", '')", nil
	}

	// Numeric and boolean maps return zero for an absent key. If a family of
	// either type is enabled, this tail must become zero too.
	branches := make([]string, 0, len(logical.Members)*2)
	for i, member := range logical.Members {
		guard, err := fm.ExistsFor(ctx, orgID, tsStart, tsEnd, member, true)
		if err != nil {
			return "", err
		}
		branches = append(branches, guard, memberExprs[i])
	}
	return "multiIf(" + strings.Join(branches, ", ") + ", NULL)", nil
}

// LogicalExistsExpr returns the existence predicate for a resolved logical
// field: the member's own predicate for a single-member field, presence of
// any member for a family.
func LogicalExistsExpr(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	fm qbtypes.FieldMapper,
	logical *telemetrytypes.LogicalField,
	exists bool,
) (string, error) {
	if !logical.IsFamily() {
		return fm.ExistsFor(ctx, orgID, tsStart, tsEnd, logical.Single(), exists)
	}

	guards := make([]string, 0, len(logical.Members))
	for _, member := range logical.Members {
		guard, err := fm.ExistsFor(ctx, orgID, tsStart, tsEnd, member, true)
		if err != nil {
			return "", err
		}
		guards = append(guards, guard)
	}
	combined := "(" + strings.Join(guards, " OR ") + ")"
	if exists {
		return combined, nil
	}
	return "NOT " + combined, nil
}
