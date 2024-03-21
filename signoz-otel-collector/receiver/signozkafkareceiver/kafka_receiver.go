// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver // import "github.com/SigNoz/signoz-otel-collector/receiver/signozkafkareceiver"

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/IBM/sarama"
	"go.opencensus.io/stats"
	"go.opencensus.io/tag"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/receiver"
	"go.opentelemetry.io/collector/receiver/receiverhelper"
	"go.uber.org/zap"

	"github.com/SigNoz/signoz-otel-collector/internal/kafka"
)

const (
	transport = "kafka"
)

var errUnrecognizedEncoding = fmt.Errorf("unrecognized encoding")
var errInvalidInitialOffset = fmt.Errorf("invalid initial offset")

// kafkaTracesConsumer uses sarama to consume and handle messages from kafka.
type kafkaTracesConsumer struct {
	consumerGroup     sarama.ConsumerGroup
	nextConsumer      consumer.Traces
	topics            []string
	cancelConsumeLoop context.CancelFunc
	unmarshaler       TracesUnmarshaler

	settings receiver.CreateSettings

	autocommitEnabled bool
	messageMarking    MessageMarking
}

// kafkaMetricsConsumer uses sarama to consume and handle messages from kafka.
type kafkaMetricsConsumer struct {
	consumerGroup     sarama.ConsumerGroup
	nextConsumer      consumer.Metrics
	topics            []string
	cancelConsumeLoop context.CancelFunc
	unmarshaler       MetricsUnmarshaler

	settings receiver.CreateSettings

	autocommitEnabled bool
	messageMarking    MessageMarking
}

// kafkaLogsConsumer uses sarama to consume and handle messages from kafka.
type kafkaLogsConsumer struct {
	consumerGroup     sarama.ConsumerGroup
	nextConsumer      consumer.Logs
	topics            []string
	cancelConsumeLoop context.CancelFunc
	unmarshaler       LogsUnmarshaler

	settings receiver.CreateSettings

	autocommitEnabled bool
	messageMarking    MessageMarking
}

var _ receiver.Traces = (*kafkaTracesConsumer)(nil)
var _ receiver.Metrics = (*kafkaMetricsConsumer)(nil)
var _ receiver.Logs = (*kafkaLogsConsumer)(nil)

func newTracesReceiver(config Config, set receiver.CreateSettings, unmarshalers map[string]TracesUnmarshaler, nextConsumer consumer.Traces) (*kafkaTracesConsumer, error) {
	unmarshaler := unmarshalers[config.Encoding]
	if unmarshaler == nil {
		return nil, errUnrecognizedEncoding
	}

	// set sarama library's logger to get detailed logs from the library
	sarama.Logger = zap.NewStdLog(set.Logger)

	c := sarama.NewConfig()
	c = setSaramaConsumerConfig(c, &config.SaramaConsumerConfig)
	c.ClientID = config.ClientID
	c.Metadata.Full = config.Metadata.Full
	c.Metadata.Retry.Max = config.Metadata.Retry.Max
	c.Metadata.Retry.Backoff = config.Metadata.Retry.Backoff
	c.Consumer.Offsets.AutoCommit.Enable = config.AutoCommit.Enable
	c.Consumer.Offsets.AutoCommit.Interval = config.AutoCommit.Interval
	if initialOffset, err := toSaramaInitialOffset(config.InitialOffset); err == nil {
		c.Consumer.Offsets.Initial = initialOffset
	} else {
		return nil, err
	}
	if config.ProtocolVersion != "" {
		version, err := sarama.ParseKafkaVersion(config.ProtocolVersion)
		if err != nil {
			return nil, err
		}
		c.Version = version
	}
	if err := kafka.ConfigureAuthentication(config.Authentication, c); err != nil {
		return nil, err
	}
	client, err := sarama.NewConsumerGroup(config.Brokers, config.GroupID, c)
	if err != nil {
		return nil, err
	}
	return &kafkaTracesConsumer{
		consumerGroup:     client,
		topics:            []string{config.Topic},
		nextConsumer:      nextConsumer,
		unmarshaler:       unmarshaler,
		settings:          set,
		autocommitEnabled: config.AutoCommit.Enable,
		messageMarking:    config.MessageMarking,
	}, nil
}

