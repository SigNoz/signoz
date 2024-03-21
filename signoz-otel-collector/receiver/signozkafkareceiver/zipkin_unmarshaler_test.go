// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver

import (
	"context"
	"testing"

	"github.com/apache/thrift/lib/go/thrift"
	"github.com/jaegertracing/jaeger/thrift-gen/zipkincore"
	"github.com/openzipkin/zipkin-go/proto/zipkin_proto3"
	zipkinreporter "github.com/openzipkin/zipkin-go/reporter"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	conventions "go.opentelemetry.io/collector/semconv/v1.6.1"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/translator/zipkin/zipkinv2"
)

var v2FromTranslator zipkinv2.FromTranslator

func TestUnmarshalZipkin(t *testing.T) {
	td := ptrace.NewTraces()
	rs := td.ResourceSpans().AppendEmpty()
	rs.Resource().Attributes().PutStr(conventions.AttributeServiceName, "my_service")
	span := rs.ScopeSpans().AppendEmpty().Spans().AppendEmpty()
	span.SetName("foo")
	span.SetStartTimestamp(pcommon.Timestamp(1597759000))
	span.SetEndTimestamp(pcommon.Timestamp(1597769000))
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
	span.SetParentSpanID([8]byte{0, 0, 0, 0, 0, 0, 0, 0})
	spans, err := v2FromTranslator.FromTraces(td)
	require.NoError(t, err)

	serializer := zipkinreporter.JSONSerializer{}
	jsonBytes, err := serializer.Serialize(spans)
	require.NoError(t, err)

	tSpan := &zipkincore.Span{Name: "foo"}
	thriftTransport := thrift.NewTMemoryBuffer()
	protocolTransport := thrift.NewTBinaryProtocolConf(thriftTransport, nil)
	require.NoError(t, protocolTransport.WriteListBegin(context.Background(), thrift.STRUCT, 1))
	err = tSpan.Write(context.Background(), protocolTransport)
	require.NoError(t, err)
	require.NoError(t, protocolTransport.WriteListEnd(context.Background()))

	tdThrift, err := newZipkinThriftUnmarshaler().Unmarshal(thriftTransport.Buffer.Bytes())
	require.NoError(t, err)

	protoBytes, err := new(zipkin_proto3.SpanSerializer).Serialize(spans)
	require.NoError(t, err)

	tests := []struct {
		unmarshaler TracesUnmarshaler
		encoding    string
		bytes       []byte
		expected    ptrace.Traces
	}{
		{
			unmarshaler: newZipkinProtobufUnmarshaler(),
			encoding:    "zipkin_proto",
			bytes:       protoBytes,
			expected:    td,
		},
		{
			unmarshaler: newZipkinJSONUnmarshaler(),
			encoding:    "zipkin_json",
			bytes:       jsonBytes,
			expected:    td,
		},
		{
			unmarshaler: newZipkinThriftUnmarshaler(),
			encoding:    "zipkin_thrift",
			bytes:       thriftTransport.Buffer.Bytes(),
			expected:    tdThrift,
		},
	}
	for _, test := range tests {
		t.Run(test.encoding, func(t *testing.T) {
			traces, err := test.unmarshaler.Unmarshal(test.bytes)
			require.NoError(t, err)
			assert.Equal(t, test.expected, traces)
			assert.Equal(t, test.encoding, test.unmarshaler.Encoding())
		})
	}
}

func TestUnmarshalZipkinThrift_error(t *testing.T) {
	p := newZipkinThriftUnmarshaler()
	_, err := p.Unmarshal([]byte("+$%"))
	assert.Error(t, err)
}

func TestUnmarshalZipkinJSON_error(t *testing.T) {
	p := newZipkinJSONUnmarshaler()
	_, err := p.Unmarshal([]byte("+$%"))
	assert.Error(t, err)
}

func TestUnmarshalZipkinProto_error(t *testing.T) {
	p := newZipkinProtobufUnmarshaler()
	_, err := p.Unmarshal([]byte("+$%"))
	assert.Error(t, err)
}
