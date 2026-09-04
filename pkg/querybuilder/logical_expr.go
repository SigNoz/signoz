package querybuilder

import (
	"context"
	"fmt"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// The two functions below are the only place family expressions are built.
// They compose exclusively from the storage's per-field reads (Read, Exists),
// so every member honors its own storage: materialized columns, evolutions,
// and JSON plans ride the member fields, and a signal supports families the
// moment its reads are correct.

// LogicalValueExpr returns the value expression for a resolved logical field:
// the member's own read for a single-member field, and a current-first merge
// across the members' reads for a family. A member with a value map reads
// in the current vocabulary.
func LogicalValueExpr(ctx context.Context, q qbtypes.QueryInfo, storage qbtypes.Storage, logical *telemetrytypes.LogicalField) (string, error) {
	if !logical.IsFamily() {
		return memberRead(ctx, q, storage, logical, 0)
	}

	memberExprs := make([]string, 0, len(logical.Members))
	for i := range logical.Members {
		expr, err := memberRead(ctx, q, storage, logical, i)
		if err != nil {
			return "", err
		}
		memberExprs = append(memberExprs, expr)
	}

	if logical.FieldDataType == telemetrytypes.FieldDataTypeString {
		// The trailing '' keeps single-key semantics for rows without any
		// member: string maps read '' for an absent key, and negative
		// operators must keep including such rows. A NULL tail would drop
		// them: NULL != 'x' evaluates to NULL, and the row falls out of the
		// result.
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
		existence, err := storage.Exists(ctx, q, member, true)
		if err != nil {
			return "", err
		}
		branches = append(branches, existence.Predicate, memberExprs[i])
	}
	return "multiIf(" + strings.Join(branches, ", ") + ", NULL)", nil
}

func memberRead(ctx context.Context, q qbtypes.QueryInfo, storage qbtypes.Storage, logical *telemetrytypes.LogicalField, i int) (string, error) {
	expr, err := storage.Read(ctx, q, logical.Members[i])
	if err != nil {
		return "", err
	}
	if i < len(logical.ValueMaps) && logical.ValueMaps[i] != nil {
		expr = TransformRead(expr, logical.ValueMaps[i])
	}
	return expr, nil
}

// TransformRead brings a member's read into the current vocabulary: a stored
// value maps to its current value, any other value reads as it is.
func TransformRead(read string, valueMap *telemetrytypes.ValueMap) string {
	return fmt.Sprintf("transform(%s, %s, %s, %s)", read, clickHouseStringArray(valueMap.Stored), clickHouseStringArray(valueMap.Current), read)
}

func clickHouseStringArray(values []string) string {
	items := make([]string, 0, len(values))
	for _, value := range values {
		items = append(items, ClickHouseStringLiteral(value))
	}
	return "[" + strings.Join(items, ", ") + "]"
}

// LogicalExistsExpr returns the existence predicate for a resolved logical
// field: the member's own predicate for a single-member field, presence of
// any member for a family. A family reads through its merge, so its absence
// semantics are the merge's tail, not the members' own.
func LogicalExistsExpr(ctx context.Context, q qbtypes.QueryInfo, storage qbtypes.Storage, logical *telemetrytypes.LogicalField, exists bool) (qbtypes.Existence, error) {
	if !logical.IsFamily() {
		return storage.Exists(ctx, q, logical.Single(), exists)
	}

	guards := make([]string, 0, len(logical.Members))
	for _, member := range logical.Members {
		existence, err := storage.Exists(ctx, q, member, true)
		if err != nil {
			return qbtypes.Existence{}, err
		}
		guards = append(guards, existence.Predicate)
	}
	combined := "(" + strings.Join(guards, " OR ") + ")"
	if !exists {
		combined = "NOT " + combined
	}
	return qbtypes.Existence{Predicate: combined, WhenAbsent: familyAbsence(logical)}, nil
}

// familyAbsence is what the merged read yields for a row without any
// member: the sentinel tail of a string family, NULL for the others.
func familyAbsence(logical *telemetrytypes.LogicalField) qbtypes.Absent {
	if logical.FieldDataType == telemetrytypes.FieldDataTypeString {
		return qbtypes.AbsentIsSentinel
	}
	return qbtypes.AbsentIsNull
}