func (c *kafkaTracesConsumer) Start(_ context.Context, host component.Host) error {
	ctx, cancel := context.WithCancel(context.Background())
	c.cancelConsumeLoop = cancel
	
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{
		ReceiverID:             c.settings.ID,
		Transport:              transport,
		ReceiverCreateSettings: c.settings,
	})
	if err != nil {
		return err
	}
	consumerGroup := &tracesConsumerGroupHandler{
		id:                c.settings.ID,
		logger:            c.settings.Logger,
		unmarshaler:       c.unmarshaler,
		nextConsumer:      c.nextConsumer,
		ready:             make(chan bool),
		obsrecv:           obsrecv,
		autocommitEnabled: c.autocommitEnabled,
		messageMarking:    c.messageMarking,
	}
	go func() {
		if err := c.consumeLoop(ctx, consumerGroup); err != nil {
			host.ReportFatalError(err)
		}
	}()
	<-consumerGroup.ready
	return nil
}

func (c *kafkaTracesConsumer) consumeLoop(ctx context.Context, handler sarama.ConsumerGroupHandler) error {
	for {
		// `Consume` should be called inside an infinite loop, when a
		// server-side rebalance happens, the consumer session will need to be
		// recreated to get the new claims
		if err := c.consumerGroup.Consume(ctx, c.topics, handler); err != nil {
			c.settings.Logger.Error("Error from consumer", zap.Error(err))
		}
		// check if context was cancelled, signaling that the consumer should stop
		if ctx.Err() != nil {
			c.settings.Logger.Info("Consumer stopped", zap.Error(ctx.Err()))
			return ctx.Err()
		}
	}
}

func (c *kafkaTracesConsumer) Shutdown(context.Context) error {
	c.cancelConsumeLoop()
	return c.consumerGroup.Close()
}

func newMetricsReceiver(config Config, set receiver.CreateSettings, unmarshalers map[string]MetricsUnmarshaler, nextConsumer consumer.Metrics) (*kafkaMetricsConsumer, error) {
	unmarshaler := unmarshalers[config.Encoding]
	if unmarshaler == nil {
		return nil, errUnrecognizedEncoding
	}

	// set sarama library's logger to get detailed logs from the library
	sarama.Logger = zap.NewStdLog(set.Logger)

	c := sarama.NewConfig()
	c = setSaramaConsumerConfig(c, &config.SaramaConsumerConfig)
	c.ClientID = config.ClientID
	c.Metadata.Full = config.Metadata.Full
	c.Metadata.Retry.Max = config.Metadata.Retry.Max
	c.Metadata.Retry.Backoff = config.Metadata.Retry.Backoff
	c.Consumer.Offsets.AutoCommit.Enable = config.AutoCommit.Enable
	c.Consumer.Offsets.AutoCommit.Interval = config.AutoCommit.Interval
	if initialOffset, err := toSaramaInitialOffset(config.InitialOffset); err == nil {
		c.Consumer.Offsets.Initial = initialOffset
	} else {
		return nil, err
	}
	if config.ProtocolVersion != "" {
		version, err := sarama.ParseKafkaVersion(config.ProtocolVersion)
		if err != nil {
			return nil, err
		}
		c.Version = version
	}
	if err := kafka.ConfigureAuthentication(config.Authentication, c); err != nil {
		return nil, err
	}
	client, err := sarama.NewConsumerGroup(config.Brokers, config.GroupID, c)
	if err != nil {
		return nil, err
	}
	return &kafkaMetricsConsumer{
		consumerGroup:     client,
		topics:            []string{config.Topic},
		nextConsumer:      nextConsumer,
		unmarshaler:       unmarshaler,
		settings:          set,
		autocommitEnabled: config.AutoCommit.Enable,
		messageMarking:    config.MessageMarking,
	}, nil
}

