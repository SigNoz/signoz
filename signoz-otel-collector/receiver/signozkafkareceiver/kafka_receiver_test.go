// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/IBM/sarama"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opencensus.io/stats/view"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/config/configtls"
	"go.opentelemetry.io/collector/consumer/consumertest"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/receiver/receiverhelper"
	"go.opentelemetry.io/collector/receiver/receivertest"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zaptest/observer"

	"github.com/SigNoz/signoz-otel-collector/internal/coreinternal/testdata"
	"github.com/SigNoz/signoz-otel-collector/internal/coreinternal/textutils"
	"github.com/SigNoz/signoz-otel-collector/internal/kafka"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/kafkaexporter"
)

func TestNewTracesReceiver_version_err(t *testing.T) {
	c := Config{
		Encoding:        defaultEncoding,
		ProtocolVersion: "none",
	}
	r, err := newTracesReceiver(c, receivertest.NewNopCreateSettings(), defaultTracesUnmarshalers(), consumertest.NewNop())
	assert.Error(t, err)
	assert.Nil(t, r)
}

func TestNewTracesReceiver_encoding_err(t *testing.T) {
	c := Config{
		Encoding: "foo",
	}
	r, err := newTracesReceiver(c, receivertest.NewNopCreateSettings(), defaultTracesUnmarshalers(), consumertest.NewNop())
	require.Error(t, err)
	assert.Nil(t, r)
	assert.EqualError(t, err, errUnrecognizedEncoding.Error())
}

func TestNewTracesReceiver_err_auth_type(t *testing.T) {
	c := Config{
		ProtocolVersion: "2.0.0",
		Authentication: kafka.Authentication{
			TLS: &configtls.TLSClientSetting{
				TLSSetting: configtls.TLSSetting{
					CAFile: "/doesnotexist",
				},
			},
		},
		Encoding: defaultEncoding,
		Metadata: kafkaexporter.Metadata{
			Full: false,
		},
	}
	r, err := newTracesReceiver(c, receivertest.NewNopCreateSettings(), defaultTracesUnmarshalers(), consumertest.NewNop())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to load TLS config")
	assert.Nil(t, r)
}

func TestNewTracesReceiver_initial_offset_err(t *testing.T) {
	c := Config{
		InitialOffset: "foo",
		Encoding:      defaultEncoding,
	}
	r, err := newTracesReceiver(c, receivertest.NewNopCreateSettings(), defaultTracesUnmarshalers(), consumertest.NewNop())
	require.Error(t, err)
	assert.Nil(t, r)
	assert.EqualError(t, err, errInvalidInitialOffset.Error())
}

func TestTracesReceiverStart(t *testing.T) {
	c := kafkaTracesConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      receivertest.NewNopCreateSettings(),
		consumerGroup: &testConsumerGroup{},
	}

	require.NoError(t, c.Start(context.Background(), componenttest.NewNopHost()))
	require.NoError(t, c.Shutdown(context.Background()))
}

func TestTracesReceiverStartConsume(t *testing.T) {
	c := kafkaTracesConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      receivertest.NewNopCreateSettings(),
		consumerGroup: &testConsumerGroup{},
	}
	ctx, cancelFunc := context.WithCancel(context.Background())
	c.cancelConsumeLoop = cancelFunc
	require.NoError(t, c.Shutdown(context.Background()))
	err := c.consumeLoop(ctx, &tracesConsumerGroupHandler{
		ready: make(chan bool),
	})
	assert.EqualError(t, err, context.Canceled.Error())
}

func TestTracesReceiver_error(t *testing.T) {
	zcore, logObserver := observer.New(zapcore.ErrorLevel)
	logger := zap.New(zcore)
	settings := receivertest.NewNopCreateSettings()
	settings.Logger = logger

	expectedErr := errors.New("handler error")
	c := kafkaTracesConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      settings,
		consumerGroup: &testConsumerGroup{err: expectedErr},
	}

	require.NoError(t, c.Start(context.Background(), componenttest.NewNopHost()))
	require.NoError(t, c.Shutdown(context.Background()))
	assert.Eventually(t, func() bool {
		return logObserver.FilterField(zap.Error(expectedErr)).Len() > 0
	}, 10*time.Second, time.Millisecond*100)
}

