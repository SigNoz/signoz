// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkaexporter

import (
	"context"
	"fmt"
	"testing"

	"github.com/Shopify/sarama"
	"github.com/Shopify/sarama/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/client"
	"go.opentelemetry.io/collector/config/configtls"
	"go.opentelemetry.io/collector/exporter/exportertest"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/zap"

	"github.com/SigNoz/signoz-otel-collector/internal/coreinternal/testdata"
)

func TestNewExporter_err_version(t *testing.T) {
	c := Config{ProtocolVersion: "0.0.0", Encoding: defaultEncoding}
	texp, err := newTracesExporter(c, exportertest.NewNopCreateSettings(), tracesMarshalers())
	assert.Error(t, err)
	assert.Nil(t, texp)
}

func TestNewExporter_err_encoding(t *testing.T) {
	c := Config{Encoding: "foo"}
	texp, err := newTracesExporter(c, exportertest.NewNopCreateSettings(), tracesMarshalers())
	assert.EqualError(t, err, errUnrecognizedEncoding.Error())
	assert.Nil(t, texp)
}

func TestNewMetricsExporter_err_version(t *testing.T) {
	c := Config{ProtocolVersion: "0.0.0", Encoding: defaultEncoding}
	mexp, err := newMetricsExporter(c, exportertest.NewNopCreateSettings(), metricsMarshalers())
	assert.Error(t, err)
	assert.Nil(t, mexp)
}

func TestNewMetricsExporter_err_encoding(t *testing.T) {
	c := Config{Encoding: "bar"}
	mexp, err := newMetricsExporter(c, exportertest.NewNopCreateSettings(), metricsMarshalers())
	assert.EqualError(t, err, errUnrecognizedEncoding.Error())
	assert.Nil(t, mexp)
}

func TestNewMetricsExporter_err_traces_encoding(t *testing.T) {
	c := Config{Encoding: "jaeger_proto"}
	mexp, err := newMetricsExporter(c, exportertest.NewNopCreateSettings(), metricsMarshalers())
	assert.EqualError(t, err, errUnrecognizedEncoding.Error())
	assert.Nil(t, mexp)
}

func TestNewLogsExporter_err_version(t *testing.T) {
	c := Config{ProtocolVersion: "0.0.0", Encoding: defaultEncoding}
	mexp, err := newLogsExporter(c, exportertest.NewNopCreateSettings(), logsMarshalers())
	assert.Error(t, err)
	assert.Nil(t, mexp)
}

func TestNewLogsExporter_err_encoding(t *testing.T) {
	c := Config{Encoding: "bar"}
	mexp, err := newLogsExporter(c, exportertest.NewNopCreateSettings(), logsMarshalers())
	assert.EqualError(t, err, errUnrecognizedEncoding.Error())
	assert.Nil(t, mexp)
}

func TestNewLogsExporter_err_traces_encoding(t *testing.T) {
	c := Config{Encoding: "jaeger_proto"}
	mexp, err := newLogsExporter(c, exportertest.NewNopCreateSettings(), logsMarshalers())
	assert.EqualError(t, err, errUnrecognizedEncoding.Error())
	assert.Nil(t, mexp)
}

func TestNewExporter_err_auth_type(t *testing.T) {
	c := Config{
		ProtocolVersion: "2.0.0",
		Authentication: Authentication{
			TLS: &configtls.TLSClientSetting{
				TLSSetting: configtls.TLSSetting{
					CAFile: "/doesnotexist",
				},
			},
		},
		Encoding: defaultEncoding,
		Metadata: Metadata{
			Full: false,
		},
		Producer: Producer{
			Compression: "none",
		},
	}
	texp, err := newTracesExporter(c, exportertest.NewNopCreateSettings(), tracesMarshalers())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to load TLS config")
	assert.Nil(t, texp)
	mexp, err := newMetricsExporter(c, exportertest.NewNopCreateSettings(), metricsMarshalers())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to load TLS config")
	assert.Nil(t, mexp)
	lexp, err := newLogsExporter(c, exportertest.NewNopCreateSettings(), logsMarshalers())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to load TLS config")
	assert.Nil(t, lexp)

}

func TestNewExporter_err_compression(t *testing.T) {
	c := Config{
		Encoding: defaultEncoding,
		Producer: Producer{
			Compression: "idk",
		},
	}
	texp, err := newTracesExporter(c, exportertest.NewNopCreateSettings(), tracesMarshalers())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "producer.compression should be one of 'none', 'gzip', 'snappy', 'lz4', or 'zstd'. configured value idk")
	assert.Nil(t, texp)
}

func TestTracesPusher(t *testing.T) {
	c := sarama.NewConfig()
	producer := mocks.NewSyncProducer(t, c)
	producer.ExpectSendMessageAndSucceed()

	p := kafkaTracesProducer{
		producer:  producer,
		marshaler: newPdataTracesMarshaler(&ptrace.ProtoMarshaler{}, defaultEncoding),
	}
	t.Cleanup(func() {
		require.NoError(t, p.Close(context.Background()))
	})
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.tracesPusher(ctx, testdata.GenerateTracesTwoSpansSameResource())
	require.NoError(t, err)
}

func TestTracesPusher_err(t *testing.T) {
	c := sarama.NewConfig()
	producer := mocks.NewSyncProducer(t, c)
	expErr := fmt.Errorf("failed to send")
	producer.ExpectSendMessageAndFail(expErr)

	p := kafkaTracesProducer{
		producer:  producer,
		marshaler: newPdataTracesMarshaler(&ptrace.ProtoMarshaler{}, defaultEncoding),
		logger:    zap.NewNop(),
	}
	t.Cleanup(func() {
		require.NoError(t, p.Close(context.Background()))
	})
	td := testdata.GenerateTracesTwoSpansSameResource()
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.tracesPusher(ctx, td)
	assert.EqualError(t, err, expErr.Error())
}