func (c *kafkaMetricsConsumer) Start(_ context.Context, host component.Host) error {
	ctx, cancel := context.WithCancel(context.Background())
	c.cancelConsumeLoop = cancel
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{
		ReceiverID:             c.settings.ID,
		Transport:              transport,
		ReceiverCreateSettings: c.settings,
	})
	if err != nil {
		return err
	}
	metricsConsumerGroup := &metricsConsumerGroupHandler{
		id:                c.settings.ID,
		logger:            c.settings.Logger,
		unmarshaler:       c.unmarshaler,
		nextConsumer:      c.nextConsumer,
		ready:             make(chan bool),
		obsrecv:           obsrecv,
		autocommitEnabled: c.autocommitEnabled,
		messageMarking:    c.messageMarking,
	}
	go func() {
		if err := c.consumeLoop(ctx, metricsConsumerGroup); err != nil {
			host.ReportFatalError(err)
		}
	}()
	<-metricsConsumerGroup.ready
	return nil
}

func (c *kafkaMetricsConsumer) consumeLoop(ctx context.Context, handler sarama.ConsumerGroupHandler) error {
	for {
		// `Consume` should be called inside an infinite loop, when a
		// server-side rebalance happens, the consumer session will need to be
		// recreated to get the new claims
		if err := c.consumerGroup.Consume(ctx, c.topics, handler); err != nil {
			c.settings.Logger.Error("Error from consumer", zap.Error(err))
		}
		// check if context was cancelled, signaling that the consumer should stop
		if ctx.Err() != nil {
			c.settings.Logger.Info("Consumer stopped", zap.Error(ctx.Err()))
			return ctx.Err()
		}
	}
}

func (c *kafkaMetricsConsumer) Shutdown(context.Context) error {
	c.cancelConsumeLoop()
	return c.consumerGroup.Close()
}

func newLogsReceiver(config Config, set receiver.CreateSettings, unmarshalers map[string]LogsUnmarshaler, nextConsumer consumer.Logs) (*kafkaLogsConsumer, error) {
	// set sarama library's logger to get detailed logs from the library
	sarama.Logger = zap.NewStdLog(set.Logger)
	
	c := sarama.NewConfig()
	c = setSaramaConsumerConfig(c, &config.SaramaConsumerConfig)
	c.ClientID = config.ClientID
	c.Metadata.Full = config.Metadata.Full
	c.Metadata.Retry.Max = config.Metadata.Retry.Max
	c.Metadata.Retry.Backoff = config.Metadata.Retry.Backoff
	c.Consumer.Offsets.AutoCommit.Enable = config.AutoCommit.Enable
	c.Consumer.Offsets.AutoCommit.Interval = config.AutoCommit.Interval
	if initialOffset, err := toSaramaInitialOffset(config.InitialOffset); err == nil {
		c.Consumer.Offsets.Initial = initialOffset
	} else {
		return nil, err
	}
	unmarshaler, err := getLogsUnmarshaler(config.Encoding, unmarshalers)
	if err != nil {
		return nil, err
	}
	if config.ProtocolVersion != "" {
		var version sarama.KafkaVersion
		version, err = sarama.ParseKafkaVersion(config.ProtocolVersion)
		if err != nil {
			return nil, err
		}
		c.Version = version
	}
	if err = kafka.ConfigureAuthentication(config.Authentication, c); err != nil {
		return nil, err
	}
	client, err := sarama.NewConsumerGroup(config.Brokers, config.GroupID, c)
	if err != nil {
		return nil, err
	}
	return &kafkaLogsConsumer{
		consumerGroup:     client,
		topics:            []string{config.Topic},
		nextConsumer:      nextConsumer,
		unmarshaler:       unmarshaler,
		settings:          set,
		autocommitEnabled: config.AutoCommit.Enable,
		messageMarking:    config.MessageMarking,
	}, nil
}

