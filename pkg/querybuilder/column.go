package querybuilder

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// Column renders a resolved key as one bare column expression; the caller
// aliases. Group by, order by, and aggregation cast every candidate to the
// target type; a select field keeps the native read. The guard follows Absent: a sentinel
// read sits behind its presence test, so an absent row yields NULL; a column
// every row has reads bare and ends the candidate list; a NULL-reading field
// takes a presence branch only beside other candidates.
func Column(
	ctx context.Context,
	q qbtypes.QueryInfo,
	storage qbtypes.Storage,
	resolved qbtypes.Resolved,
	target telemetrytypes.FieldDataType,
) (string, error) {
	if len(resolved.Fields) == 0 {
		return "", NewKeyNotFoundError(resolved.Key.Name, nil)
	}

	var targetValue any = ""
	if target == telemetrytypes.FieldDataTypeFloat64 {
		targetValue = 0.0
	}
	coerced := target != telemetrytypes.FieldDataTypeUnspecified
	several := len(resolved.Fields) > 1

	branches := make([]string, 0, len(resolved.Fields)*2)
	filterOnly := false
	for _, logical := range resolved.Fields {
		read, err := LogicalRead(ctx, q, storage, logical)
		if err != nil {
			return "", err
		}
		if read.FilterOnly {
			filterOnly = true
			continue
		}
		// an array cannot sit inside Nullable or multiIf
		if !several && bareRead(logical) {
			return read.SQL, nil
		}
		expr := read.SQL
		if coerced && !read.KeepType {
			expr, _ = DataTypeCollisionHandledFieldName(logical.Single(), targetValue, expr, qbtypes.FilterOperatorUnknown)
		}
		// several native shapes share one multiIf, so every branch reads as text
		branch := expr
		if !coerced && several {
			branch, _ = DataTypeCollisionHandledFieldName(logical.Single(), "", expr, qbtypes.FilterOperatorUnknown)
		}
		switch read.WhenAbsent {
		case qbtypes.AlwaysPresent, qbtypes.AbsentIsValue:
			if len(branches) == 0 {
				return expr, nil
			}
			return fmt.Sprintf("multiIf(%s, %s)", strings.Join(branches, ", "), branch), nil
		case qbtypes.AbsentIsNull:
			if !several {
				return expr, nil
			}
			branches = append(branches, read.Presence, branch)
		default:
			branches = append(branches, read.Presence, branch)
		}
	}
	if len(branches) == 0 {
		if filterOnly {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "`%s` can be filtered but not selected or grouped", resolved.Key.Name)
		}
		return "", NewKeyNotFoundError(resolved.Key.Name, nil)
	}
	return fmt.Sprintf("multiIf(%s, NULL)", strings.Join(branches, ", ")), nil
}

func bareRead(logical *telemetrytypes.LogicalField) bool {
	key := logical.Single()
	return strings.Contains(key.Name, telemetrytypes.ArraySep) ||
		strings.Contains(key.Name, telemetrytypes.ArrayAnyIndex) ||
		key.FieldDataType.IsArray()
}
