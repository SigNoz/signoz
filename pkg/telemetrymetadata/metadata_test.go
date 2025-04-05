package telemetrymetadata

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	baseconst "github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/types"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

type MockTelemetryStore struct {
	conn driver.Conn
}

func (m *MockTelemetryStore) ClickhouseDB() clickhouse.Conn {
	return m.conn
}

type regexMatcher struct {
}

func (m *regexMatcher) Match(expectedSQL, actualSQL string) error {
	re, err := regexp.Compile(expectedSQL)
	if err != nil {
		return err
	}
	if !re.MatchString(actualSQL) {
		return fmt.Errorf("expected query to contain %s, got %s", expectedSQL, actualSQL)
	}
	return nil
}

func TestGetKeys(t *testing.T) {
	mockTelemetryStore := &MockTelemetryStore{}
	mock, err := cmock.NewClickHouseWithQueryMatcher(nil, &regexMatcher{})
	if err != nil {
		t.Fatalf("Failed to create mock ClickHouse: %v", err)
	}
	mockTelemetryStore.conn = mock

	metadata, err := NewTelemetryMetaStore(
		mockTelemetryStore,
		baseconst.SIGNOZ_TRACE_DBNAME,
		baseconst.SIGNOZ_TAG_ATTRIBUTES_V2_TABLENAME,
		baseconst.SIGNOZ_SPAN_INDEX_V3,
		baseconst.SIGNOZ_METRIC_DBNAME,
		baseconst.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME,
		baseconst.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME,
		baseconst.SIGNOZ_LOG_DBNAME,
		baseconst.SIGNOZ_LOG_V2_TABLENAME,
		baseconst.SIGNOZ_TAG_ATTRIBUTES_V2_TABLENAME,
		baseconst.SIGNOZ_METADATA_DBNAME,
		baseconst.SIGNOZ_ATTRIBUTES_METADATA_LOCAL_TABLENAME,
	)

	if err != nil {
		t.Fatalf("Failed to create telemetry metadata store: %v", err)
	}

	rows := cmock.NewRows([]cmock.ColumnType{
		{Name: "statement", Type: "String"},
	}, [][]any{{"CREATE TABLE signoz_traces.signoz_index_v3"}})

	mock.
		ExpectSelect("SHOW CREATE TABLE signoz_traces.distributed_signoz_index_v3").
		WillReturnRows(rows)

	query := `SELECT.*`

	mock.ExpectQuery(query).
		WithArgs("%http.method%", types.FieldContextToTagType(types.FieldContextSpan), types.FieldDataTypeToTagDataType(types.FieldDataTypeString), 10).
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "tag_key", Type: "String"},
			{Name: "tag_type", Type: "String"},
			{Name: "tag_data_type", Type: "String"},
			{Name: "priority", Type: "UInt8"},
		}, [][]any{{"http.method", "tag", "String", 1}, {"http.method", "tag", "String", 1}}))
	keys, err := metadata.GetKeys(context.Background(), types.FieldKeySelector{
		Signal:        types.SignalTraces,
		FieldContext:  types.FieldContextSpan,
		FieldDataType: types.FieldDataTypeString,
		Name:          "http.method",
		Limit:         10,
	})

	if err != nil {
		t.Fatalf("Failed to get keys: %v", err)
	}

	t.Logf("Keys: %v", keys)
}