func getLogsUnmarshaler(encoding string, unmarshalers map[string]LogsUnmarshaler) (LogsUnmarshaler, error) {
	var enc string
	unmarshaler, ok := unmarshalers[encoding]
	if !ok {
		split := strings.SplitN(encoding, "_", 2)
		prefix := split[0]
		if len(split) > 1 {
			enc = split[1]
		}
		unmarshaler, ok = unmarshalers[prefix].(LogsUnmarshalerWithEnc)
		if !ok {
			return nil, errUnrecognizedEncoding
		}
	}

	if unmarshalerWithEnc, ok := unmarshaler.(LogsUnmarshalerWithEnc); ok {
		// This should be called even when enc is an empty string to initialize the encoding.
		unmarshaler, err := unmarshalerWithEnc.WithEnc(enc)
		if err != nil {
			return nil, err
		}
		return unmarshaler, nil
	}

	return unmarshaler, nil
}

func (c *kafkaLogsConsumer) Start(_ context.Context, host component.Host) error {
	ctx, cancel := context.WithCancel(context.Background())
	c.cancelConsumeLoop = cancel
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{
		ReceiverID:             c.settings.ID,
		Transport:              transport,
		ReceiverCreateSettings: c.settings,
	})
	if err != nil {
		return err
	}

	logsConsumerGroup := &logsConsumerGroupHandler{
		id:                c.settings.ID,
		logger:            c.settings.Logger,
		unmarshaler:       c.unmarshaler,
		nextConsumer:      c.nextConsumer,
		ready:             make(chan bool),
		obsrecv:           obsrecv,
		autocommitEnabled: c.autocommitEnabled,
		messageMarking:    c.messageMarking,
	}
	go func() {
		if err := c.consumeLoop(ctx, logsConsumerGroup); err != nil {
			host.ReportFatalError(err)
		}
	}()
	<-logsConsumerGroup.ready
	return nil
}

func (c *kafkaLogsConsumer) consumeLoop(ctx context.Context, handler sarama.ConsumerGroupHandler) error {
	for {
		// `Consume` should be called inside an infinite loop, when a
		// server-side rebalance happens, the consumer session will need to be
		// recreated to get the new claims
		if err := c.consumerGroup.Consume(ctx, c.topics, handler); err != nil {
			c.settings.Logger.Error("Error from consumer", zap.Error(err))
		}
		// check if context was cancelled, signaling that the consumer should stop
		if ctx.Err() != nil {
			c.settings.Logger.Info("Consumer stopped", zap.Error(ctx.Err()))
			return ctx.Err()
		}
	}
}

func (c *kafkaLogsConsumer) Shutdown(context.Context) error {
	c.cancelConsumeLoop()
	return c.consumerGroup.Close()
}

type tracesConsumerGroupHandler struct {
	id           component.ID
	unmarshaler  TracesUnmarshaler
	nextConsumer consumer.Traces
	ready        chan bool
	readyCloser  sync.Once

	logger *zap.Logger

	obsrecv *receiverhelper.ObsReport

	autocommitEnabled bool
	messageMarking    MessageMarking
}

type metricsConsumerGroupHandler struct {
	id           component.ID
	unmarshaler  MetricsUnmarshaler
	nextConsumer consumer.Metrics
	ready        chan bool
	readyCloser  sync.Once

	logger *zap.Logger

	obsrecv *receiverhelper.ObsReport

	autocommitEnabled bool
	messageMarking    MessageMarking
}

type logsConsumerGroupHandler struct {
	id           component.ID
	unmarshaler  LogsUnmarshaler
	nextConsumer consumer.Logs
	ready        chan bool
	readyCloser  sync.Once

	logger *zap.Logger

	obsrecv *receiverhelper.ObsReport

	autocommitEnabled bool
	messageMarking    MessageMarking
}