func TestTracesConsumerGroupHandler(t *testing.T) {
	view.Unregister(MetricViews()...)
	views := MetricViews()
	require.NoError(t, view.Register(views...))
	defer view.Unregister(views...)

	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := tracesConsumerGroupHandler{
		unmarshaler:  newPdataTracesUnmarshaler(&ptrace.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	testSession := testConsumerGroupSession{ctx: context.Background()}
	require.NoError(t, c.Setup(testSession))
	_, ok := <-c.ready
	assert.False(t, ok)
	viewData, err := view.RetrieveData(statPartitionStart.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData := viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	require.NoError(t, c.Cleanup(testSession))
	viewData, err = view.RetrieveData(statPartitionClose.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData = viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	groupClaim := testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		require.NoError(t, c.ConsumeClaim(testSession, groupClaim))
		wg.Done()
	}()

	groupClaim.messageChan <- &sarama.ConsumerMessage{}
	close(groupClaim.messageChan)
	wg.Wait()
}

func TestTracesConsumerGroupHandler_session_done(t *testing.T) {
	view.Unregister(MetricViews()...)
	views := MetricViews()
	require.NoError(t, view.Register(views...))
	defer view.Unregister(views...)

	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := tracesConsumerGroupHandler{
		unmarshaler:  newPdataTracesUnmarshaler(&ptrace.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	ctx, cancelFunc := context.WithCancel(context.Background())
	testSession := testConsumerGroupSession{ctx: ctx}
	require.NoError(t, c.Setup(testSession))
	_, ok := <-c.ready
	assert.False(t, ok)
	viewData, err := view.RetrieveData(statPartitionStart.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData := viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	require.NoError(t, c.Cleanup(testSession))
	viewData, err = view.RetrieveData(statPartitionClose.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData = viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	groupClaim := testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	defer close(groupClaim.messageChan)

	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		require.NoError(t, c.ConsumeClaim(testSession, groupClaim))
		wg.Done()
	}()

	groupClaim.messageChan <- &sarama.ConsumerMessage{}
	cancelFunc()
	wg.Wait()
}

func TestTracesConsumerGroupHandler_error_unmarshal(t *testing.T) {
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := tracesConsumerGroupHandler{
		unmarshaler:  newPdataTracesUnmarshaler(&ptrace.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	groupClaim := &testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	go func() {
		err := c.ConsumeClaim(testConsumerGroupSession{ctx: context.Background()}, groupClaim)
		require.Error(t, err)
		wg.Done()
	}()
	groupClaim.messageChan <- &sarama.ConsumerMessage{Value: []byte("!@#")}
	close(groupClaim.messageChan)
	wg.Wait()
}

func TestTracesConsumerGroupHandler_error_nextConsumer(t *testing.T) {
	consumerError := errors.New("failed to consume")
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := tracesConsumerGroupHandler{
		unmarshaler:  newPdataTracesUnmarshaler(&ptrace.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewErr(consumerError),
		obsrecv:      obsrecv,
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	groupClaim := &testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	go func() {
		e := c.ConsumeClaim(testConsumerGroupSession{ctx: context.Background()}, groupClaim)
		assert.EqualError(t, e, consumerError.Error())
		wg.Done()
	}()

	td := ptrace.NewTraces()
	td.ResourceSpans().AppendEmpty()
	unmarshaler := &ptrace.ProtoMarshaler{}
	bts, err := unmarshaler.MarshalTraces(td)
	require.NoError(t, err)
	groupClaim.messageChan <- &sarama.ConsumerMessage{Value: bts}
	close(groupClaim.messageChan)
	wg.Wait()
}

func TestNewMetricsReceiver_version_err(t *testing.T) {
	c := Config{
		Encoding:        defaultEncoding,
		ProtocolVersion: "none",
	}
	r, err := newMetricsReceiver(c, receivertest.NewNopCreateSettings(), defaultMetricsUnmarshalers(), consumertest.NewNop())
	assert.Error(t, err)
	assert.Nil(t, r)
}

func TestNewMetricsReceiver_encoding_err(t *testing.T) {
	c := Config{
		Encoding: "foo",
	}
	r, err := newMetricsReceiver(c, receivertest.NewNopCreateSettings(), defaultMetricsUnmarshalers(), consumertest.NewNop())
	require.Error(t, err)
	assert.Nil(t, r)
	assert.EqualError(t, err, errUnrecognizedEncoding.Error())
}

func TestNewMetricsExporter_err_auth_type(t *testing.T) {
	c := Config{
		ProtocolVersion: "2.0.0",
		Authentication: kafka.Authentication{
			TLS: &configtls.TLSClientSetting{
				TLSSetting: configtls.TLSSetting{
					CAFile: "/doesnotexist",
				},
			},
		},
		Encoding: defaultEncoding,
		Metadata: kafkaexporter.Metadata{
			Full: false,
		},
	}
	r, err := newMetricsReceiver(c, receivertest.NewNopCreateSettings(), defaultMetricsUnmarshalers(), consumertest.NewNop())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to load TLS config")
	assert.Nil(t, r)
}

func TestNewMetricsReceiver_initial_offset_err(t *testing.T) {
	c := Config{
		InitialOffset: "foo",
		Encoding:      defaultEncoding,
	}
	r, err := newMetricsReceiver(c, receivertest.NewNopCreateSettings(), defaultMetricsUnmarshalers(), consumertest.NewNop())
	require.Error(t, err)
	assert.Nil(t, r)
	assert.EqualError(t, err, errInvalidInitialOffset.Error())
}

func TestMetricsReceiverStart(t *testing.T) {
	c := kafkaMetricsConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      receivertest.NewNopCreateSettings(),
		consumerGroup: &testConsumerGroup{},
	}

	require.NoError(t, c.Start(context.Background(), componenttest.NewNopHost()))
	require.NoError(t, c.Shutdown(context.Background()))
}

func TestMetricsReceiverStartConsume(t *testing.T) {
	c := kafkaMetricsConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      receivertest.NewNopCreateSettings(),
		consumerGroup: &testConsumerGroup{},
	}
	ctx, cancelFunc := context.WithCancel(context.Background())
	c.cancelConsumeLoop = cancelFunc
	require.NoError(t, c.Shutdown(context.Background()))
	err := c.consumeLoop(ctx, &logsConsumerGroupHandler{
		ready: make(chan bool),
	})
	assert.EqualError(t, err, context.Canceled.Error())
}

func TestMetricsReceiver_error(t *testing.T) {
	zcore, logObserver := observer.New(zapcore.ErrorLevel)
	logger := zap.New(zcore)
	settings := receivertest.NewNopCreateSettings()
	settings.Logger = logger

	expectedErr := errors.New("handler error")
	c := kafkaMetricsConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      settings,
		consumerGroup: &testConsumerGroup{err: expectedErr},
	}

	require.NoError(t, c.Start(context.Background(), componenttest.NewNopHost()))
	require.NoError(t, c.Shutdown(context.Background()))
	assert.Eventually(t, func() bool {
		return logObserver.FilterField(zap.Error(expectedErr)).Len() > 0
	}, 10*time.Second, time.Millisecond*100)
}

func TestMetricsConsumerGroupHandler(t *testing.T) {
	view.Unregister(MetricViews()...)
	views := MetricViews()
	require.NoError(t, view.Register(views...))
	defer view.Unregister(views...)

	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := metricsConsumerGroupHandler{
		unmarshaler:  newPdataMetricsUnmarshaler(&pmetric.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	testSession := testConsumerGroupSession{ctx: context.Background()}
	require.NoError(t, c.Setup(testSession))
	_, ok := <-c.ready
	assert.False(t, ok)
	viewData, err := view.RetrieveData(statPartitionStart.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData := viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	require.NoError(t, c.Cleanup(testSession))
	viewData, err = view.RetrieveData(statPartitionClose.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData = viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	groupClaim := testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		require.NoError(t, c.ConsumeClaim(testSession, groupClaim))
		wg.Done()
	}()

	groupClaim.messageChan <- &sarama.ConsumerMessage{}
	close(groupClaim.messageChan)
	wg.Wait()
}

func TestMetricsConsumerGroupHandler_session_done(t *testing.T) {
	view.Unregister(MetricViews()...)
	views := MetricViews()
	require.NoError(t, view.Register(views...))
	defer view.Unregister(views...)

	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := metricsConsumerGroupHandler{
		unmarshaler:  newPdataMetricsUnmarshaler(&pmetric.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	ctx, cancelFunc := context.WithCancel(context.Background())
	testSession := testConsumerGroupSession{ctx: ctx}
	require.NoError(t, c.Setup(testSession))
	_, ok := <-c.ready
	assert.False(t, ok)
	viewData, err := view.RetrieveData(statPartitionStart.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData := viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	require.NoError(t, c.Cleanup(testSession))
	viewData, err = view.RetrieveData(statPartitionClose.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData = viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	groupClaim := testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	defer close(groupClaim.messageChan)
	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		require.NoError(t, c.ConsumeClaim(testSession, groupClaim))
		wg.Done()
	}()

	groupClaim.messageChan <- &sarama.ConsumerMessage{}
	cancelFunc()
	wg.Wait()
}

func TestMetricsConsumerGroupHandler_error_unmarshal(t *testing.T) {
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := metricsConsumerGroupHandler{
		unmarshaler:  newPdataMetricsUnmarshaler(&pmetric.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	groupClaim := &testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	go func() {
		err := c.ConsumeClaim(testConsumerGroupSession{ctx: context.Background()}, groupClaim)
		require.Error(t, err)
		wg.Done()
	}()
	groupClaim.messageChan <- &sarama.ConsumerMessage{Value: []byte("!@#")}
	close(groupClaim.messageChan)
	wg.Wait()
}

func TestMetricsConsumerGroupHandler_error_nextConsumer(t *testing.T) {
	consumerError := errors.New("failed to consume")
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := metricsConsumerGroupHandler{
		unmarshaler:  newPdataMetricsUnmarshaler(&pmetric.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewErr(consumerError),
		obsrecv:      obsrecv,
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	groupClaim := &testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	go func() {
		e := c.ConsumeClaim(testConsumerGroupSession{ctx: context.Background()}, groupClaim)
		assert.EqualError(t, e, consumerError.Error())
		wg.Done()
	}()

	ld := testdata.GenerateMetricsOneMetric()
	unmarshaler := &pmetric.ProtoMarshaler{}
	bts, err := unmarshaler.MarshalMetrics(ld)
	require.NoError(t, err)
	groupClaim.messageChan <- &sarama.ConsumerMessage{Value: bts}
	close(groupClaim.messageChan)
	wg.Wait()
}

func TestNewLogsReceiver_version_err(t *testing.T) {
	c := Config{
		Encoding:        defaultEncoding,
		ProtocolVersion: "none",
	}
	r, err := newLogsReceiver(c, receivertest.NewNopCreateSettings(), defaultLogsUnmarshalers(), consumertest.NewNop())
	assert.Error(t, err)
	assert.Nil(t, r)
}

func TestNewLogsReceiver_encoding_err(t *testing.T) {
	c := Config{
		Encoding: "foo",
	}
	r, err := newLogsReceiver(c, receivertest.NewNopCreateSettings(), defaultLogsUnmarshalers(), consumertest.NewNop())
	require.Error(t, err)
	assert.Nil(t, r)
	assert.EqualError(t, err, errUnrecognizedEncoding.Error())
}

func TestNewLogsExporter_err_auth_type(t *testing.T) {
	c := Config{
		ProtocolVersion: "2.0.0",
		Authentication: kafka.Authentication{
			TLS: &configtls.TLSClientSetting{
				TLSSetting: configtls.TLSSetting{
					CAFile: "/doesnotexist",
				},
			},
		},
		Encoding: defaultEncoding,
		Metadata: kafkaexporter.Metadata{
			Full: false,
		},
	}
	r, err := newLogsReceiver(c, receivertest.NewNopCreateSettings(), defaultLogsUnmarshalers(), consumertest.NewNop())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to load TLS config")
	assert.Nil(t, r)
}

func TestNewLogsReceiver_initial_offset_err(t *testing.T) {
	c := Config{
		InitialOffset: "foo",
		Encoding:      defaultEncoding,
	}
	r, err := newLogsReceiver(c, receivertest.NewNopCreateSettings(), defaultLogsUnmarshalers(), consumertest.NewNop())
	require.Error(t, err)
	assert.Nil(t, r)
	assert.EqualError(t, err, errInvalidInitialOffset.Error())
}

func TestLogsReceiverStart(t *testing.T) {
	c := kafkaLogsConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      receivertest.NewNopCreateSettings(),
		consumerGroup: &testConsumerGroup{},
	}

	require.NoError(t, c.Start(context.Background(), componenttest.NewNopHost()))
	require.NoError(t, c.Shutdown(context.Background()))
}

func TestLogsReceiverStartConsume(t *testing.T) {
	c := kafkaLogsConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      receivertest.NewNopCreateSettings(),
		consumerGroup: &testConsumerGroup{},
	}
	ctx, cancelFunc := context.WithCancel(context.Background())
	c.cancelConsumeLoop = cancelFunc
	require.NoError(t, c.Shutdown(context.Background()))
	err := c.consumeLoop(ctx, &logsConsumerGroupHandler{
		ready: make(chan bool),
	})
	assert.EqualError(t, err, context.Canceled.Error())
}

func TestLogsReceiver_error(t *testing.T) {
	zcore, logObserver := observer.New(zapcore.ErrorLevel)
	logger := zap.New(zcore)
	settings := receivertest.NewNopCreateSettings()
	settings.Logger = logger

	expectedErr := errors.New("handler error")
	c := kafkaLogsConsumer{
		nextConsumer:  consumertest.NewNop(),
		settings:      settings,
		consumerGroup: &testConsumerGroup{err: expectedErr},
	}

	require.NoError(t, c.Start(context.Background(), componenttest.NewNopHost()))
	require.NoError(t, c.Shutdown(context.Background()))
	assert.Eventually(t, func() bool {
		return logObserver.FilterField(zap.Error(expectedErr)).Len() > 0
	}, 10*time.Second, time.Millisecond*100)
}

func TestLogsConsumerGroupHandler(t *testing.T) {
	view.Unregister(MetricViews()...)
	views := MetricViews()
	require.NoError(t, view.Register(views...))
	defer view.Unregister(views...)

	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := logsConsumerGroupHandler{
		unmarshaler:  newPdataLogsUnmarshaler(&plog.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	testSession := testConsumerGroupSession{ctx: context.Background()}
	require.NoError(t, c.Setup(testSession))
	_, ok := <-c.ready
	assert.False(t, ok)
	viewData, err := view.RetrieveData(statPartitionStart.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData := viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	require.NoError(t, c.Cleanup(testSession))
	viewData, err = view.RetrieveData(statPartitionClose.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData = viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	groupClaim := testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		require.NoError(t, c.ConsumeClaim(testSession, groupClaim))
		wg.Done()
	}()

	groupClaim.messageChan <- &sarama.ConsumerMessage{}
	close(groupClaim.messageChan)
	wg.Wait()
}

func TestLogsConsumerGroupHandler_session_done(t *testing.T) {
	view.Unregister(MetricViews()...)
	views := MetricViews()
	require.NoError(t, view.Register(views...))
	defer view.Unregister(views...)

	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := logsConsumerGroupHandler{
		unmarshaler:  newPdataLogsUnmarshaler(&plog.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	ctx, cancelFunc := context.WithCancel(context.Background())
	testSession := testConsumerGroupSession{ctx: ctx}
	require.NoError(t, c.Setup(testSession))
	_, ok := <-c.ready
	assert.False(t, ok)
	viewData, err := view.RetrieveData(statPartitionStart.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData := viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	require.NoError(t, c.Cleanup(testSession))
	viewData, err = view.RetrieveData(statPartitionClose.Name())
	require.NoError(t, err)
	assert.Equal(t, 1, len(viewData))
	distData = viewData[0].Data.(*view.SumData)
	assert.Equal(t, float64(1), distData.Value)

	groupClaim := testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	defer close(groupClaim.messageChan)
	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		require.NoError(t, c.ConsumeClaim(testSession, groupClaim))
		wg.Done()
	}()

	groupClaim.messageChan <- &sarama.ConsumerMessage{}
	cancelFunc()
	wg.Wait()
}

func TestLogsConsumerGroupHandler_error_unmarshal(t *testing.T) {
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := logsConsumerGroupHandler{
		unmarshaler:  newPdataLogsUnmarshaler(&plog.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewNop(),
		obsrecv:      obsrecv,
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	groupClaim := &testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	go func() {
		err := c.ConsumeClaim(testConsumerGroupSession{ctx: context.Background()}, groupClaim)
		require.Error(t, err)
		wg.Done()
	}()
	groupClaim.messageChan <- &sarama.ConsumerMessage{Value: []byte("!@#")}
	close(groupClaim.messageChan)
	wg.Wait()
}

func TestLogsConsumerGroupHandler_error_nextConsumer(t *testing.T) {
	consumerError := errors.New("failed to consume")
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
	require.NoError(t, err)
	c := logsConsumerGroupHandler{
		unmarshaler:  newPdataLogsUnmarshaler(&plog.ProtoUnmarshaler{}, defaultEncoding),
		logger:       zap.NewNop(),
		ready:        make(chan bool),
		nextConsumer: consumertest.NewErr(consumerError),
		obsrecv:      obsrecv,
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	groupClaim := &testConsumerGroupClaim{
		messageChan: make(chan *sarama.ConsumerMessage),
	}
	go func() {
		e := c.ConsumeClaim(testConsumerGroupSession{ctx: context.Background()}, groupClaim)
		assert.EqualError(t, e, consumerError.Error())
		wg.Done()
	}()

	ld := testdata.GenerateLogsOneLogRecord()
	unmarshaler := &plog.ProtoMarshaler{}
	bts, err := unmarshaler.MarshalLogs(ld)
	require.NoError(t, err)
	groupClaim.messageChan <- &sarama.ConsumerMessage{Value: bts}
	close(groupClaim.messageChan)
	wg.Wait()
}

// Test unmarshaler for different charsets and encodings.
func TestLogsConsumerGroupHandler_unmarshal_text(t *testing.T) {
	tests := []struct {
		name string
		text string
		enc  string
	}{
		{
			name: "unmarshal test for Englist (ASCII characters) with text_utf8",
			text: "ASCII characters test",
			enc:  "utf8",
		},
		{
			name: "unmarshal test for unicode with text_utf8",
			text: "UTF8 测试 測試 テスト 테스트 ☺️",
			enc:  "utf8",
		},
		{
			name: "unmarshal test for Simplified Chinese with text_gbk",
			text: "GBK 简体中文解码测试",
			enc:  "gbk",
		},
		{
			name: "unmarshal test for Japanese with text_shift_jis",
			text: "Shift_JIS 日本のデコードテスト",
			enc:  "shift_jis",
		},
		{
			name: "unmarshal test for Korean with text_euc-kr",
			text: "EUC-KR 한국 디코딩 테스트",
			enc:  "euc-kr",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{ReceiverCreateSettings: receivertest.NewNopCreateSettings()})
			require.NoError(t, err)
			unmarshaler := newTextLogsUnmarshaler()
			unmarshaler, err = unmarshaler.WithEnc(test.enc)
			require.NoError(t, err)
			sink := &consumertest.LogsSink{}
			c := logsConsumerGroupHandler{
				unmarshaler:  unmarshaler,
				logger:       zap.NewNop(),
				ready:        make(chan bool),
				nextConsumer: sink,
				obsrecv:      obsrecv,
			}

			wg := sync.WaitGroup{}
			wg.Add(1)
			groupClaim := &testConsumerGroupClaim{
				messageChan: make(chan *sarama.ConsumerMessage),
			}
			go func() {
				err = c.ConsumeClaim(testConsumerGroupSession{ctx: context.Background()}, groupClaim)
				assert.NoError(t, err)
				wg.Done()
			}()
			encCfg := textutils.NewEncodingConfig()
			encCfg.Encoding = test.enc
			enc, err := encCfg.Build()
			require.NoError(t, err)
			encoder := enc.Encoding.NewEncoder()
			encoded, err := encoder.Bytes([]byte(test.text))
			require.NoError(t, err)
			t1 := time.Now()
			groupClaim.messageChan <- &sarama.ConsumerMessage{Value: encoded}
			close(groupClaim.messageChan)
			wg.Wait()
			require.Equal(t, sink.LogRecordCount(), 1)
			log := sink.AllLogs()[0].ResourceLogs().At(0).ScopeLogs().At(0).LogRecords().At(0)
			assert.Equal(t, log.Body().Str(), test.text)
			assert.LessOrEqual(t, t1, log.ObservedTimestamp().AsTime())
			assert.LessOrEqual(t, log.ObservedTimestamp().AsTime(), time.Now())
		})
	}
}

func TestGetLogsUnmarshaler_encoding_text(t *testing.T) {
	tests := []struct {
		name     string
		encoding string
	}{
		{
			name:     "default text encoding",
			encoding: "text",
		},
		{
			name:     "utf-8 text encoding",
			encoding: "text_utf-8",
		},
		{
			name:     "gbk text encoding",
			encoding: "text_gbk",
		},
		{
			name:     "shift_jis text encoding, which contains an underline",
			encoding: "text_shift_jis",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := getLogsUnmarshaler(test.encoding, defaultLogsUnmarshalers())
			assert.NoError(t, err)
		})
	}
}

func TestGetLogsUnmarshaler_encoding_text_error(t *testing.T) {
	tests := []struct {
		name     string
		encoding string
	}{
		{
			name:     "text encoding has typo",
			encoding: "text_uft-8",
		},
		{
			name:     "text encoding is a random string",
			encoding: "text_vnbqgoba156",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := getLogsUnmarshaler(test.encoding, defaultLogsUnmarshalers())
			assert.ErrorContains(t, err, fmt.Sprintf("unsupported encoding '%v'", test.encoding[5:]))
		})
	}
}

func TestCreateLogsReceiver_encoding_text_error(t *testing.T) {
	cfg := Config{
		Encoding: "text_uft-8",
	}
	_, err := newLogsReceiver(cfg, receivertest.NewNopCreateSettings(), defaultLogsUnmarshalers(), consumertest.NewNop())
	// encoding error comes first
	assert.Error(t, err, "unsupported encoding")
}

func TestToSaramaInitialOffset_earliest(t *testing.T) {
	saramaInitialOffset, err := toSaramaInitialOffset(offsetEarliest)

	require.NoError(t, err)
	assert.Equal(t, sarama.OffsetOldest, saramaInitialOffset)
}

func TestToSaramaInitialOffset_latest(t *testing.T) {
	saramaInitialOffset, err := toSaramaInitialOffset(offsetLatest)

	require.NoError(t, err)
	assert.Equal(t, sarama.OffsetNewest, saramaInitialOffset)
}

func TestToSaramaInitialOffset_default(t *testing.T) {
	saramaInitialOffset, err := toSaramaInitialOffset("")

	require.NoError(t, err)
	assert.Equal(t, sarama.OffsetNewest, saramaInitialOffset)
}

func TestToSaramaInitialOffset_invalid(t *testing.T) {
	_, err := toSaramaInitialOffset("other")

	assert.Equal(t, err, errInvalidInitialOffset)
}

type testConsumerGroupClaim struct {
	messageChan chan *sarama.ConsumerMessage
}

var _ sarama.ConsumerGroupClaim = (*testConsumerGroupClaim)(nil)

const (
	testTopic               = "otlp_spans"
	testPartition           = 5
	testInitialOffset       = 6
	testHighWatermarkOffset = 4
)

func (t testConsumerGroupClaim) Topic() string {
	return testTopic
}

func (t testConsumerGroupClaim) Partition() int32 {
	return testPartition
}

func (t testConsumerGroupClaim) InitialOffset() int64 {
	return testInitialOffset
}

func (t testConsumerGroupClaim) HighWaterMarkOffset() int64 {
	return testHighWatermarkOffset
}

func (t testConsumerGroupClaim) Messages() <-chan *sarama.ConsumerMessage {
	return t.messageChan
}

type testConsumerGroupSession struct {
	ctx context.Context
}

func (t testConsumerGroupSession) Commit() {
}

var _ sarama.ConsumerGroupSession = (*testConsumerGroupSession)(nil)

func (t testConsumerGroupSession) Claims() map[string][]int32 {
	panic("implement me")
}

func (t testConsumerGroupSession) MemberID() string {
	panic("implement me")
}

func (t testConsumerGroupSession) GenerationID() int32 {
	panic("implement me")
}

func (t testConsumerGroupSession) MarkOffset(string, int32, int64, string) {
}

func (t testConsumerGroupSession) ResetOffset(string, int32, int64, string) {
	panic("implement me")
}

func (t testConsumerGroupSession) MarkMessage(*sarama.ConsumerMessage, string) {}

func (t testConsumerGroupSession) Context() context.Context {
	return t.ctx
}

type testConsumerGroup struct {
	once sync.Once
	err  error
}

var _ sarama.ConsumerGroup = (*testConsumerGroup)(nil)

func (t *testConsumerGroup) Consume(ctx context.Context, _ []string, handler sarama.ConsumerGroupHandler) error {
	t.once.Do(func() {
		_ = handler.Setup(testConsumerGroupSession{ctx: ctx})
	})
	return t.err
}

func (t *testConsumerGroup) Errors() <-chan error {
	panic("implement me")
}

func (t *testConsumerGroup) Close() error {
	return nil
}

func (t *testConsumerGroup) Pause(_ map[string][]int32) {
	panic("implement me")
}

func (t *testConsumerGroup) PauseAll() {
	panic("implement me")
}

func (t *testConsumerGroup) Resume(_ map[string][]int32) {
	panic("implement me")
}

func (t *testConsumerGroup) ResumeAll() {
	panic("implement me")
}
