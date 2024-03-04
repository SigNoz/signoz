package tests

import (
	"fmt"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	mockhouse "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"golang.org/x/exp/maps"
)

func NewMockClickhouseReader(
	t *testing.T, testDB *sqlx.DB, featureFlags interfaces.FeatureLookup,
) (
	*clickhouseReader.ClickHouseReader, mockhouse.ClickConnMockCommon,
) {
	require.NotNil(t, testDB)

	mockDB, err := mockhouse.NewClickHouseWithQueryMatcher(nil, sqlmock.QueryMatcherRegexp)

	require.Nil(t, err, "could not init mock clickhouse")
	reader := clickhouseReader.NewReaderFromClickhouseConnection(
		mockDB,
		clickhouseReader.NewOptions("", 10, 10, 10*time.Second, ""),
		testDB,
		"",
		featureFlags,
		"",
	)

	return reader, mockDB
}

func addLogsQueryExpectation(
	mockClickhouse mockhouse.ClickConnMockCommon,
	logsToReturn []model.SignozLog,
) {
	cols := []mockhouse.ColumnType{}
	values := [][]any{}

	for _, l := range logsToReturn {

		rowValues := []any{}

		cols = append(cols, mockhouse.ColumnType{Type: "UInt64", Name: "timestamp"})
		rowValues = append(rowValues, l.Timestamp)

		cols = append(cols, mockhouse.ColumnType{Type: "UInt64", Name: "observed_timestamp"})
		rowValues = append(rowValues, l.Timestamp)

		cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "id"})
		rowValues = append(rowValues, l.ID)

		cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "trace_id"})
		rowValues = append(rowValues, l.TraceID)

		cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "span_id"})
		rowValues = append(rowValues, l.SpanID)

		cols = append(cols, mockhouse.ColumnType{Type: "UInt32", Name: "trace_flags"})
		rowValues = append(rowValues, l.TraceFlags)

		cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "severity_text"})
		rowValues = append(rowValues, l.SeverityText)

		cols = append(cols, mockhouse.ColumnType{Type: "UInt8", Name: "severity_number"})
		rowValues = append(rowValues, l.SeverityNumber)

		cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "body"})
		rowValues = append(rowValues, l.Body)

		cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "resources_string_key"})
		rowValues = append(rowValues, maps.Keys(l.Resources_string))
		cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "resources_string_value"})
		rowValues = append(rowValues, maps.Values(l.Resources_string))

		cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_string_key"})
		rowValues = append(rowValues, maps.Keys(l.Attributes_string))
		cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_string_value"})
		rowValues = append(rowValues, maps.Values(l.Attributes_string))

		cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_int64_key"})
		rowValues = append(rowValues, maps.Keys(l.Attributes_int64))
		cols = append(cols, mockhouse.ColumnType{Type: "Array(Int64)", Name: "attributes_int64_value"})
		rowValues = append(rowValues, maps.Values(l.Attributes_int64))

		cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_float64_key"})
		rowValues = append(rowValues, maps.Keys(l.Attributes_float64))
		cols = append(cols, mockhouse.ColumnType{Type: "Array(Float64)", Name: "attributes_float64_value"})
		rowValues = append(rowValues, maps.Values(l.Attributes_float64))

		cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_bool_key"})
		rowValues = append(rowValues, maps.Keys(l.Attributes_bool))
		cols = append(cols, mockhouse.ColumnType{Type: "Array(Bool)", Name: "attributes_bool_value"})
		rowValues = append(rowValues, maps.Values(l.Attributes_bool))

		values = append(values, rowValues)
	}

	rows := mockhouse.NewRows(cols, values)
	mockClickhouse.ExpectQuery(
		"SELECT .*? from signoz_logs.distributed_logs.*",
	).WillReturnRows(rows)
}

func makeTestSignozLog(
	body string,
	attributes map[string]interface{},
) model.SignozLog {

	testLog := model.SignozLog{
		Timestamp:          uint64(time.Now().UnixNano()),
		Body:               body,
		Attributes_bool:    map[string]bool{},
		Attributes_string:  map[string]string{},
		Attributes_int64:   map[string]int64{},
		Attributes_float64: map[string]float64{},
		Resources_string:   map[string]string{},
		SeverityText:       entry.Info.String(),
		SeverityNumber:     uint8(entry.Info),
		SpanID:             uuid.New().String(),
		TraceID:            uuid.New().String(),
	}

	for k, v := range attributes {
		switch v.(type) {
		case bool:
			testLog.Attributes_bool[k] = v.(bool)
		case string:
			testLog.Attributes_string[k] = v.(string)
		case int:
			testLog.Attributes_int64[k] = int64(v.(int))
		case float64:
			testLog.Attributes_float64[k] = v.(float64)
		default:
			panic(fmt.Sprintf("found attribute value of unsupported type %T in test log", v))
		}
	}

	return testLog
}
