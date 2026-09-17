package prometheus

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/prometheus/promql"
)

// TypedStorageError walks an engine execution error chain looking for a
// SigNoz-typed invalid-input error raised by the storage layer (the fetch
// budget refusals). Every wrapper level is stepped through by hand: Ast is a
// bare type cast, not an unwrap — it misses a typed error behind the
// engine's "expanding series: %w" — and promql.ErrStorage has no Unwrap
// method at all, so a plain unwrap loop would stop at it.
func TypedStorageError(execErr error) error {
	for e := execErr; e != nil; {
		if errors.Ast(e, errors.TypeInvalidInput) {
			return e
		}
		if es, ok := e.(promql.ErrStorage); ok {
			e = es.Err
			continue
		}
		u, ok := e.(interface{ Unwrap() error })
		if !ok {
			return nil
		}
		e = u.Unwrap()
	}
	return nil
}
