package promenginetest

import (
	"fmt"
	"os"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/prometheus/model/exemplar"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/tsdb"
)

type TestStorage struct {
	*tsdb.DB
	exemplarStorage tsdb.ExemplarStorage
	dir             string
}

// NewStorageWithError returns a new TestStorage for user facing tests, which reports
// errors directly.
func NewStorageWithError(outOfOrderTimeWindow ...int64) (*TestStorage, error) {
	dir, err := os.MkdirTemp("", "test_storage")
	if err != nil {
		return nil, fmt.Errorf("opening test directory: %w", err)
	}

	// Tests just load data for a series sequentially. Thus we
	// need a long appendable window.
	opts := tsdb.DefaultOptions()
	opts.MinBlockDuration = int64(24 * time.Hour / time.Millisecond)
	opts.MaxBlockDuration = int64(24 * time.Hour / time.Millisecond)
	opts.RetentionDuration = 0
	opts.EnableNativeHistograms = true

	// Set OutOfOrderTimeWindow if provided, otherwise use default (0)
	if len(outOfOrderTimeWindow) > 0 {
		opts.OutOfOrderTimeWindow = outOfOrderTimeWindow[0]
	} else {
		opts.OutOfOrderTimeWindow = 0 // Default value is zero
	}

	db, err := tsdb.Open(dir, nil, nil, opts, tsdb.NewDBStats())
	if err != nil {
		return nil, fmt.Errorf("opening test storage: %w", err)
	}
	reg := prometheus.NewRegistry()
	eMetrics := tsdb.NewExemplarMetrics(reg)

	es, err := tsdb.NewCircularExemplarStorage(10, eMetrics)
	if err != nil {
		return nil, fmt.Errorf("opening test exemplar storage: %w", err)
	}

	return &TestStorage{DB: db, exemplarStorage: es, dir: dir}, nil
}

func (s TestStorage) Close() error {
	if err := s.DB.Close(); err != nil {
		return err
	}
	return os.RemoveAll(s.dir)
}

func (s TestStorage) ExemplarAppender() storage.ExemplarAppender {
	return s
}

func (s TestStorage) ExemplarQueryable() storage.ExemplarQueryable {
	return s.exemplarStorage
}

func (s TestStorage) AppendExemplar(ref storage.SeriesRef, l labels.Labels, e exemplar.Exemplar) (storage.SeriesRef, error) {
	return ref, s.exemplarStorage.AddExemplar(l, e)
}
