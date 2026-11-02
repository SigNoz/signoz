package resolvercore

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var ErrFailedToGetTblStatement = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get tbl statement")

// PriorityForContext orders the contexts a key can resolve to when the same
// name exists in more than one, lowest first.
func PriorityForContext(ctx telemetrytypes.FieldContext) int {
	switch ctx {
	case telemetrytypes.FieldContextLog:
		return 1
	case telemetrytypes.FieldContextResource:
		return 2
	case telemetrytypes.FieldContextScope:
		return 3
	case telemetrytypes.FieldContextAttribute:
		return 4
	default:
		return 5
	}
}
