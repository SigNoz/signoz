package prometheus

import (
	"fmt"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/prometheus/promql"
	"github.com/stretchr/testify/assert"
)

func TestTypedStorageError(t *testing.T) {
	budget := errors.NewInvalidInputf(errors.CodeInvalidInput, "too many series")

	// The engine wraps a storage error as expanding series: %w inside
	// promql.ErrStorage, which has no Unwrap method.
	wrapped := promql.ErrStorage{Err: fmt.Errorf("expanding series: %w", budget)}
	assert.Equal(t, budget, TypedStorageError(wrapped))

	assert.Nil(t, TypedStorageError(promql.ErrStorage{Err: fmt.Errorf("connection refused")}))
	assert.Nil(t, TypedStorageError(nil))
}