var _ sarama.ConsumerGroupHandler = (*tracesConsumerGroupHandler)(nil)
var _ sarama.ConsumerGroupHandler = (*metricsConsumerGroupHandler)(nil)
var _ sarama.ConsumerGroupHandler = (*logsConsumerGroupHandler)(nil)

func (c *tracesConsumerGroupHandler) Setup(session sarama.ConsumerGroupSession) error {
	c.readyCloser.Do(func() {
		close(c.ready)
	})
	statsTags := []tag.Mutator{tag.Upsert(tagInstanceName, c.id.Name())}
	_ = stats.RecordWithTags(session.Context(), statsTags, statPartitionStart.M(1))
	return nil
}

func (c *tracesConsumerGroupHandler) Cleanup(session sarama.ConsumerGroupSession) error {
	statsTags := []tag.Mutator{tag.Upsert(tagInstanceName, c.id.Name())}
	_ = stats.RecordWithTags(session.Context(), statsTags, statPartitionClose.M(1))
	return nil
}

func (c *tracesConsumerGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	c.logger.Info("Starting consumer group", zap.Int32("partition", claim.Partition()))
	if !c.autocommitEnabled {
		defer session.Commit()
	}
	for {
		select {
		case message, ok := <-claim.Messages():
			if !ok {
				return nil
			}
			start := time.Now()
			c.logger.Debug("Kafka message claimed",
				zap.String("value", string(message.Value)),
				zap.Time("timestamp", message.Timestamp),
				zap.String("topic", message.Topic))
			if !c.messageMarking.After {
				session.MarkMessage(message, "")
			}

			ctx := c.obsrecv.StartTracesOp(session.Context())
			statsTags := []tag.Mutator{tag.Upsert(tagInstanceName, c.id.String())}
			_ = stats.RecordWithTags(ctx, statsTags,
				statMessageCount.M(1),
				statMessageOffset.M(message.Offset),
				statMessageOffsetLag.M(claim.HighWaterMarkOffset()-message.Offset-1))

			traces, err := c.unmarshaler.Unmarshal(message.Value)
			if err != nil {
				c.logger.Error("failed to unmarshal message", zap.Error(err))
				if c.messageMarking.After && c.messageMarking.OnError {
					session.MarkMessage(message, "")
				}
				return err
			}

			spanCount := traces.SpanCount()
			err = c.nextConsumer.ConsumeTraces(session.Context(), traces)
			c.obsrecv.EndTracesOp(ctx, c.unmarshaler.Encoding(), spanCount, err)
			if err != nil {
				c.logger.Error("kafka receiver: failed to export traces", zap.Error(err), zap.Int32("partition", claim.Partition()), zap.String("topic", claim.Topic()))
				if c.messageMarking.After && c.messageMarking.OnError {
					session.MarkMessage(message, "")
				}
				return err
			}
			if c.messageMarking.After {
				session.MarkMessage(message, "")
			}
			if !c.autocommitEnabled {
				session.Commit()
			}
			err = stats.RecordWithTags(ctx, statsTags, processingTime.M(time.Since(start).Milliseconds()))
			if err != nil {
				c.logger.Error("failed to record processing time", zap.Error(err))
			}

		// Should return when `session.Context()` is done.
		// If not, will raise `ErrRebalanceInProgress` or `read tcp <ip>:<port>: i/o timeout` when kafka rebalance. see:
		// https://github.com/Shopify/sarama/issues/1192
		case <-session.Context().Done():
			return nil
		}
	}
}

func (c *metricsConsumerGroupHandler) Setup(session sarama.ConsumerGroupSession) error {
	c.readyCloser.Do(func() {
		close(c.ready)
	})
	statsTags := []tag.Mutator{tag.Upsert(tagInstanceName, c.id.Name())}
	_ = stats.RecordWithTags(session.Context(), statsTags, statPartitionStart.M(1))
	return nil
}

