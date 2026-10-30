package querier

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

// Budget is the admission policy applied to client-supplied query windows at the
// API edge. It is deployment capacity, not well-formedness: a window it rejects
// is still a valid QueryRangeRequest, which is why it is configurable and why
// in-process callers — whose windows are derived, not client-supplied — never
// consult it.
type Budget struct {
	maxTimeRange time.Duration
}

func NewBudget(config Config) Budget {
	return Budget{maxTimeRange: config.MaxTimeRange}
}

// AdmitTimeRange rejects a window wider than the configured maximum. Both bounds
// are epoch milliseconds; a zero maximum disables the limit.
func (budget Budget) AdmitTimeRange(startMS, endMS uint64) error {
	if budget.maxTimeRange <= 0 || endMS <= startMS {
		return nil
	}
	if time.Duration(endMS-startMS)*time.Millisecond > budget.maxTimeRange {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "query time range must not exceed %d days", int64(budget.maxTimeRange/(24*time.Hour)))
	}
	return nil
}
