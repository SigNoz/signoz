package clickhouseprometheusv2

import (
	"context"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var samplesCols = []cmock.ColumnType{
	{Name: "fingerprint", Type: "UInt64"},
	{Name: "unix_milli", Type: "Int64"},
	{Name: "value", Type: "Float64"},
	{Name: "flags", Type: "UInt32"},
}

func TestSelectSeriesBudget(t *testing.T) {
	c, store := newTestClient(t)
	c.cfg.MaxFetchedSeries = 1

	store.Mock().ExpectQuery("SELECT fingerprint, any\\(labels\\)").WillReturnRows(cmock.NewRows(seriesCols, [][]any{
		{uint64(1), `{"__name__":"up","instance":"a"}`},
		{uint64(2), `{"__name__":"up","instance":"b"}`},
	}))

	_, err := c.selectSeries(context.Background(), "SELECT fingerprint, any(labels) FROM t", nil)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "budget refusal must be typed invalid input, got %v", err)
}

func TestSelectSamplesBudget(t *testing.T) {
	c, store := newTestClient(t)
	c.cfg.MaxFetchedSamples = 2

	store.Mock().ExpectQuery("SELECT fingerprint, unix_milli").WillReturnRows(cmock.NewRows(samplesCols, [][]any{
		{uint64(1), int64(1_700_000_000_000), 1.0, uint32(0)},
		{uint64(1), int64(1_700_000_060_000), 2.0, uint32(0)},
		{uint64(1), int64(1_700_000_120_000), 3.0, uint32(0)},
	}))

	lookup := &seriesLookup{fingerprints: map[uint64]labels.Labels{1: labels.FromStrings("__name__", "up")}}
	_, err := c.selectSamples(context.Background(), "SELECT fingerprint, unix_milli, value, flags FROM t", nil, lookup)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "budget refusal must be typed invalid input, got %v", err)
}
