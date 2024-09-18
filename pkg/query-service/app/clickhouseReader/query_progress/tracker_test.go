package queryprogress

import (
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func TestQueryProgressTracking(t *testing.T) {
	require := require.New(t)

	tracker := NewQueryProgressTracker()

	testQueryId := "test-query"

	testProgress := &clickhouse.Progress{}
	err := tracker.ReportQueryProgress(testQueryId, testProgress)
	require.NotNil(err, "shouldn't be able to report query progress before query has been started")
	require.Equal(err.Type(), model.ErrorNotFound)

	ch, unsubscribe, err := tracker.SubscribeToQueryProgress(testQueryId)
	require.NotNil(err, "shouldn't be able to subscribe for progress updates before query has been started")
	require.Equal(err.Type(), model.ErrorNotFound)
	require.Nil(ch)
	require.Nil(unsubscribe)

	reportQueryFinished, err := tracker.ReportQueryStarted(testQueryId)
	require.Nil(err, "should be able to report start of a query to be tracked")

	testProgress1 := &clickhouse.Progress{
		Rows:      10,
		Bytes:     20,
		TotalRows: 100,
		Elapsed:   20 * time.Millisecond,
	}
	err = tracker.ReportQueryProgress(testQueryId, testProgress1)
	require.Nil(err, "should be able to report progress after query has started")

	ch, unsubscribe, err = tracker.SubscribeToQueryProgress(testQueryId)
	require.Nil(err, "should be able to subscribe to query progress updates after query started")
	require.NotNil(ch)
	require.NotNil(unsubscribe)

	expectedProgress := model.QueryProgress{}
	updateQueryProgress(&expectedProgress, testProgress1)
	require.Equal(expectedProgress.ReadRows, testProgress1.Rows)
	select {
	case qp := <-ch:
		require.Equal(qp, expectedProgress)
	default:
		require.Fail("should receive latest query progress state immediately after subscription")
	}
	select {
	case _ = <-ch:
		require.Fail("should have had only one pending update at this point")
	default:
	}

	testProgress2 := &clickhouse.Progress{
		Rows:      20,
		Bytes:     40,
		TotalRows: 100,
		Elapsed:   40 * time.Millisecond,
	}
	err = tracker.ReportQueryProgress(testQueryId, testProgress2)
	require.Nil(err, "should be able to report progress multiple times while query is in progress")

	updateQueryProgress(&expectedProgress, testProgress2)
	select {
	case qp := <-ch:
		require.Equal(qp, expectedProgress)
	default:
		require.Fail("should receive updates whenever new progress updates get reported to tracker")
	}
	select {
	case _ = <-ch:
		require.Fail("should have had only one pending update at this point")
	default:
	}

	reportQueryFinished()
	select {
	case _, isSubscriptionChannelOpen := <-ch:
		require.False(isSubscriptionChannelOpen, "subscription channels should get closed after query finishes")
	default:
		require.Fail("subscription channels should get closed after query finishes")
	}

	err = tracker.ReportQueryProgress(testQueryId, testProgress)
	require.NotNil(err, "shouldn't be able to report query progress after query has finished")
	require.Equal(err.Type(), model.ErrorNotFound)

	ch, unsubscribe, err = tracker.SubscribeToQueryProgress(testQueryId)
	require.NotNil(err, "shouldn't be able to subscribe for progress updates after query has finished")
	require.Equal(err.Type(), model.ErrorNotFound)
	require.Nil(ch)
	require.Nil(unsubscribe)
}