func (c *metricsConsumerGroupHandler) Cleanup(session sarama.ConsumerGroupSession) error {
	statsTags := []tag.Mutator{tag.Upsert(tagInstanceName, c.id.Name())}
	_ = stats.RecordWithTags(session.Context(), statsTags, statPartitionClose.M(1))
	return nil
}

func (c *metricsConsumerGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	c.logger.Info("Starting consumer group", zap.Int32("partition", claim.Partition()))
	if !c.autocommitEnabled {
		defer session.Commit()
	}
	for {
		select {
		case message, ok := <-claim.Messages():
			if !ok {
				return nil
			}
			start := time.Now()
			c.logger.Debug("Kafka message claimed",
				zap.String("value", string(message.Value)),
				zap.Time("timestamp", message.Timestamp),
				zap.String("topic", message.Topic))
			if !c.messageMarking.After {
				session.MarkMessage(message, "")
			}

			ctx := c.obsrecv.StartMetricsOp(session.Context())
			statsTags := []tag.Mutator{tag.Upsert(tagInstanceName, c.id.String())}
			_ = stats.RecordWithTags(ctx, statsTags,
				statMessageCount.M(1),
				statMessageOffset.M(message.Offset),
				statMessageOffsetLag.M(claim.HighWaterMarkOffset()-message.Offset-1))

			metrics, err := c.unmarshaler.Unmarshal(message.Value)
			if err != nil {
				c.logger.Error("failed to unmarshal message", zap.Error(err))
				if c.messageMarking.After && c.messageMarking.OnError {
					session.MarkMessage(message, "")
				}
				return err
			}

			dataPointCount := metrics.DataPointCount()
			err = c.nextConsumer.ConsumeMetrics(session.Context(), metrics)
			c.obsrecv.EndMetricsOp(ctx, c.unmarshaler.Encoding(), dataPointCount, err)
			if err != nil {
				c.logger.Error("kafka receiver: failed to export metrics", zap.Error(err), zap.Int32("partition", claim.Partition()), zap.String("topic", claim.Topic()))
				if c.messageMarking.After && c.messageMarking.OnError {
					session.MarkMessage(message, "")
				}
				return err
			}
			if c.messageMarking.After {
				session.MarkMessage(message, "")
			}
			if !c.autocommitEnabled {
				session.Commit()
			}
			err = stats.RecordWithTags(ctx, statsTags, processingTime.M(time.Since(start).Milliseconds()))
			if err != nil {
				c.logger.Error("failed to record processing time", zap.Error(err))
			}

		// Should return when `session.Context()` is done.
		// If not, will raise `ErrRebalanceInProgress` or `read tcp <ip>:<port>: i/o timeout` when kafka rebalance. see:
		// https://github.com/Shopify/sarama/issues/1192
		case <-session.Context().Done():
			return nil
		}
	}
}

func (c *logsConsumerGroupHandler) Setup(session sarama.ConsumerGroupSession) error {
	c.readyCloser.Do(func() {
		close(c.ready)
	})
	_ = stats.RecordWithTags(
		session.Context(),
		[]tag.Mutator{tag.Upsert(tagInstanceName, c.id.String())},
		statPartitionStart.M(1))
	return nil
}

func (c *logsConsumerGroupHandler) Cleanup(session sarama.ConsumerGroupSession) error {
	_ = stats.RecordWithTags(
		session.Context(),
		[]tag.Mutator{tag.Upsert(tagInstanceName, c.id.String())},
		statPartitionClose.M(1))
	return nil
}

