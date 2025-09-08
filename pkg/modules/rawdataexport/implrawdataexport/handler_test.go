package implrawdataexport

import (
	"net/url"
	"strconv"
	"testing"

	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestGetExportQuerySource(t *testing.T) {
	tests := []struct {
		name           string
		queryParams    url.Values
		expectedSource string
		expectedError  bool
	}{
		{
			name:           "default logs source",
			queryParams:    url.Values{},
			expectedSource: "logs",
			expectedError:  false,
		},
		{
			name:           "explicit logs source",
			queryParams:    url.Values{"source": {"logs"}},
			expectedSource: "logs",
			expectedError:  false,
		},
		{
			name:           "metrics source - not supported",
			queryParams:    url.Values{"source": {"metrics"}},
			expectedSource: "metrics",
			expectedError:  true,
		},
		{
			name:           "traces source - not supported",
			queryParams:    url.Values{"source": {"traces"}},
			expectedSource: "traces",
			expectedError:  true,
		},
		{
			name:           "invalid source",
			queryParams:    url.Values{"source": {"invalid"}},
			expectedSource: "",
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			source, err := getExportQuerySource(tt.queryParams)
			assert.Equal(t, tt.expectedSource, source)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGetExportQueryFormat(t *testing.T) {
	tests := []struct {
		name           string
		queryParams    url.Values
		expectedFormat string
		expectedError  bool
	}{
		{
			name:           "default csv format",
			queryParams:    url.Values{},
			expectedFormat: "csv",
			expectedError:  false,
		},
		{
			name:           "explicit csv format",
			queryParams:    url.Values{"format": {"csv"}},
			expectedFormat: "csv",
			expectedError:  false,
		},
		{
			name:           "jsonl format",
			queryParams:    url.Values{"format": {"jsonl"}},
			expectedFormat: "jsonl",
			expectedError:  false,
		},
		{
			name:           "invalid format",
			queryParams:    url.Values{"format": {"xml"}},
			expectedFormat: "",
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			format, err := getExportQueryFormat(tt.queryParams)
			assert.Equal(t, tt.expectedFormat, format)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGetExportQueryLimit(t *testing.T) {
	tests := []struct {
		name          string
		queryParams   url.Values
		expectedLimit int
		expectedError bool
	}{
		{
			name:          "default limit",
			queryParams:   url.Values{},
			expectedLimit: DefaultExportRowCountLimit,
			expectedError: false,
		},
		{
			name:          "valid limit",
			queryParams:   url.Values{"limit": {"5000"}},
			expectedLimit: 5000,
			expectedError: false,
		},
		{
			name:          "maximum limit",
			queryParams:   url.Values{"limit": {strconv.Itoa(MaxExportRowCountLimit)}},
			expectedLimit: MaxExportRowCountLimit,
			expectedError: false,
		},
		{
			name:          "limit exceeds maximum",
			queryParams:   url.Values{"limit": {"100000"}},
			expectedLimit: 0,
			expectedError: true,
		},
		{
			name:          "invalid limit format",
			queryParams:   url.Values{"limit": {"invalid"}},
			expectedLimit: 0,
			expectedError: true,
		},
		{
			name:          "negative limit",
			queryParams:   url.Values{"limit": {"-100"}},
			expectedLimit: 0,
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limit, err := getExportQueryLimit(tt.queryParams)
			assert.Equal(t, tt.expectedLimit, limit)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGetExportQueryTimeRange(t *testing.T) {
	tests := []struct {
		name              string
		queryParams       url.Values
		expectedStartTime uint64
		expectedEndTime   uint64
		expectedError     bool
	}{
		{
			name: "valid time range",
			queryParams: url.Values{
				"start": {"1640995200"},
				"end":   {"1641081600"},
			},
			expectedStartTime: 1640995200,
			expectedEndTime:   1641081600,
			expectedError:     false,
		},
		{
			name:          "missing start time",
			queryParams:   url.Values{"end": {"1641081600"}},
			expectedError: true,
		},
		{
			name:          "missing end time",
			queryParams:   url.Values{"start": {"1640995200"}},
			expectedError: true,
		},
		{
			name:          "missing both times",
			queryParams:   url.Values{},
			expectedError: true,
		},
		{
			name: "invalid start time format",
			queryParams: url.Values{
				"start": {"invalid"},
				"end":   {"1641081600"},
			},
			expectedError: true,
		},
		{
			name: "invalid end time format",
			queryParams: url.Values{
				"start": {"1640995200"},
				"end":   {"invalid"},
			},
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			startTime, endTime, err := getExportQueryTimeRange(tt.queryParams)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedStartTime, startTime)
				assert.Equal(t, tt.expectedEndTime, endTime)
			}
		})
	}
}

func TestGetExportQueryColumns(t *testing.T) {
	tests := []struct {
		name            string
		queryParams     url.Values
		expectedColumns []telemetrytypes.TelemetryFieldKey
	}{
		{
			name:            "no columns specified",
			queryParams:     url.Values{},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{},
		},
		{
			name: "single column",
			queryParams: url.Values{
				"columns": {"timestamp"},
			},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
			},
		},
		{
			name: "multiple columns",
			queryParams: url.Values{
				"columns": {"timestamp", "message", "level"},
			},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
				{Name: "message"},
				{Name: "level"},
			},
		},
		{
			name: "empty column name (should be skipped)",
			queryParams: url.Values{
				"columns": {"timestamp", "", "level"},
			},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
				{Name: "level"},
			},
		},
		{
			name: "whitespace column name (should be skipped)",
			queryParams: url.Values{
				"columns": {"timestamp", "   ", "level"},
			},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
				{Name: "level"},
			},
		},
		{
			name: "valid column name with data type",
			queryParams: url.Values{
				"columns": {"timestamp", "attribute.user:string", "level"},
			},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
				{Name: "user", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
				{Name: "level"},
			},
		},
		{
			name: "valid column name with dot notation",
			queryParams: url.Values{
				"columns": {"timestamp", "attribute.user.string", "level"},
			},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
				{Name: "user.string", FieldContext: telemetrytypes.FieldContextAttribute},
				{Name: "level"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			columns := getExportQueryColumns(tt.queryParams)
			assert.Equal(t, len(tt.expectedColumns), len(columns))
			for i, expectedCol := range tt.expectedColumns {
				assert.Equal(t, expectedCol, columns[i])
			}
		})
	}
}

func TestGetExportQueryOrderBy(t *testing.T) {
	tests := []struct {
		name          string
		queryParams   url.Values
		expectedOrder []qbtypes.OrderBy
		expectedError bool
	}{
		{
			name:        "no order specified",
			queryParams: url.Values{},
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionDesc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2TimestampColumn,
						},
					},
				},
				{
					Direction: qbtypes.OrderDirectionDesc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2IDColumn,
						},
					},
				},
			},
			expectedError: false,
		},
		{
			name: "single order error, direction not specified",
			queryParams: url.Values{
				"order_by": {"timestamp"},
			},
			expectedOrder: nil,
			expectedError: true,
		},
		{
			name: "single order no error",
			queryParams: url.Values{
				"order_by": {"timestamp:asc"},
			},
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2TimestampColumn,
						},
					},
				},
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2IDColumn,
						},
					},
				},
			},
			expectedError: false,
		},
		{
			name: "multiple orders",
			queryParams: url.Values{
				"order_by": {"timestamp:asc", "body:desc", "id:asc"},
			},
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2TimestampColumn,
						},
					},
				},
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2IDColumn,
						},
					},
				},
			},
			expectedError: false,
		},
		{
			name: "empty order name (should be skipped)",
			queryParams: url.Values{
				"order_by": {"timestamp:asc", "", "id:asc"},
			},
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2TimestampColumn,
						},
					},
				},
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2IDColumn,
						},
					},
				},
			},
			expectedError: false,
		},
		{
			name: "whitespace order name (should be skipped)",
			queryParams: url.Values{
				"order_by": {"timestamp:asc", "   ", "id:asc"},
			},
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2TimestampColumn,
						},
					},
				},
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: telemetrylogs.LogsV2IDColumn,
						},
					},
				},
			},
			expectedError: false,
		},
		{
			name: "invalid order name (should error out)",
			queryParams: url.Values{
				"order_by": {"attributes.user:", "id:asc"},
			},
			expectedOrder: nil,
			expectedError: true,
		},
		{
			name: "valid order name (should be included)",
			queryParams: url.Values{
				"order_by": {"attribute.user:string:desc", "id:asc"},
			},
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionDesc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "user",
							FieldContext:  telemetrytypes.FieldContextAttribute,
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
					},
				},
			},
			expectedError: false,
		},
		{
			name: "valid order name (should be included)",
			queryParams: url.Values{
				"order_by": {"attribute.user.string:desc", "id:asc"},
			},
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionDesc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "user.string",
							FieldContext: telemetrytypes.FieldContextAttribute,
						},
					},
				},
			},
			expectedError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order, err := getExportQueryOrderBy(tt.queryParams)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, len(tt.expectedOrder), len(order))
				for i, expectedOrd := range tt.expectedOrder {
					assert.Equal(t, expectedOrd, order[i])
				}
			}
		})
	}
}

func TestConstructCSVHeaderFromQueryResponse(t *testing.T) {
	data := map[string]any{
		"timestamp": 1640995200,
		"message":   "test message",
		"level":     "INFO",
		"id":        "test-id",
	}

	header := constructCSVHeaderFromQueryResponse(data)

	// Since map iteration order is not guaranteed, check that all expected keys are present
	expectedKeys := []string{"timestamp", "message", "level", "id"}
	assert.Equal(t, len(expectedKeys), len(header))

	for _, key := range expectedKeys {
		assert.Contains(t, header, key)
	}
}

func TestConstructCSVRecordFromQueryResponse(t *testing.T) {
	data := map[string]any{
		"timestamp": 1640995200,
		"message":   "test message",
		"level":     "INFO",
		"id":        "test-id",
	}

	headerToIndexMapping := map[string]int{
		"timestamp": 0,
		"message":   1,
		"level":     2,
		"id":        3,
	}

	record := constructCSVRecordFromQueryResponse(data, headerToIndexMapping)

	assert.Equal(t, 4, len(record))
	assert.Equal(t, "1640995200", record[0])
	assert.Equal(t, "test message", record[1])
	assert.Equal(t, "INFO", record[2])
	assert.Equal(t, "test-id", record[3])
}
