// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/receiver/receivertest"
)

func TestCreateDefaultConfig(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	assert.NotNil(t, cfg, "failed to create default config")
	assert.NoError(t, componenttest.CheckConfigStruct(cfg))
	assert.Equal(t, []string{defaultBroker}, cfg.Brokers)
	assert.Equal(t, defaultTopic, cfg.Topic)
	assert.Equal(t, defaultGroupID, cfg.GroupID)
	assert.Equal(t, defaultClientID, cfg.ClientID)
	assert.Equal(t, defaultInitialOffset, cfg.InitialOffset)
}

func TestCreateTracesReceiver(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	cfg.Brokers = []string{"invalid:9092"}
	cfg.ProtocolVersion = "2.0.0"
	f := kafkaReceiverFactory{tracesUnmarshalers: defaultTracesUnmarshalers()}
	r, err := f.createTracesReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
	// no available broker
	require.Error(t, err)
	assert.Nil(t, r)
}

func TestCreateTracesReceiver_error(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	cfg.ProtocolVersion = "2.0.0"
	// disable contacting broker at startup
	cfg.Metadata.Full = false
	f := kafkaReceiverFactory{tracesUnmarshalers: defaultTracesUnmarshalers()}
	r, err := f.createTracesReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
	require.NoError(t, err)
	assert.NotNil(t, r)
}

func TestWithTracesUnmarshalers(t *testing.T) {
	unmarshaler := &customTracesUnmarshaler{}
	f := NewFactory(WithTracesUnmarshalers(unmarshaler))
	cfg := createDefaultConfig().(*Config)
	// disable contacting broker
	cfg.Metadata.Full = false
	cfg.ProtocolVersion = "2.0.0"

	t.Run("custom_encoding", func(t *testing.T) {
		cfg.Encoding = unmarshaler.Encoding()
		receiver, err := f.CreateTracesReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
		require.NoError(t, err)
		require.NotNil(t, receiver)
	})
	t.Run("default_encoding", func(t *testing.T) {
		cfg.Encoding = defaultEncoding
		receiver, err := f.CreateTracesReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
		require.NoError(t, err)
		assert.NotNil(t, receiver)
	})
}

func TestCreateMetricsReceiver(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	cfg.Brokers = []string{"invalid:9092"}
	cfg.ProtocolVersion = "2.0.0"
	f := kafkaReceiverFactory{metricsUnmarshalers: defaultMetricsUnmarshalers()}
	r, err := f.createMetricsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
	// no available broker
	require.Error(t, err)
	assert.Nil(t, r)
}

func TestCreateMetricsReceiver_error(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	cfg.ProtocolVersion = "2.0.0"
	// disable contacting broker at startup
	cfg.Metadata.Full = false
	f := kafkaReceiverFactory{metricsUnmarshalers: defaultMetricsUnmarshalers()}
	r, err := f.createMetricsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
	require.NoError(t, err)
	assert.NotNil(t, r)
}

func TestWithMetricsUnmarshalers(t *testing.T) {
	unmarshaler := &customMetricsUnmarshaler{}
	f := NewFactory(WithMetricsUnmarshalers(unmarshaler))
	cfg := createDefaultConfig().(*Config)
	// disable contacting broker
	cfg.Metadata.Full = false
	cfg.ProtocolVersion = "2.0.0"

	t.Run("custom_encoding", func(t *testing.T) {
		cfg.Encoding = unmarshaler.Encoding()
		receiver, err := f.CreateMetricsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
		require.NoError(t, err)
		require.NotNil(t, receiver)
	})
	t.Run("default_encoding", func(t *testing.T) {
		cfg.Encoding = defaultEncoding
		receiver, err := f.CreateMetricsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
		require.NoError(t, err)
		assert.NotNil(t, receiver)
	})
}

func TestCreateLogsReceiver(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	cfg.Brokers = []string{"invalid:9092"}
	cfg.ProtocolVersion = "2.0.0"
	f := kafkaReceiverFactory{logsUnmarshalers: defaultLogsUnmarshalers()}
	r, err := f.createLogsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
	// no available broker
	require.Error(t, err)
	assert.Nil(t, r)
}

func TestCreateLogsReceiver_error(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	cfg.ProtocolVersion = "2.0.0"
	// disable contacting broker at startup
	cfg.Metadata.Full = false
	f := kafkaReceiverFactory{logsUnmarshalers: defaultLogsUnmarshalers()}
	r, err := f.createLogsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
	require.NoError(t, err)
	assert.NotNil(t, r)
}

func TestWithLogsUnmarshalers(t *testing.T) {
	unmarshaler := &customLogsUnmarshaler{}
	f := NewFactory(WithLogsUnmarshalers(unmarshaler))
	cfg := createDefaultConfig().(*Config)
	// disable contacting broker
	cfg.Metadata.Full = false
	cfg.ProtocolVersion = "2.0.0"

	t.Run("custom_encoding", func(t *testing.T) {
		cfg.Encoding = unmarshaler.Encoding()
		exporter, err := f.CreateLogsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
		require.NoError(t, err)
		require.NotNil(t, exporter)
	})
	t.Run("default_encoding", func(t *testing.T) {
		cfg.Encoding = defaultEncoding
		exporter, err := f.CreateLogsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, nil)
		require.NoError(t, err)
		assert.NotNil(t, exporter)
	})
}

type customTracesUnmarshaler struct {
}

type customMetricsUnmarshaler struct {
}

type customLogsUnmarshaler struct {
}

var _ TracesUnmarshaler = (*customTracesUnmarshaler)(nil)

func (c customTracesUnmarshaler) Unmarshal([]byte) (ptrace.Traces, error) {
	panic("implement me")
}

func (c customTracesUnmarshaler) Encoding() string {
	return "custom"
}

func (c customMetricsUnmarshaler) Unmarshal([]byte) (pmetric.Metrics, error) {
	panic("implement me")
}

func (c customMetricsUnmarshaler) Encoding() string {
	return "custom"
}

func (c customLogsUnmarshaler) Unmarshal([]byte) (plog.Logs, error) {
	panic("implement me")
}

func (c customLogsUnmarshaler) Encoding() string {
	return "custom"
}
