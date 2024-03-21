// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkaexporter // import "github.com/open-telemetry/opentelemetry-collector-contrib/exporter/kafkaexporter"

import (
	"context"
	"time"

	"github.com/Shopify/sarama"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/exporter/exporterhelper"

	"github.com/SigNoz/signoz-otel-collector/exporter/signozkafkaexporter/internal/metadata"
)

const (
	defaultTracesTopic  = "otlp_spans"
	defaultMetricsTopic = "otlp_metrics"
	defaultLogsTopic    = "otlp_logs"
	defaultEncoding     = "otlp_proto"
	defaultBroker       = "localhost:9092"
	// default from sarama.NewConfig()
	defaultMetadataRetryMax = 3
	// default from sarama.NewConfig()
	defaultMetadataRetryBackoff = time.Millisecond * 250
	// default from sarama.NewConfig()
	defaultMetadataFull = true
	// default max.message.bytes for the producer
	defaultProducerMaxMessageBytes = 1000000
	// default required_acks for the producer
	defaultProducerRequiredAcks = sarama.WaitForLocal
	// default from sarama.NewConfig()
	defaultCompression = "none"
	// default from sarama.NewConfig()
	defaultFluxMaxMessages = 0
)

// FactoryOption applies changes to kafkaExporterFactory.
type FactoryOption func(factory *kafkaExporterFactory)

// WithTracesMarshalers adds tracesMarshalers.
func WithTracesMarshalers(tracesMarshalers ...TracesMarshaler) FactoryOption {
	return func(factory *kafkaExporterFactory) {
		for _, marshaler := range tracesMarshalers {
			factory.tracesMarshalers[marshaler.Encoding()] = marshaler
		}
	}
}

// WithMetricsMarshalers adds additional metric marshalers to the exporter factory.
func WithMetricsMarshalers(metricMarshalers ...MetricsMarshaler) FactoryOption {
	return func(factory *kafkaExporterFactory) {
		for _, marshaler := range metricMarshalers {
			factory.metricsMarshalers[marshaler.Encoding()] = marshaler
		}
	}
}

// WithLogMarshalers adds additional log marshalers to the exporter factory.
func WithLogsMarshalers(logsMarshalers ...LogsMarshaler) FactoryOption {
	return func(factory *kafkaExporterFactory) {
		for _, marshaler := range logsMarshalers {
			factory.logsMarshalers[marshaler.Encoding()] = marshaler
		}
	}
}

// NewFactory creates Kafka exporter factory.
func NewFactory(options ...FactoryOption) exporter.Factory {
	f := &kafkaExporterFactory{
		tracesMarshalers:  tracesMarshalers(),
		metricsMarshalers: metricsMarshalers(),
		logsMarshalers:    logsMarshalers(),
	}
	for _, o := range options {
		o(f)
	}
	return exporter.NewFactory(
		metadata.Type,
		createDefaultConfig,
		exporter.WithTraces(f.createTracesExporter, metadata.TracesStability),
		exporter.WithMetrics(f.createMetricsExporter, metadata.MetricsStability),
		exporter.WithLogs(f.createLogsExporter, metadata.LogsStability),
	)
}

func createDefaultConfig() component.Config {
	return &Config{
		TimeoutSettings: exporterhelper.NewDefaultTimeoutSettings(),
		RetrySettings:   exporterhelper.NewDefaultRetrySettings(),
		QueueSettings:   exporterhelper.NewDefaultQueueSettings(),
		Brokers:         []string{defaultBroker},
		// using an empty topic to track when it has not been set by user, default is based on traces or metrics.
		Topic:    "",
		Encoding: defaultEncoding,
		Metadata: Metadata{
			Full: defaultMetadataFull,
			Retry: MetadataRetry{
				Max:     defaultMetadataRetryMax,
				Backoff: defaultMetadataRetryBackoff,
			},
		},
		Producer: Producer{
			MaxMessageBytes:  defaultProducerMaxMessageBytes,
			RequiredAcks:     defaultProducerRequiredAcks,
			Compression:      defaultCompression,
			FlushMaxMessages: defaultFluxMaxMessages,
		},
	}
}

