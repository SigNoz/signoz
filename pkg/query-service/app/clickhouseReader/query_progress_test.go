package clickhouseReader

import (
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func TestQueryProgress(t *testing.T) {
	require := require.New(t)

	tracker := NewQueryProgressTracker()

	testQueryId := "test-query"

	testProgress := &clickhouse.Progress{}
	err := tracker.ReportQueryProgress(testQueryId, testProgress)
	require.NotNil(err, "shouldn't be able to report query progress before query has been started")
	require.Equal(err.Type(), model.ErrorNotFound)

	ch, err := tracker.SubscribeToQueryProgress(testQueryId)
	require.NotNil(err, "shouldn't be able to subscribe for progress updates before query has been started")
	require.Equal(err.Type(), model.ErrorNotFound)
	require.Nil(ch)

	postQueryCleanup, err := tracker.ReportQueryStarted(testQueryId)
	require.Nil(err, "should be able to report start of a query to be tracked")

	testProgress1 := &clickhouse.Progress{
		Rows:      10,
		Bytes:     20,
		TotalRows: 100,
		Elapsed:   20 * time.Millisecond,
	}
	err = tracker.ReportQueryProgress(testQueryId, testProgress1)
	require.Nil(err, "should be able to report progress after query has started")

	// should be able to subscribe to query progress updates

	// should receive latest state immediately after subscription

	// should receive updates whenever new progress updates get reported to tracker

	// subscription channels should get closed after query finishes
	postQueryCleanup()

	err = tracker.ReportQueryProgress(testQueryId, testProgress)
	require.NotNil(err, "shouldn't be able to report query progress after query has finished")
	require.Equal(err.Type(), model.ErrorNotFound)

	ch, err = tracker.SubscribeToQueryProgress(testQueryId)
	require.NotNil(err, "shouldn't be able to subscribe for progress updates after query has finished")
	require.Equal(err.Type(), model.ErrorNotFound)
	require.Nil(ch)
}
