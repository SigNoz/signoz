package querybuilder

import (
	"context"
	"fmt"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// LogicalRead is the only place family expressions are built. It composes
// exclusively from the storage's per-key Read, so every member honors its
// own storage: materialized columns, evolutions, and JSON plans ride the
// member keys, and a signal supports families the moment its reads are
// correct.
//
// A single-member field reads through its member. A family merges the member
// reads current-first, tests presence as any member present (and absence as
// none present), and reads for a row without any member what the merge's tail
// reads: the sentinel for a
// string family, NULL for the others. A member with a value map reads in the
// current vocabulary.
func LogicalRead(ctx context.Context, q qbtypes.QueryInfo, storage qbtypes.Storage, logical *telemetrytypes.LogicalField) (qbtypes.Read, error) {
	if !logical.IsFamily() {
		return memberRead(ctx, q, storage, logical, 0)
	}
	reads := make([]qbtypes.Read, 0, len(logical.Members))
	for i := range logical.Members {
		read, err := memberRead(ctx, q, storage, logical, i)
		if err != nil {
			return qbtypes.Read{}, err
		}
		reads = append(reads, read)
	}

	merged := qbtypes.Read{WhenAbsent: familyAbsence(logical)}
	guards := make([]string, 0, len(reads))
	for _, read := range reads {
		guards = append(guards, read.Presence)
		merged.KeepType = merged.KeepType || read.KeepType
	}
	merged.Presence = "(" + strings.Join(guards, " OR ") + ")"
	merged.Absence = "NOT " + merged.Presence
	merged.FilterOnly = true
	for _, read := range reads {
		merged.FilterOnly = merged.FilterOnly && read.FilterOnly
	}

	if logical.FieldDataType == telemetrytypes.FieldDataTypeString {
		// The trailing '' keeps single-key semantics for rows without any
		// member: string maps read '' for an absent key, and negative
		// operators must keep including such rows. A NULL tail would drop
		// them: NULL != 'x' evaluates to NULL, and the row falls out of the
		// result.
		values := make([]string, 0, len(reads))
		for _, read := range reads {
			values = append(values, fmt.Sprintf("NULLIF(%s, '')", read.SQL))
		}
		merged.SQL = "COALESCE(" + strings.Join(values, ", ") + ", '')"
		return merged, nil
	}
	// Numeric and boolean maps return zero for an absent key. If a family of
	// either type is enabled, this tail must become zero too.
	branches := make([]string, 0, len(reads)*2)
	for _, read := range reads {
		branches = append(branches, read.Presence, read.SQL)
	}
	merged.SQL = "multiIf(" + strings.Join(branches, ", ") + ", NULL)"
	return merged, nil
}

func memberRead(ctx context.Context, q qbtypes.QueryInfo, storage qbtypes.Storage, logical *telemetrytypes.LogicalField, i int) (qbtypes.Read, error) {
	read, err := storage.Read(ctx, q, logical.Members[i])
	if err != nil {
		return qbtypes.Read{}, err
	}
	if i < len(logical.ValueMaps) && logical.ValueMaps[i] != nil {
		read.SQL = TransformRead(read.SQL, logical.ValueMaps[i])
	}
	return read, nil
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

// familyAbsence is what the merged read yields for a row without any
// member: the sentinel tail of a string family, NULL for the others.
func familyAbsence(logical *telemetrytypes.LogicalField) qbtypes.Absent {
	if logical.FieldDataType == telemetrytypes.FieldDataTypeString {
		return qbtypes.AbsentIsSentinel
	}
	return qbtypes.AbsentIsNull
}