type kafkaExporterFactory struct {
	tracesMarshalers  map[string]TracesMarshaler
	metricsMarshalers map[string]MetricsMarshaler
	logsMarshalers    map[string]LogsMarshaler
}

func (f *kafkaExporterFactory) createTracesExporter(
	ctx context.Context,
	set exporter.CreateSettings,
	cfg component.Config,
) (exporter.Traces, error) {
	oCfg := *(cfg.(*Config)) // Clone the config
	if oCfg.Topic == "" {
		oCfg.Topic = defaultTracesTopic
	}
	if oCfg.Encoding == "otlp_json" {
		set.Logger.Info("otlp_json is considered experimental and should not be used in a production environment")
	}
	exp, err := newTracesExporter(oCfg, set, f.tracesMarshalers)
	if err != nil {
		return nil, err
	}
	return exporterhelper.NewTracesExporter(
		ctx,
		set,
		&oCfg,
		exp.tracesPusher,
		exporterhelper.WithCapabilities(consumer.Capabilities{MutatesData: false}),
		// Disable exporterhelper Timeout, because we cannot pass a Context to the Producer,
		// and will rely on the sarama Producer Timeout logic.
		exporterhelper.WithTimeout(exporterhelper.TimeoutSettings{Timeout: 0}),
		exporterhelper.WithRetry(oCfg.RetrySettings),
		exporterhelper.WithQueue(oCfg.QueueSettings),
		exporterhelper.WithShutdown(exp.Close))
}

func (f *kafkaExporterFactory) createMetricsExporter(
	ctx context.Context,
	set exporter.CreateSettings,
	cfg component.Config,
) (exporter.Metrics, error) {
	oCfg := *(cfg.(*Config)) // Clone the config
	if oCfg.Topic == "" {
		oCfg.Topic = defaultMetricsTopic
	}
	if oCfg.Encoding == "otlp_json" {
		set.Logger.Info("otlp_json is considered experimental and should not be used in a production environment")
	}
	exp, err := newMetricsExporter(oCfg, set, f.metricsMarshalers)
	if err != nil {
		return nil, err
	}
	return exporterhelper.NewMetricsExporter(
		ctx,
		set,
		&oCfg,
		exp.metricsDataPusher,
		exporterhelper.WithCapabilities(consumer.Capabilities{MutatesData: false}),
		// Disable exporterhelper Timeout, because we cannot pass a Context to the Producer,
		// and will rely on the sarama Producer Timeout logic.
		exporterhelper.WithTimeout(exporterhelper.TimeoutSettings{Timeout: 0}),
		exporterhelper.WithRetry(oCfg.RetrySettings),
		exporterhelper.WithQueue(oCfg.QueueSettings),
		exporterhelper.WithShutdown(exp.Close))
}

func (f *kafkaExporterFactory) createLogsExporter(
	ctx context.Context,
	set exporter.CreateSettings,
	cfg component.Config,
) (exporter.Logs, error) {
	oCfg := *(cfg.(*Config)) // Clone the config
	if oCfg.Topic == "" {
		oCfg.Topic = defaultLogsTopic
	}
	if oCfg.Encoding == "otlp_json" {
		set.Logger.Info("otlp_json is considered experimental and should not be used in a production environment")
	}
	exp, err := newLogsExporter(oCfg, set, f.logsMarshalers)
	if err != nil {
		return nil, err
	}
	return exporterhelper.NewLogsExporter(
		ctx,
		set,
		&oCfg,
		exp.logsDataPusher,
		exporterhelper.WithCapabilities(consumer.Capabilities{MutatesData: false}),
		// Disable exporterhelper Timeout, because we cannot pass a Context to the Producer,
		// and will rely on the sarama Producer Timeout logic.
		exporterhelper.WithTimeout(exporterhelper.TimeoutSettings{Timeout: 0}),
		exporterhelper.WithRetry(oCfg.RetrySettings),
		exporterhelper.WithQueue(oCfg.QueueSettings),
		exporterhelper.WithShutdown(exp.Close))
}
