// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkaexporter

import (
	"testing"

	"github.com/Shopify/sarama"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/plog"
)

func ptr(i int) *int {
	return &i
}

func Test_RawMarshaler(t *testing.T) {
	tests := []struct {
		name          string
		countExpected *int
		logRecord     func() plog.LogRecord
		marshaled     sarama.ByteEncoder
		errorExpected bool
	}{
		{
			name: "string",
			logRecord: func() plog.LogRecord {
				lr := plog.NewLogRecord()
				lr.Body().SetStr("foo")
				return lr
			},
			errorExpected: false,
			marshaled:     []byte("\"foo\""),
		},
		{
			name: "[]byte",
			logRecord: func() plog.LogRecord {
				lr := plog.NewLogRecord()
				lr.Body().SetEmptyBytes().FromRaw([]byte("foo"))
				return lr
			},
			errorExpected: false,
			marshaled:     []byte("foo"),
		},
		{
			name: "double",
			logRecord: func() plog.LogRecord {
				lr := plog.NewLogRecord()
				lr.Body().SetDouble(float64(1.64))
				return lr
			},
			errorExpected: false,
			marshaled:     []byte("1.64"),
		},
		{
			name: "int",
			logRecord: func() plog.LogRecord {
				lr := plog.NewLogRecord()
				lr.Body().SetInt(int64(456))
				return lr
			},
			errorExpected: false,
			marshaled:     []byte("456"),
		},
		{
			name: "empty",
			logRecord: func() plog.LogRecord {
				lr := plog.NewLogRecord()
				return lr
			},
			countExpected: ptr(0),
			errorExpected: false,
			marshaled:     []byte{},
		},
		{
			name: "bool",
			logRecord: func() plog.LogRecord {
				lr := plog.NewLogRecord()
				lr.Body().SetBool(false)
				return lr
			},
			errorExpected: false,
			marshaled:     []byte("false"),
		},
		{
			name: "slice",
			logRecord: func() plog.LogRecord {
				lr := plog.NewLogRecord()
				slice := lr.Body().SetEmptySlice()
				slice.AppendEmpty().SetStr("foo")
				slice.AppendEmpty().SetStr("bar")
				slice.AppendEmpty().SetBool(false)
				return lr
			},
			errorExpected: false,
			marshaled:     []byte(`["foo","bar",false]`),
		},
		{
			name: "map",
			logRecord: func() plog.LogRecord {
				lr := plog.NewLogRecord()
				m := lr.Body().SetEmptyMap()
				m.PutStr("foo", "foo")
				m.PutStr("bar", "bar")
				m.PutBool("foobar", false)
				return lr
			},
			errorExpected: false,
			marshaled:     []byte(`{"bar":"bar","foo":"foo","foobar":false}`),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			r := newRawMarshaler()
			logs := plog.NewLogs()
			lr := test.logRecord()
			lr.MoveTo(logs.ResourceLogs().AppendEmpty().ScopeLogs().AppendEmpty().LogRecords().AppendEmpty())
			messages, err := r.Marshal(logs, "foo")
			if test.errorExpected {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
			countExpected := 1
			if test.countExpected != nil {
				countExpected = *test.countExpected
			}
			assert.Len(t, messages, countExpected)
			if countExpected > 0 {
				bytes, ok := messages[0].Value.(sarama.ByteEncoder)
				require.True(t, ok)
				assert.Equal(t, test.marshaled, bytes)
			}
		})
	}
}
