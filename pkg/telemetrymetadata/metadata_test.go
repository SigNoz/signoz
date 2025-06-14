package telemetrymetadata

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

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
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()

	metadata := NewTelemetryMetaStore(
		instrumentationtest.New().ToProviderSettings(),
		mockTelemetryStore,
		telemetrytraces.DBName,
		telemetrytraces.TagAttributesV2TableName,
		telemetrytraces.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.AttributesMetadataTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		DBName,
		AttributesMetadataLocalTableName,
	)

	rows := cmock.NewRows([]cmock.ColumnType{
		{Name: "statement", Type: "String"},
	}, [][]any{{"CREATE TABLE signoz_traces.signoz_index_v3"}})

	mock.
		ExpectSelect("SHOW CREATE TABLE signoz_traces.distributed_signoz_index_v3").
		WillReturnRows(rows)

	query := `SELECT.*`

	mock.ExpectQuery(query).
		WithArgs("%http.method%", telemetrytypes.FieldContextSpan.TagType(), telemetrytypes.FieldDataTypeString.TagDataType(), 10).
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "tag_key", Type: "String"},
			{Name: "tag_type", Type: "String"},
			{Name: "tag_data_type", Type: "String"},
			{Name: "priority", Type: "UInt8"},
		}, [][]any{{"http.method", "tag", "String", 1}, {"http.method", "tag", "String", 1}}))
	keys, err := metadata.GetKeys(context.Background(), &telemetrytypes.FieldKeySelector{
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextSpan,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Name:          "http.method",
		Limit:         10,
	})

	if err != nil {
		t.Fatalf("Failed to get keys: %v", err)
	}

	t.Logf("Keys: %v", keys)
}
