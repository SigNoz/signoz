// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkaexporter

import (
	"context"
	"errors"
	"net"
	"testing"

	"github.com/Shopify/sarama"
	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/exporter/exportertest"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

// data is a simple means of allowing
// interchangeability between the
// different marshaller types
type data interface {
	ptrace.Traces | plog.Logs | pmetric.Metrics
}

type mockMarshaler[Data data] struct {
	consume  func(d Data, topic string) ([]*sarama.ProducerMessage, error)
	encoding string
}

func (mm *mockMarshaler[Data]) Encoding() string { return mm.encoding }

func (mm *mockMarshaler[Data]) Marshal(d Data, topic string) ([]*sarama.ProducerMessage, error) {
	if mm.consume != nil {
		return mm.consume(d, topic)
	}
	return nil, errors.New("not implemented")
}

func newMockMarshaler[Data data](encoding string) *mockMarshaler[Data] {
	return &mockMarshaler[Data]{encoding: encoding}
}

// applyConfigOption is used to modify values of the
// the default exporter config to make it easier to
// use the return in a test table set up
func applyConfigOption(option func(conf *Config)) *Config {
	conf := createDefaultConfig().(*Config)
	option(conf)
	return conf
}

func TestCreateDefaultConfig(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	assert.NotNil(t, cfg, "failed to create default config")
	assert.NoError(t, componenttest.CheckConfigStruct(cfg))
	assert.Equal(t, []string{defaultBroker}, cfg.Brokers)
	assert.Equal(t, "", cfg.Topic)
}

func TestCreateMetricExporter(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		conf       *Config
		marshalers []MetricsMarshaler
		err        error
	}{
		{
			name: "valid config (no validating broker)",
			conf: applyConfigOption(func(conf *Config) {
				// this disables contacting the broker so
				// we can successfully create the exporter
				conf.Metadata.Full = false
				conf.Brokers = []string{"invalid:9092"}
				conf.ProtocolVersion = "2.0.0"
			}),
			err: nil,
		},
		{
			name: "invalid config (validating broker)",
			conf: applyConfigOption(func(conf *Config) {
				conf.Brokers = []string{"invalid:9092"}
				conf.ProtocolVersion = "2.0.0"
			}),
			err: &net.DNSError{},
		},
		{
			name: "default_encoding",
			conf: applyConfigOption(func(conf *Config) {
				// Disabling broker check to ensure encoding work
				conf.Metadata.Full = false
				conf.Encoding = defaultEncoding
			}),
			marshalers: nil,
			err:        nil,
		},
		{
			name: "custom_encoding",
			conf: applyConfigOption(func(conf *Config) {
				// Disabling broker check to ensure encoding work
				conf.Metadata.Full = false
				conf.Encoding = "custom"
			}),
			marshalers: []MetricsMarshaler{
				newMockMarshaler[pmetric.Metrics]("custom"),
			},
			err: nil,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			f := NewFactory(WithMetricsMarshalers(tc.marshalers...))
			exporter, err := f.CreateMetricsExporter(
				context.Background(),
				exportertest.NewNopCreateSettings(),
				tc.conf,
			)
			if tc.err != nil {
				assert.ErrorAs(t, err, &tc.err, "Must match the expected error")
				assert.Nil(t, exporter, "Must return nil value for invalid exporter")
				return
			}
			assert.NoError(t, err, "Must not error")
			assert.NotNil(t, exporter, "Must return valid exporter when no error is returned")
		})
	}
}

func TestCreateLogExporter(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		conf       *Config
		marshalers []LogsMarshaler
		err        error
	}{
		{
			name: "valid config (no validating broker)",
			conf: applyConfigOption(func(conf *Config) {
				// this disables contacting the broker so
				// we can successfully create the exporter
				conf.Metadata.Full = false
				conf.Brokers = []string{"invalid:9092"}
				conf.ProtocolVersion = "2.0.0"
			}),
			err: nil,
		},
		{
			name: "invalid config (validating broker)",
			conf: applyConfigOption(func(conf *Config) {
				conf.Brokers = []string{"invalid:9092"}
				conf.ProtocolVersion = "2.0.0"
			}),
			err: &net.DNSError{},
		},
		{
			name: "default_encoding",
			conf: applyConfigOption(func(conf *Config) {
				// Disabling broker check to ensure encoding work
				conf.Metadata.Full = false
				conf.Encoding = defaultEncoding
			}),
			marshalers: nil,
			err:        nil,
		},
		{
			name: "custom_encoding",
			conf: applyConfigOption(func(conf *Config) {
				// Disabling broker check to ensure encoding work
				conf.Metadata.Full = false
				conf.Encoding = "custom"
			}),
			marshalers: []LogsMarshaler{
				newMockMarshaler[plog.Logs]("custom"),
			},
			err: nil,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			f := NewFactory(WithLogsMarshalers(tc.marshalers...))
			exporter, err := f.CreateLogsExporter(
				context.Background(),
				exportertest.NewNopCreateSettings(),
				tc.conf,
			)
			if tc.err != nil {
				assert.ErrorAs(t, err, &tc.err, "Must match the expected error")
				assert.Nil(t, exporter, "Must return nil value for invalid exporter")
				return
			}
			assert.NoError(t, err, "Must not error")
			assert.NotNil(t, exporter, "Must return valid exporter when no error is returned")
		})
	}
}

func TestCreateTraceExporter(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		conf       *Config
		marshalers []TracesMarshaler
		err        error
	}{
		{
			name: "valid config (no validating brokers)",
			conf: applyConfigOption(func(conf *Config) {
				conf.Metadata.Full = false
				conf.Brokers = []string{"invalid:9092"}
				conf.ProtocolVersion = "2.0.0"
			}),
			marshalers: nil,
			err:        nil,
		},
		{
			name: "invalid config (validating brokers)",
			conf: applyConfigOption(func(conf *Config) {
				conf.Brokers = []string{"invalid:9092"}
				conf.ProtocolVersion = "2.0.0"
			}),
			marshalers: nil,
			err:        &net.DNSError{},
		},
		{
			name: "default_encoding",
			conf: applyConfigOption(func(conf *Config) {
				// Disabling broker check to ensure encoding work
				conf.Metadata.Full = false
				conf.Encoding = defaultEncoding
			}),
			marshalers: nil,
			err:        nil,
		},
		{
			name: "custom_encoding",
			conf: applyConfigOption(func(conf *Config) {
				// Disabling broker check to ensure encoding work
				conf.Metadata.Full = false
				conf.Encoding = "custom"
			}),
			marshalers: []TracesMarshaler{
				newMockMarshaler[ptrace.Traces]("custom"),
			},
			err: nil,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			f := NewFactory(WithTracesMarshalers(tc.marshalers...))
			exporter, err := f.CreateTracesExporter(
				context.Background(),
				exportertest.NewNopCreateSettings(),
				tc.conf,
			)
			if tc.err != nil {
				assert.ErrorAs(t, err, &tc.err, "Must match the expected error")
				assert.Nil(t, exporter, "Must return nil value for invalid exporter")
				return
			}
			assert.NoError(t, err, "Must not error")
			assert.NotNil(t, exporter, "Must return valid exporter when no error is returned")
		})
	}
}
