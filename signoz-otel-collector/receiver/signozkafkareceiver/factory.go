// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver // import "github.com/SigNoz/signoz-otel-collector/receiver/signozkafkareceiver"

import (
	"context"
	"time"

	"go.opencensus.io/stats/view"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/receiver"

	"github.com/SigNoz/signoz-otel-collector/receiver/signozkafkareceiver/internal/metadata"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/kafkaexporter"
)

const (
	defaultTopic         = "otlp_spans"
	defaultEncoding      = "otlp_proto"
	defaultBroker        = "localhost:9092"
	defaultClientID      = "otel-collector"
	defaultGroupID       = defaultClientID
	defaultInitialOffset = offsetLatest

	// default from sarama.NewConfig()
	defaultMetadataRetryMax = 3
	// default from sarama.NewConfig()
	defaultMetadataRetryBackoff = time.Millisecond * 250
	// default from sarama.NewConfig()
	defaultMetadataFull = true

	// default from sarama.NewConfig()
	defaultAutoCommitEnable = true
	// default from sarama.NewConfig()
	defaultAutoCommitInterval = 1 * time.Second
)

// FactoryOption applies changes to kafkaExporterFactory.
type FactoryOption func(factory *kafkaReceiverFactory)

// WithTracesUnmarshalers adds Unmarshalers.
func WithTracesUnmarshalers(tracesUnmarshalers ...TracesUnmarshaler) FactoryOption {
	return func(factory *kafkaReceiverFactory) {
		for _, unmarshaler := range tracesUnmarshalers {
			factory.tracesUnmarshalers[unmarshaler.Encoding()] = unmarshaler
		}
	}
}

// WithMetricsUnmarshalers adds MetricsUnmarshalers.
func WithMetricsUnmarshalers(metricsUnmarshalers ...MetricsUnmarshaler) FactoryOption {
	return func(factory *kafkaReceiverFactory) {
		for _, unmarshaler := range metricsUnmarshalers {
			factory.metricsUnmarshalers[unmarshaler.Encoding()] = unmarshaler
		}
	}
}

// WithLogsUnmarshalers adds LogsUnmarshalers.
func WithLogsUnmarshalers(logsUnmarshalers ...LogsUnmarshaler) FactoryOption {
	return func(factory *kafkaReceiverFactory) {
		for _, unmarshaler := range logsUnmarshalers {
			factory.logsUnmarshalers[unmarshaler.Encoding()] = unmarshaler
		}
	}
}

// NewFactory creates Kafka receiver factory.
func NewFactory(options ...FactoryOption) receiver.Factory {
	_ = view.Register(MetricViews()...)

	f := &kafkaReceiverFactory{
		tracesUnmarshalers:  defaultTracesUnmarshalers(),
		metricsUnmarshalers: defaultMetricsUnmarshalers(),
		logsUnmarshalers:    defaultLogsUnmarshalers(),
	}
	for _, o := range options {
		o(f)
	}
	return receiver.NewFactory(
		metadata.Type,
		createDefaultConfig,
		receiver.WithTraces(f.createTracesReceiver, metadata.TracesStability),
		receiver.WithMetrics(f.createMetricsReceiver, metadata.MetricsStability),
		receiver.WithLogs(f.createLogsReceiver, metadata.LogsStability),
	)
}

func createDefaultConfig() component.Config {
	return &Config{
		Topic:         defaultTopic,
		Encoding:      defaultEncoding,
		Brokers:       []string{defaultBroker},
		ClientID:      defaultClientID,
		GroupID:       defaultGroupID,
		InitialOffset: defaultInitialOffset,
		Metadata: kafkaexporter.Metadata{
			Full: defaultMetadataFull,
			Retry: kafkaexporter.MetadataRetry{
				Max:     defaultMetadataRetryMax,
				Backoff: defaultMetadataRetryBackoff,
			},
		},
		AutoCommit: AutoCommit{
			Enable:   defaultAutoCommitEnable,
			Interval: defaultAutoCommitInterval,
		},
		MessageMarking: MessageMarking{
			After:   false,
			OnError: false,
		},
	}
}

type kafkaReceiverFactory struct {
	tracesUnmarshalers  map[string]TracesUnmarshaler
	metricsUnmarshalers map[string]MetricsUnmarshaler
	logsUnmarshalers    map[string]LogsUnmarshaler
}

func (f *kafkaReceiverFactory) createTracesReceiver(
	_ context.Context,
	set receiver.CreateSettings,
	cfg component.Config,
	nextConsumer consumer.Traces,
) (receiver.Traces, error) {
	c := cfg.(*Config)
	r, err := newTracesReceiver(*c, set, f.tracesUnmarshalers, nextConsumer)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (f *kafkaReceiverFactory) createMetricsReceiver(
	_ context.Context,
	set receiver.CreateSettings,
	cfg component.Config,
	nextConsumer consumer.Metrics,
) (receiver.Metrics, error) {
	c := cfg.(*Config)
	r, err := newMetricsReceiver(*c, set, f.metricsUnmarshalers, nextConsumer)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (f *kafkaReceiverFactory) createLogsReceiver(
	_ context.Context,
	set receiver.CreateSettings,
	cfg component.Config,
	nextConsumer consumer.Logs,
) (receiver.Logs, error) {
	c := cfg.(*Config)
	r, err := newLogsReceiver(*c, set, f.logsUnmarshalers, nextConsumer)
	if err != nil {
		return nil, err
	}
	return r, nil
}
