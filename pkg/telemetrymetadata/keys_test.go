package telemetrymetadata

import (
	"context"
	"strings"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// minimalCreateTableStatement only has to parse; materialised attribute
// columns are not needed for these cases.
const minimalCreateTableStatement = "CREATE TABLE t (`timestamp` DateTime64(9) CODEC(DoubleDelta, LZ4), `trace_id` String CODEC(ZSTD(1))) ENGINE = MergeTree ORDER BY (timestamp) SETTINGS index_granularity = 8192"

func expectShowCreateTable(mock cmock.ClickConnMockCommon, tablePattern string) {
	mock.ExpectSelect(`SHOW CREATE TABLE ` + tablePattern).
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "statement", Type: "String"},
		}, [][]any{{minimalCreateTableStatement}}))
}

// expectColumnEvolutionLookup expects the enrichment query for keyCount keys
// (four placeholders per key: signal, context, name and the "__all__" name)
// and answers it with no evolutions.
func expectColumnEvolutionLookup(mock cmock.ClickConnMockCommon, keyCount int) {
	// nil matches any argument
	args := make([]any, 4*keyCount)
	mock.ExpectQuery(`FROM signoz_metadata\.distributed_column_evolution_metadata`).
		WithArgs(args...).
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "signal", Type: "String"},
			{Name: "column_name", Type: "String"},
			{Name: "column_type", Type: "String"},
			{Name: "field_context", Type: "String"},
			{Name: "field_name", Type: "String"},
			{Name: "version", Type: "UInt64"},
			{Name: "release_time", Type: "Float64"},
		}, [][]any{}))
}

func expectEmptySpanAttributeKeys(mock cmock.ClickConnMockCommon, args ...any) {
	mock.ExpectQuery(`FROM signoz_traces\.distributed_span_attributes_keys`).
		WithArgs(args...).
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "tag_key", Type: "String"},
			{Name: "tag_type", Type: "String"},
			{Name: "tag_data_type", Type: "String"},
			{Name: "priority", Type: "UInt8"},
		}, [][]any{}))
}

func countFields(fields map[string]telemetrytypes.TelemetryFieldKey, keep func(telemetrytypes.TelemetryFieldKey) bool) int {
	n := 0
	for _, field := range fields {
		if keep(field) {
			n++
		}
	}
	return n
}

func keyByName(keys map[string][]*telemetrytypes.TelemetryFieldKey, name string) *telemetrytypes.TelemetryFieldKey {
	if len(keys[name]) != 1 {
		return nil
	}
	return keys[name][0]
}

func TestGetKeysSpanContextIsServedByStaticFields(t *testing.T) {
	store, mock := newMockedMetaStore(t)
	expectShowCreateTable(mock, `signoz_traces\.`)
	// the keys table holds no span-context rows, so it is not queried; the
	// result is the two span scope selectors plus every span-context static field
	isSpan := func(f telemetrytypes.TelemetryFieldKey) bool {
		return f.FieldContext == telemetrytypes.FieldContextSpan
	}
	expectColumnEvolutionLookup(mock, 2+countFields(tracestelemetryschema.IntrinsicFields, isSpan)+countFields(tracestelemetryschema.CalculatedFields, isSpan))

	keys, complete, err := store.GetKeys(context.Background(), valuer.UUID{}, &telemetrytypes.FieldKeySelector{
		Signal:            telemetrytypes.SignalTraces,
		FieldContext:      telemetrytypes.FieldContextSpan,
		SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
	})
	require.NoError(t, err)
	assert.True(t, complete)

	for _, name := range []string{"name", "kind_string", "duration_nano", "has_error", "response_status_code", "http_method", "isRoot", "isEntryPoint"} {
		key := keyByName(keys, name)
		require.NotNil(t, key, "expected static key %q", name)
		assert.Equal(t, telemetrytypes.FieldContextSpan, key.FieldContext, name)
		assert.Equal(t, telemetrytypes.SignalTraces, key.Signal, name)
	}
	assert.Equal(t, telemetrytypes.FieldDataTypeBool, keyByName(keys, "has_error").FieldDataType)
	assert.Equal(t, telemetrytypes.FieldDataTypeBool, keyByName(keys, "isRoot").FieldDataType)
	assert.Equal(t, telemetrytypes.FieldDataTypeNumber, keyByName(keys, "duration_nano").FieldDataType)

	// scope intrinsics belong to another context
	assert.Nil(t, keyByName(keys, "scope.name"))

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetKeysLogContextIsServedByStaticFields(t *testing.T) {
	store, mock := newMockedMetaStore(t)
	expectShowCreateTable(mock, `signoz_logs\.`)
	isLog := func(f telemetrytypes.TelemetryFieldKey) bool { return f.FieldContext == telemetrytypes.FieldContextLog }
	expectColumnEvolutionLookup(mock, countFields(logstelemetryschema.IntrinsicFields, isLog))

	keys, complete, err := store.GetKeys(context.Background(), valuer.UUID{}, &telemetrytypes.FieldKeySelector{
		Signal:            telemetrytypes.SignalLogs,
		FieldContext:      telemetrytypes.FieldContextLog,
		SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
	})
	require.NoError(t, err)
	assert.True(t, complete)

	for _, name := range []string{"body", "severity_text", "severity_number", "trace_id"} {
		key := keyByName(keys, name)
		require.NotNil(t, key, "expected static key %q", name)
		assert.Equal(t, telemetrytypes.FieldContextLog, key.FieldContext, name)
	}
	assert.Nil(t, keyByName(keys, "scope_name"))

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetKeysStaticFieldsHonorContextAndCase(t *testing.T) {
	store, mock := newMockedMetaStore(t)
	expectShowCreateTable(mock, `signoz_traces\.`)
	expectEmptySpanAttributeKeys(mock, "%name%", "resource", 1001)
	// nothing matched, so no evolution lookup runs

	// a resource-context search must not surface the span intrinsic `name`
	keys, _, err := store.GetKeys(context.Background(), valuer.UUID{}, &telemetrytypes.FieldKeySelector{
		Signal:            telemetrytypes.SignalTraces,
		FieldContext:      telemetrytypes.FieldContextResource,
		Name:              "name",
		SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
	})
	require.NoError(t, err)
	assert.Empty(t, keys)
	assert.NoError(t, mock.ExpectationsWereMet())

	store, mock = newMockedMetaStore(t)
	expectShowCreateTable(mock, `signoz_traces\.`)
	expectEmptySpanAttributeKeys(mock, `%HTTP\_%`, 1001)
	containsHTTP := func(f telemetrytypes.TelemetryFieldKey) bool { return strings.Contains(f.Name, "http_") }
	expectColumnEvolutionLookup(mock, countFields(tracestelemetryschema.CalculatedFields, containsHTTP))

	// without a context the search is case-insensitive, like ILIKE on stored keys
	keys, _, err = store.GetKeys(context.Background(), valuer.UUID{}, &telemetrytypes.FieldKeySelector{
		Signal:            telemetrytypes.SignalTraces,
		Name:              "HTTP_",
		SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
	})
	require.NoError(t, err)
	assert.NotNil(t, keyByName(keys, "http_method"))
	assert.NotNil(t, keyByName(keys, "http_host"))
	assert.NotNil(t, keyByName(keys, "external_http_url"))
	assert.Nil(t, keyByName(keys, "name"))
	assert.NoError(t, mock.ExpectationsWereMet())
}
