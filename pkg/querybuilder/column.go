package querybuilder

import (
	"context"
	"fmt"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// ColumnSchema is the per-signal surface of the generic coerced-column
// renderer (group-by, order, and aggregation arguments). The three methods
// are leaf questions about one resolved field; the composition — the guarded,
// coerced multiIf with the NULL group — is RenderCoercedColumn and is written
// once. Raw select keeps its per-signal shapes in the mappers: its tails
// differ by storage in more ways than they share.
type ColumnSchema interface {
	// RawRead returns the uncoerced value read of one field. The canonical
	// answer is LogicalValueExpr (the merged read for a family, the member's
	// own read otherwise); logs overrides it for the legacy body path.
	RawRead(ctx context.Context, scope CompileScope, logical *telemetrytypes.LogicalField, dummyValue any) (string, error)

	// Uncoerced reports a field whose native type must survive the stage
	// coercion: a time column would collapse to seconds (traces), and a
	// legacy body read carries its own typing.
	Uncoerced(ctx context.Context, scope CompileScope, logical *telemetrytypes.LogicalField) (bool, error)

	// BareCandidate reports a field that cannot sit inside Nullable/multiIf
	// and renders as its bare read when it is the only candidate (arrays).
	BareCandidate(logical *telemetrytypes.LogicalField) bool
}

// RenderCoercedColumn renders resolved fields as one column expression for
// the coerced stages: every field exists-guarded and coerced to the target
// type in a single multiIf, so rows holding none of the candidates keep the
// NULL group of a single key.
func RenderCoercedColumn(
	ctx context.Context,
	scope CompileScope,
	schema ColumnSchema,
	fm qbtypes.FieldMapper,
	fields []*telemetrytypes.LogicalField,
	target telemetrytypes.FieldDataType,
) (string, error) {
	if len(fields) == 1 && schema.BareCandidate(fields[0]) {
		return schema.RawRead(ctx, scope, fields[0], "")
	}

	var dummyValue any = ""
	if target == telemetrytypes.FieldDataTypeFloat64 {
		dummyValue = 0.0
	}
	stmts := make([]string, 0, len(fields)*2)
	for _, logical := range fields {
		guard, err := LogicalExistsExpr(ctx, scope.OrgID, scope.StartNs, scope.EndNs, fm, logical, true)
		if err != nil {
			return "", err
		}
		read, err := schema.RawRead(ctx, scope, logical, dummyValue)
		if err != nil {
			return "", err
		}
		uncoerced, err := schema.Uncoerced(ctx, scope, logical)
		if err != nil {
			return "", err
		}
		if !uncoerced {
			read, _ = DataTypeCollisionHandledFieldName(logical.Single(), dummyValue, read, qbtypes.FilterOperatorUnknown)
		}
		stmts = append(stmts, guard, read)
	}
	return fmt.Sprintf("multiIf(%s, NULL)", strings.Join(stmts, ", ")), nil
}
