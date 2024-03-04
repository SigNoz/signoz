package bodyparser

import (
	"encoding/hex"
	"testing"
	"time"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/pdatatest/plogtest"
	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
)

func TestJSONLogParser(t *testing.T) {
	t.Parallel()
	d := NewJsonBodyParser()
	tests := []struct {
		name         string
		payLoad      string
		expectedLogs func() plog.Logs
		count        int
		isError      bool
	}{
		{
			name:    "Test 1",
			payLoad: `[{"body":"hello world"}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				return ld
			},
		},
		{
			name:    "Test 2  - wrong structure",
			payLoad: `{"body":"hello world"}`,
			isError: true,
		},
		{
			name:    "Test 3 - proper trace_id and span_id",
			payLoad: `[{"trace_id": "000000000000000045f6f14f5b4cc85a", "span_id": "1010f0feffbfeb95", "body":"hello world"}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				//trace
				traceIdByte, _ := hex.DecodeString("000000000000000045f6f14f5b4cc85a")
				var traceID [16]byte
				copy(traceID[:], traceIdByte)
				log.SetTraceID(pcommon.TraceID(traceID))
				// span
				spanIdByte, _ := hex.DecodeString("1010f0feffbfeb95")
				var spanID [8]byte
				copy(spanID[:], spanIdByte)
				log.SetSpanID(pcommon.SpanID(spanID))
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				return ld
			},
		},
		{
			name:    "Test 3 - incorrect trace_id",
			payLoad: `[{"trace_id": "0000000000045f6f14f5b4cc85a", "body":"hello world"}]`,
			isError: true,
		},
		{
			name:    "Test 3 - incorrect span",
			payLoad: `[{"span_id": "1010f0feffsbfeb95", "body":"hello world"}]`,
			isError: true,
		},
		{
			name:    "Test 4 - attributes",
			payLoad: `[{"attributes": {"str": "hello", "int": 10, "float": 10.0, "boolean": true, "map": {"ab": "cd"}, "slice": ["x1", "x2"]}, "body":"hello world"}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				log.Attributes().EnsureCapacity(6)
				log.Attributes().PutStr("str", "hello")
				log.Attributes().PutDouble("int", 10)
				log.Attributes().PutDouble("float", 10.0)
				log.Attributes().PutBool("boolean", true)
				log.Attributes().PutStr("map", `{"ab":"cd"}`)
				log.Attributes().PutStr("slice", `["x1","x2"]`)
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				return ld
			},
		},
		{
			name:    "Test 5 - resources",
			payLoad: `[{"resources": {"str": "hello", "int": 10, "float": 10.0, "boolean": true, "map": {"ab": "cd"}, "slice": ["x1", "x2"]}, "body":"hello world"}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				rl.Resource().Attributes().EnsureCapacity(6)
				rl.Resource().Attributes().PutStr("str", "hello")
				rl.Resource().Attributes().PutDouble("int", 10)
				rl.Resource().Attributes().PutDouble("float", 10.0)
				rl.Resource().Attributes().PutBool("boolean", true)
				rl.Resource().Attributes().PutStr("map", `{"ab":"cd"}`)
				rl.Resource().Attributes().PutStr("slice", `["x1","x2"]`)
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				return ld
			},
		},
		{
			name:    "Test 6 - severity",
			payLoad: `[{"severity_text": "info", "severity_number": 9, "body":"hello world"}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				log.Attributes().EnsureCapacity(2)
				log.SetSeverityText("info")
				log.SetSeverityNumber(9)
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				return ld
			},
		},
		{
			name:    "Test 7 - flags",
			payLoad: `[{"trace_flags": 1, "body":"hello world"}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				log.Attributes().EnsureCapacity(2)
				log.SetFlags(plog.LogRecordFlags(1))
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				return ld
			},
		},
		{
			name:    "Test 8 - multiple logs",
			payLoad: `[{"body":"hello world"}, {"body":"hello world 2"}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				rl1 := ld.ResourceLogs().AppendEmpty()
				sl1 := rl1.ScopeLogs().AppendEmpty()
				log1 := sl1.LogRecords().AppendEmpty()
				log1.Body().SetStr("hello world 2")
				log1.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				return ld
			},
		},
		{
			name:    "Test 9 - random keys in top level",
			payLoad: `[{"message":"hello world", "attribute1": "val1", "attribute2": 10}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				log.Attributes().EnsureCapacity(2)
				log.Attributes().PutStr("attribute1", "val1")
				log.Attributes().PutDouble("attribute2", 10)
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, 0)))
				return ld
			},
		},
		{
			name:    "Test 10 - timestamp",
			payLoad: `[{"message":"hello world", "timestamp": 1697701904681048000}]`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("hello world")
				log.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, int64(float64(1697701904681048000)))))
				return ld
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, _, err := d.Parse([]byte(tt.payLoad))
			if tt.isError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, plogtest.CompareLogs(tt.expectedLogs(), res, plogtest.IgnoreObservedTimestamp()))
			}
		})
	}
}

var testGetEpochNanoData = []struct {
	Name       string
	Epoch      int64
	Multiplier int64
	Result     int64
}{
	{
		Name:   "Test 1",
		Epoch:  1680712080000,
		Result: 1680712080000000000,
	},
	{
		Name:   "Test 2",
		Epoch:  1680712080000000000,
		Result: 1680712080000000000,
	},
}

func TestGetEpochNano(t *testing.T) {
	for _, tt := range testGetEpochNanoData {
		t.Run(tt.Name, func(t *testing.T) {
			res := getEpochNano(tt.Epoch)
			assert.Equal(t, tt.Result, res)
		})
	}
}
