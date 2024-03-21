// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkaexporter

import (
	"bytes"
	"testing"

	"github.com/Shopify/sarama"
	"github.com/gogo/protobuf/jsonpb"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/translator/jaeger"
)

func TestJaegerMarshaler(t *testing.T) {
	td := ptrace.NewTraces()
	span := td.ResourceSpans().AppendEmpty().ScopeSpans().AppendEmpty().Spans().AppendEmpty()
	span.SetName("foo")
	span.SetStartTimestamp(pcommon.Timestamp(10))
	span.SetEndTimestamp(pcommon.Timestamp(20))
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
	batches, err := jaeger.ProtoFromTraces(td)
	require.NoError(t, err)

	batches[0].Spans[0].Process = batches[0].Process
	jaegerProtoBytes, err := batches[0].Spans[0].Marshal()
	messageKey := []byte(batches[0].Spans[0].TraceID.String())
	require.NoError(t, err)
	require.NotNil(t, jaegerProtoBytes)

	jsonMarshaler := &jsonpb.Marshaler{}
	jsonByteBuffer := new(bytes.Buffer)
	require.NoError(t, jsonMarshaler.Marshal(jsonByteBuffer, batches[0].Spans[0]))

	tests := []struct {
		unmarshaler TracesMarshaler
		encoding    string
		messages    []*sarama.ProducerMessage
	}{
		{
			unmarshaler: jaegerMarshaler{
				marshaler: jaegerProtoSpanMarshaler{},
			},
			encoding: "jaeger_proto",
			messages: []*sarama.ProducerMessage{{Topic: "topic", Value: sarama.ByteEncoder(jaegerProtoBytes), Key: sarama.ByteEncoder(messageKey)}},
		},
		{
			unmarshaler: jaegerMarshaler{
				marshaler: jaegerJSONSpanMarshaler{
					pbMarshaler: &jsonpb.Marshaler{},
				},
			},
			encoding: "jaeger_json",
			messages: []*sarama.ProducerMessage{{Topic: "topic", Value: sarama.ByteEncoder(jsonByteBuffer.Bytes()), Key: sarama.ByteEncoder(messageKey)}},
		},
	}
	for _, test := range tests {
		t.Run(test.encoding, func(t *testing.T) {
			messages, err := test.unmarshaler.Marshal(td, "topic")
			require.NoError(t, err)
			assert.Equal(t, test.messages, messages)
			assert.Equal(t, test.encoding, test.unmarshaler.Encoding())
		})
	}
}