func (c *logsConsumerGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	c.logger.Info("Starting consumer group", zap.Int32("partition", claim.Partition()))
	if !c.autocommitEnabled {
		defer session.Commit()
	}
	for {
		select {
		case message, ok := <-claim.Messages():
			if !ok {
				return nil
			}
			start := time.Now()
			c.logger.Debug("Kafka message claimed",
				zap.String("value", string(message.Value)),
				zap.Time("timestamp", message.Timestamp),
				zap.String("topic", message.Topic))
			if !c.messageMarking.After {
				session.MarkMessage(message, "")
			}

			ctx := c.obsrecv.StartLogsOp(session.Context())
			statsTags := []tag.Mutator{tag.Upsert(tagInstanceName, c.id.String())}
			_ = stats.RecordWithTags(
				ctx,
				statsTags,
				statMessageCount.M(1),
				statMessageOffset.M(message.Offset),
				statMessageOffsetLag.M(claim.HighWaterMarkOffset()-message.Offset-1))

			logs, err := c.unmarshaler.Unmarshal(message.Value)
			if err != nil {
				c.logger.Error("failed to unmarshal message", zap.Error(err))
				if c.messageMarking.After && c.messageMarking.OnError {
					session.MarkMessage(message, "")
				}
				return err
			}

			err = c.nextConsumer.ConsumeLogs(session.Context(), logs)
			// TODO
			c.obsrecv.EndLogsOp(ctx, c.unmarshaler.Encoding(), logs.LogRecordCount(), err)
			if err != nil {
				c.logger.Error("kafka receiver: failed to export logs", zap.Error(err), zap.Int32("partition", claim.Partition()), zap.String("topic", claim.Topic()))
				if c.messageMarking.After && c.messageMarking.OnError {
					session.MarkMessage(message, "")
				}
				return err
			}
			if c.messageMarking.After {
				session.MarkMessage(message, "")
			}
			if !c.autocommitEnabled {
				session.Commit()
			}
			err = stats.RecordWithTags(ctx, statsTags, processingTime.M(time.Since(start).Milliseconds()))
			if err != nil {
				c.logger.Error("failed to record processing time", zap.Error(err))
			}

		// Should return when `session.Context()` is done.
		// If not, will raise `ErrRebalanceInProgress` or `read tcp <ip>:<port>: i/o timeout` when kafka rebalance. see:
		// https://github.com/Shopify/sarama/issues/1192
		case <-session.Context().Done():
			return nil
		}
	}
}

func toSaramaInitialOffset(initialOffset string) (int64, error) {
	switch initialOffset {
	case offsetEarliest:
		return sarama.OffsetOldest, nil
	case offsetLatest:
		fallthrough
	case "":
		return sarama.OffsetNewest, nil
	default:
		return 0, errInvalidInitialOffset
	}
}

func setSaramaConsumerConfig(sc *sarama.Config, c *SaramaConsumerConfig) *sarama.Config {
	if c.ConsumerFetchMinBytes != 0 {
		sc.Consumer.Fetch.Min = c.ConsumerFetchMinBytes
	}
	if c.ConsumerFetchDefaultBytes != 0 {
		sc.Consumer.Fetch.Default = c.ConsumerFetchDefaultBytes
	}
	if c.ConsumerFetchMaxBytes != 0 {
		sc.Consumer.Fetch.Max = c.ConsumerFetchMaxBytes
		if c.ConsumerFetchMaxBytes > sarama.MaxResponseSize {
			// If the user has set a Consumer.Fetch.Max that is larger than the MaxResponseSize, then
			// set the MaxResponseSize to the Consumer.Fetch.Max.
			// If we dont do this, then sarama will reject messages > 100MB with a packet decoding error.
			sarama.MaxResponseSize = c.ConsumerFetchMaxBytes
		}
	}
	if c.MaxProcessingTime != 0 {
		sc.Consumer.MaxProcessingTime = c.MaxProcessingTime
	}
	if c.GroupSessionTimeout != 0 {
		sc.Consumer.Group.Session.Timeout = c.GroupSessionTimeout
	}
	if c.MessagesChannelSize != 0 {
		sc.ChannelBufferSize = c.MessagesChannelSize
	}
	return sc
}
