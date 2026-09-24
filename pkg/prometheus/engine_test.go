package prometheus

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/prometheus/prometheus/storage"
	"github.com/stretchr/testify/require"
)

func TestNoStepSubqueryDoesNotPanic(t *testing.T) {
	engine := NewEngine(slog.New(slog.DiscardHandler), Config{Timeout: time.Minute})
	queryable := storage.QueryableFunc(func(int64, int64) (storage.Querier, error) {
		return storage.NoopQuerier(), nil
	})

	qry, err := engine.NewRangeQuery(
		context.Background(),
		queryable,
		nil,
		"max_over_time(some_metric[5m:])",
		time.Now().Add(-time.Hour),
		time.Now(),
		time.Minute,
	)
	require.NoError(t, err)
	defer qry.Close()

	res := qry.Exec(context.Background())
	require.NoError(t, res.Err)
}
