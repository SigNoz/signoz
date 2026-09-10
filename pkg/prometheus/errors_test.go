package prometheus

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/prometheus/promql"
	"github.com/stretchr/testify/assert"
)

// expandWrap mirrors the engine's "expanding series: %w" wrapper: a plain
// message-carrying layer with a single Unwrap.
type expandWrap struct{ inner error }

func (w expandWrap) Error() string { return "expanding series: " + w.inner.Error() }
func (w expandWrap) Unwrap() error { return w.inner }

func TestTypedStorageError(t *testing.T) {
	budget := errors.NewInvalidInputf(errors.CodeInvalidInput, "too many series")

	// promql.ErrStorage has no Unwrap method; the walk must pierce it by
	// type and then step through the plain wrapper.
	wrapped := promql.ErrStorage{Err: expandWrap{inner: budget}}
	assert.Equal(t, budget, TypedStorageError(wrapped))

	assert.Nil(t, TypedStorageError(promql.ErrStorage{Err: errors.Newf(errors.TypeInternal, errors.CodeInternal, "connection refused")}))
	assert.Nil(t, TypedStorageError(nil))
}