func TestTracesPusher_marshal_error(t *testing.T) {
	expErr := fmt.Errorf("failed to marshal")
	p := kafkaTracesProducer{
		marshaler: &tracesErrorMarshaler{err: expErr},
		logger:    zap.NewNop(),
	}
	td := testdata.GenerateTracesTwoSpansSameResource()
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.tracesPusher(ctx, td)
	require.Error(t, err)
	assert.Contains(t, err.Error(), expErr.Error())
}

func TestMetricsDataPusher(t *testing.T) {
	c := sarama.NewConfig()
	producer := mocks.NewSyncProducer(t, c)
	producer.ExpectSendMessageAndSucceed()

	p := kafkaMetricsProducer{
		producer:  producer,
		marshaler: newPdataMetricsMarshaler(&pmetric.ProtoMarshaler{}, defaultEncoding),
	}
	t.Cleanup(func() {
		require.NoError(t, p.Close(context.Background()))
	})
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.metricsDataPusher(ctx, testdata.GenerateMetricsTwoMetrics())
	require.NoError(t, err)
}

func TestMetricsDataPusher_err(t *testing.T) {
	c := sarama.NewConfig()
	producer := mocks.NewSyncProducer(t, c)
	expErr := fmt.Errorf("failed to send")
	producer.ExpectSendMessageAndFail(expErr)

	p := kafkaMetricsProducer{
		producer:  producer,
		marshaler: newPdataMetricsMarshaler(&pmetric.ProtoMarshaler{}, defaultEncoding),
		logger:    zap.NewNop(),
	}
	t.Cleanup(func() {
		require.NoError(t, p.Close(context.Background()))
	})
	md := testdata.GenerateMetricsTwoMetrics()
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.metricsDataPusher(ctx, md)
	assert.EqualError(t, err, expErr.Error())
}

func TestMetricsDataPusher_marshal_error(t *testing.T) {
	expErr := fmt.Errorf("failed to marshal")
	p := kafkaMetricsProducer{
		marshaler: &metricsErrorMarshaler{err: expErr},
		logger:    zap.NewNop(),
	}
	md := testdata.GenerateMetricsTwoMetrics()
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.metricsDataPusher(ctx, md)
	require.Error(t, err)
	assert.Contains(t, err.Error(), expErr.Error())
}

func TestLogsDataPusher(t *testing.T) {
	c := sarama.NewConfig()
	producer := mocks.NewSyncProducer(t, c)
	producer.ExpectSendMessageAndSucceed()

	p := kafkaLogsProducer{
		producer:  producer,
		marshaler: newPdataLogsMarshaler(&plog.ProtoMarshaler{}, defaultEncoding),
	}
	t.Cleanup(func() {
		require.NoError(t, p.Close(context.Background()))
	})
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.logsDataPusher(ctx, testdata.GenerateLogsOneLogRecord())
	require.NoError(t, err)
}

func TestLogsDataPusher_err(t *testing.T) {
	c := sarama.NewConfig()
	producer := mocks.NewSyncProducer(t, c)
	expErr := fmt.Errorf("failed to send")
	producer.ExpectSendMessageAndFail(expErr)

	p := kafkaLogsProducer{
		producer:  producer,
		marshaler: newPdataLogsMarshaler(&plog.ProtoMarshaler{}, defaultEncoding),
		logger:    zap.NewNop(),
	}
	t.Cleanup(func() {
		require.NoError(t, p.Close(context.Background()))
	})
	ld := testdata.GenerateLogsOneLogRecord()
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.logsDataPusher(ctx, ld)
	assert.EqualError(t, err, expErr.Error())
}

func TestLogsDataPusher_marshal_error(t *testing.T) {
	expErr := fmt.Errorf("failed to marshal")
	p := kafkaLogsProducer{
		marshaler: &logsErrorMarshaler{err: expErr},
		logger:    zap.NewNop(),
	}
	ld := testdata.GenerateLogsOneLogRecord()
	ctx := client.NewContext(context.Background(), client.Info{Metadata: client.NewMetadata(map[string][]string{"signoz_tenant_id": {"test_tenant_id"}})})
	err := p.logsDataPusher(ctx, ld)
	require.Error(t, err)
	assert.Contains(t, err.Error(), expErr.Error())
}

type tracesErrorMarshaler struct {
	err error
}

type metricsErrorMarshaler struct {
	err error
}

type logsErrorMarshaler struct {
	err error
}

func (e metricsErrorMarshaler) Marshal(_ pmetric.Metrics, _ string) ([]*sarama.ProducerMessage, error) {
	return nil, e.err
}

func (e metricsErrorMarshaler) Encoding() string {
	panic("implement me")
}

var _ TracesMarshaler = (*tracesErrorMarshaler)(nil)

func (e tracesErrorMarshaler) Marshal(_ ptrace.Traces, _ string) ([]*sarama.ProducerMessage, error) {
	return nil, e.err
}

func (e tracesErrorMarshaler) Encoding() string {
	panic("implement me")
}

func (e logsErrorMarshaler) Marshal(_ plog.Logs, _ string) ([]*sarama.ProducerMessage, error) {
	return nil, e.err
}

func (e logsErrorMarshaler) Encoding() string {
	panic("implement me")
}
