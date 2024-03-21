// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package signozspanmetricsprocessor

import (
	"bytes"
	"context"
	"fmt"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/config/configgrpc"
	"go.opentelemetry.io/collector/consumer/consumertest"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/exporter/exportertest"
	"go.opentelemetry.io/collector/exporter/otlpexporter"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/processor/processortest"
	conventions "go.opentelemetry.io/collector/semconv/v1.6.1"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
	"go.uber.org/zap/zaptest/observer"
	"google.golang.org/grpc/metadata"

	"github.com/SigNoz/signoz-otel-collector/processor/signozspanmetricsprocessor/internal/cache"
	"github.com/SigNoz/signoz-otel-collector/processor/signozspanmetricsprocessor/mocks"
)

const (
	stringAttrName         = "stringAttrName"
	intAttrName            = "intAttrName"
	doubleAttrName         = "doubleAttrName"
	boolAttrName           = "boolAttrName"
	nullAttrName           = "nullAttrName"
	mapAttrName            = "mapAttrName"
	arrayAttrName          = "arrayAttrName"
	notInSpanAttrName0     = "shouldBeInMetric"
	notInSpanAttrName1     = "shouldNotBeInMetric"
	regionResourceAttrName = "region"
	conflictResourceAttr   = "host.name"
	DimensionsCacheSize    = 2

	sampleRegion          = "us-east-1"
	sampleConflictingHost = "conflicting-host"
	sampleLatency         = float64(11)
	sampleLatencyDuration = time.Duration(sampleLatency) * time.Millisecond
)

var (
	testID = "test-instance-id"
)

// metricID represents the minimum attributes that uniquely identifies a metric in our tests.
type metricID struct {
	service    string
	operation  string
	kind       string
	statusCode string
}

type metricDataPoint interface {
	Attributes() pcommon.Map
}

type serviceSpans struct {
	serviceName string
	spans       []span
}

type span struct {
	operation  string
	kind       ptrace.SpanKind
	statusCode ptrace.StatusCode
}

func TestProcessorStart(t *testing.T) {
	// Create otlp exporters.
	componentID, mexp, texp := newOTLPExporters(t)

	for _, tc := range []struct {
		name            string
		exporter        component.Component
		metricsExporter string
		wantErrorMsg    string
	}{
		{"export to active otlp metrics exporter", mexp, "otlp", ""},
		{"unable to find configured exporter in active exporter list", mexp, "prometheus", "failed to find metrics exporter: 'prometheus'; please configure metrics_exporter from one of: [otlp]"},
		{"export to active otlp traces exporter should error", texp, "otlp", "the exporter \"otlp\" isn't a metrics exporter"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// Prepare
			exporters := map[component.DataType]map[component.ID]component.Component{
				component.DataTypeMetrics: {
					componentID: tc.exporter,
				},
			}
			mhost := &mocks.Host{}
			mhost.On("GetExporters").Return(exporters)

			// Create spanmetrics processor
			factory := NewFactory()
			cfg := factory.CreateDefaultConfig().(*Config)
			cfg.MetricsExporter = tc.metricsExporter

			procCreationParams := processortest.NewNopCreateSettings()
			traceProcessor, err := factory.CreateTracesProcessor(context.Background(), procCreationParams, cfg, consumertest.NewNop())
			require.NoError(t, err)

			// Test
			smp := traceProcessor.(*processorImp)
			err = smp.Start(context.Background(), mhost)

			// Verify
			if tc.wantErrorMsg != "" {
				assert.EqualError(t, err, tc.wantErrorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestProcessorShutdown(t *testing.T) {
	// Prepare
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)

	// Test
	next := new(consumertest.TracesSink)
	p, err := newProcessor(zaptest.NewLogger(t), testID, cfg, nil)
	p.tracesConsumer = next
	assert.NoError(t, err)
	err = p.Shutdown(context.Background())

	// Verify
	assert.NoError(t, err)
}

func TestConfigureLatencyBounds(t *testing.T) {
	// Prepare
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)
	cfg.LatencyHistogramBuckets = []time.Duration{
		3 * time.Nanosecond,
		3 * time.Microsecond,
		3 * time.Millisecond,
		3 * time.Second,
	}

	// Test
	next := new(consumertest.TracesSink)
	p, err := newProcessor(zaptest.NewLogger(t), testID, cfg, nil)
	p.tracesConsumer = next

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, p)
	assert.Equal(t, []float64{0.000003, 0.003, 3, 3000}, p.latencyBounds)
}

func TestProcessorCapabilities(t *testing.T) {
	// Prepare
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)

	// Test
	next := new(consumertest.TracesSink)
	p, err := newProcessor(zaptest.NewLogger(t), testID, cfg, nil)
	p.tracesConsumer = next
	assert.NoError(t, err)
	caps := p.Capabilities()

	// Verify
	assert.NotNil(t, p)
	assert.Equal(t, false, caps.MutatesData)
}

func TestProcessorConsumeTracesErrors(t *testing.T) {
	for _, tc := range []struct {
		name              string
		consumeMetricsErr error
		consumeTracesErr  error
	}{
		{
			name: "ConsumeMetrics error",
		},
		{
			name:             "ConsumeTraces error",
			consumeTracesErr: fmt.Errorf("consume traces error"),
		},
		{
			name:             "ConsumeMetrics and ConsumeTraces error",
			consumeTracesErr: fmt.Errorf("consume traces error"),
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// Prepare
			logger := zap.NewNop()

			mexp := &mocks.MetricsExporter{}
			mexp.On("ConsumeMetrics", mock.Anything, mock.Anything).Return(tc.consumeMetricsErr)

			tcon := &mocks.TracesConsumer{}
			tcon.On("ConsumeTraces", mock.Anything, mock.Anything).Return(tc.consumeTracesErr)

			p := newProcessorImp(mexp, tcon, nil, cumulative, logger, []ExcludePattern{})

			traces := buildSampleTrace()

			// Test
			ctx := metadata.NewIncomingContext(context.Background(), nil)
			err := p.ConsumeTraces(ctx, traces)

			switch {
			case tc.consumeMetricsErr != nil && tc.consumeTracesErr != nil:
				assert.EqualError(t, err, tc.consumeMetricsErr.Error()+"; "+tc.consumeTracesErr.Error())
			case tc.consumeMetricsErr != nil:
				assert.EqualError(t, err, tc.consumeMetricsErr.Error())
			case tc.consumeTracesErr != nil:
				assert.EqualError(t, err, tc.consumeTracesErr.Error())
			}
		})
	}
}

func TestProcessorConsumeTraces(t *testing.T) {
	t.Parallel()

	testcases := []struct {
		name                   string
		aggregationTemporality string
		verifier               func(t testing.TB, input pmetric.Metrics) bool
		traces                 []ptrace.Traces
	}{
		{
			name:                   "Test single consumption, three spans (Cumulative).",
			aggregationTemporality: cumulative,
			verifier:               verifyConsumeMetricsInputCumulative,
			traces:                 []ptrace.Traces{buildSampleTrace()},
		},
		{
			name:                   "Test single consumption, three spans (Delta).",
			aggregationTemporality: delta,
			verifier:               verifyConsumeMetricsInputDelta,
			traces:                 []ptrace.Traces{buildSampleTrace()},
		},
		{
			// More consumptions, should accumulate additively.
			name:                   "Test two consumptions (Cumulative).",
			aggregationTemporality: cumulative,
			verifier:               verifyMultipleCumulativeConsumptions(),
			traces:                 []ptrace.Traces{buildSampleTrace(), buildSampleTrace()},
		},
		{
			// More consumptions, should not accumulate. Therefore, end state should be the same as single consumption case.
			name:                   "Test two consumptions (Delta).",
			aggregationTemporality: delta,
			verifier:               verifyConsumeMetricsInputDelta,
			traces:                 []ptrace.Traces{buildSampleTrace(), buildSampleTrace()},
		},
		{
			// Consumptions with improper timestamps
			name:                   "Test bad consumptions (Delta).",
			aggregationTemporality: cumulative,
			verifier:               verifyBadMetricsOkay,
			traces:                 []ptrace.Traces{buildBadSampleTrace()},
		},
	}

	for _, tc := range testcases {
		// Since parallelism is enabled in these tests, to avoid flaky behavior,
		// instantiate a copy of the test case for t.Run's closure to use.
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			// Prepare
			mexp := &mocks.MetricsExporter{}
			tcon := &mocks.TracesConsumer{}

			// Mocked metric exporter will perform validation on metrics, during p.ConsumeTraces()
			mexp.On("ConsumeMetrics", mock.Anything, mock.MatchedBy(func(input pmetric.Metrics) bool {
				return assert.Eventually(t, func() bool {
					return tc.verifier(t, input)
				}, 10*time.Second, time.Millisecond*100)
			})).Return(nil)
			tcon.On("ConsumeTraces", mock.Anything, mock.Anything).Return(nil)

			defaultNullValue := pcommon.NewValueStr("defaultNullValue")
			p := newProcessorImp(mexp, tcon, &defaultNullValue, tc.aggregationTemporality, zaptest.NewLogger(t), []ExcludePattern{})

			for _, traces := range tc.traces {
				// Test
				ctx := metadata.NewIncomingContext(context.Background(), nil)
				err := p.ConsumeTraces(ctx, traces)

				// Verify
				assert.NoError(t, err)
			}
		})
	}
}

func TestMetricKeyCache(t *testing.T) {
	mexp := &mocks.MetricsExporter{}
	tcon := &mocks.TracesConsumer{}

	mexp.On("ConsumeMetrics", mock.Anything, mock.Anything).Return(nil)
	tcon.On("ConsumeTraces", mock.Anything, mock.Anything).Return(nil)

	defaultNullValue := pcommon.NewValueStr("defaultNullValue")
	p := newProcessorImp(mexp, tcon, &defaultNullValue, cumulative, zaptest.NewLogger(t), []ExcludePattern{})
	traces := buildSampleTrace()

	// Test
	ctx := metadata.NewIncomingContext(context.Background(), nil)

	// 0 key was cached at beginning
	assert.Zero(t, p.metricKeyToDimensions.Len())

	err := p.ConsumeTraces(ctx, traces)
	// Validate
	require.NoError(t, err)
	// 2 key was cached, 1 key was evicted and cleaned after the processing
	assert.Eventually(t, func() bool {
		return assert.Equal(t, DimensionsCacheSize, p.metricKeyToDimensions.Len())
	}, 10*time.Second, time.Millisecond*100)

	// consume another batch of traces
	err = p.ConsumeTraces(ctx, traces)
	require.NoError(t, err)

	// 2 key was cached, other keys were evicted and cleaned after the processing
	assert.Eventually(t, func() bool {
		return assert.Equal(t, DimensionsCacheSize, p.metricKeyToDimensions.Len())
	}, 10*time.Second, time.Millisecond*100)
}

func TestExcludePatternSkips(t *testing.T) {
	mexp := &mocks.MetricsExporter{}
	tcon := &mocks.TracesConsumer{}

	mexp.On("ConsumeMetrics", mock.Anything, mock.Anything).Return(nil)
	tcon.On("ConsumeTraces", mock.Anything, mock.Anything).Return(nil)

	observedZapCore, observedLogs := observer.New(zap.DebugLevel)
	observedLogger := zap.New(observedZapCore)

	defaultNullValue := pcommon.NewValueStr("defaultNullValue")
	p := newProcessorImp(mexp, tcon, &defaultNullValue, cumulative, observedLogger, []ExcludePattern{
		{
			Name:    "operation",
			Pattern: "p*",
		},
	})

	traces := buildSampleTrace()

	// Test
	ctx := metadata.NewIncomingContext(context.Background(), nil)
	err := p.ConsumeTraces(ctx, traces)

	assert.NoError(t, err)
	found := false
	for _, log := range observedLogs.All() {
		if strings.Contains(log.Message, "Skipping span") {
			found = true
		}
	}
	assert.True(t, found)
}

func BenchmarkProcessorConsumeTraces(b *testing.B) {
	// Prepare
	mexp := &mocks.MetricsExporter{}
	tcon := &mocks.TracesConsumer{}

	mexp.On("ConsumeMetrics", mock.Anything, mock.Anything).Return(nil)
	tcon.On("ConsumeTraces", mock.Anything, mock.Anything).Return(nil)

	defaultNullValue := pcommon.NewValueStr("defaultNullValue")
	p := newProcessorImp(mexp, tcon, &defaultNullValue, cumulative, zaptest.NewLogger(b), []ExcludePattern{})

	traces := buildSampleTrace()

	// Test
	ctx := metadata.NewIncomingContext(context.Background(), nil)
	for n := 0; n < b.N; n++ {
		assert.NoError(b, p.ConsumeTraces(ctx, traces))
	}
}

func newProcessorImp(mexp *mocks.MetricsExporter, tcon *mocks.TracesConsumer, defaultNullValue *pcommon.Value, temporality string, logger *zap.Logger, excludePatterns []ExcludePattern) *processorImp {
	defaultNotInSpanAttrVal := pcommon.NewValueStr("defaultNotInSpanAttrVal")
	// use size 2 for LRU cache for testing purpose
	metricKeyToDimensions, err := cache.NewCache[metricKey, pcommon.Map](DimensionsCacheSize)
	callMetricKeyToDimensions, err := cache.NewCache[metricKey, pcommon.Map](DimensionsCacheSize)
	dbCallMetricKeyToDimensions, err := cache.NewCache[metricKey, pcommon.Map](DimensionsCacheSize)
	externalCallMetricKeyToDimensions, err := cache.NewCache[metricKey, pcommon.Map](DimensionsCacheSize)

	defaultDimensions := []dimension{
		// Set nil defaults to force a lookup for the attribute in the span.
		{stringAttrName, nil},
		{intAttrName, nil},
		{doubleAttrName, nil},
		{boolAttrName, nil},
		{mapAttrName, nil},
		{arrayAttrName, nil},
		{nullAttrName, defaultNullValue},
		// Add a default value for an attribute that doesn't exist in a span
		{notInSpanAttrName0, &defaultNotInSpanAttrVal},
		// Leave the default value unset to test that this dimension should not be added to the metric.
		{notInSpanAttrName1, nil},
		// Add a resource attribute to test "process" attributes like IP, host, region, cluster, etc.
		{regionResourceAttrName, nil},
	}

	defaultCallDimensions := append([]dimension{
		{
			name:  conventions.AttributeHTTPStatusCode,
			value: nil,
		},
	}, defaultDimensions...)
	dbCallDimensions := append([]dimension{
		{
			name:  conventions.AttributeDBSystem,
			value: nil,
		},
		{
			name:  conventions.AttributeDBName,
			value: nil,
		},
	}, defaultDimensions...)
	externalCallDimensions := append([]dimension{}, defaultDimensions...)

	if err != nil {
		panic(err)
	}

	excludePatternRegex := make(map[string]*regexp.Regexp)
	for _, pattern := range excludePatterns {
		excludePatternRegex[pattern.Name] = regexp.MustCompile(pattern.Pattern)
	}

	return &processorImp{
		logger:          logger,
		config:          Config{AggregationTemporality: temporality},
		metricsConsumer: mexp,
		tracesConsumer:  tcon,

		startTimestamp:         pcommon.NewTimestampFromTime(time.Now()),
		histograms:             make(map[metricKey]*histogramData),
		callHistograms:         make(map[metricKey]*histogramData),
		dbCallHistograms:       make(map[metricKey]*histogramData),
		externalCallHistograms: make(map[metricKey]*histogramData),

		latencyBounds:             defaultLatencyHistogramBucketsMs,
		callLatencyBounds:         defaultLatencyHistogramBucketsMs,
		dbCallLatencyBounds:       defaultLatencyHistogramBucketsMs,
		externalCallLatencyBounds: defaultLatencyHistogramBucketsMs,

		dimensions: []dimension{
			// Set nil defaults to force a lookup for the attribute in the span.
			{stringAttrName, nil},
			{intAttrName, nil},
			{doubleAttrName, nil},
			{boolAttrName, nil},
			{mapAttrName, nil},
			{arrayAttrName, nil},
			{nullAttrName, defaultNullValue},
			// Add a default value for an attribute that doesn't exist in a span
			{notInSpanAttrName0, &defaultNotInSpanAttrVal},
			// Leave the default value unset to test that this dimension should not be added to the metric.
			{notInSpanAttrName1, nil},
			// Add a resource attribute to test "process" attributes like IP, host, region, cluster, etc.
			{regionResourceAttrName, nil},
		},
		callDimensions:         defaultCallDimensions,
		dbCallDimensions:       dbCallDimensions,
		externalCallDimensions: externalCallDimensions,

		keyBuf:                            new(bytes.Buffer),
		metricKeyToDimensions:             metricKeyToDimensions,
		callMetricKeyToDimensions:         callMetricKeyToDimensions,
		dbCallMetricKeyToDimensions:       dbCallMetricKeyToDimensions,
		externalCallMetricKeyToDimensions: externalCallMetricKeyToDimensions,

		attrsCardinality:    make(map[string]map[string]struct{}),
		excludePatternRegex: excludePatternRegex,
	}
}

// verifyConsumeMetricsInputCumulative expects one accumulation of metrics, and marked as cumulative
func verifyConsumeMetricsInputCumulative(t testing.TB, input pmetric.Metrics) bool {
	return verifyConsumeMetricsInput(t, input, pmetric.AggregationTemporalityCumulative, 1)
}

func verifyBadMetricsOkay(t testing.TB, input pmetric.Metrics) bool {
	return true // Validating no exception
}

// verifyConsumeMetricsInputDelta expects one accumulation of metrics, and marked as delta
func verifyConsumeMetricsInputDelta(t testing.TB, input pmetric.Metrics) bool {
	return verifyConsumeMetricsInput(t, input, pmetric.AggregationTemporalityDelta, 1)
}

// verifyMultipleCumulativeConsumptions expects the amount of accumulations as kept track of by numCumulativeConsumptions.
// numCumulativeConsumptions acts as a multiplier for the values, since the cumulative metrics are additive.
func verifyMultipleCumulativeConsumptions() func(t testing.TB, input pmetric.Metrics) bool {
	numCumulativeConsumptions := 0
	return func(t testing.TB, input pmetric.Metrics) bool {
		numCumulativeConsumptions++
		return verifyConsumeMetricsInput(t, input, pmetric.AggregationTemporalityCumulative, numCumulativeConsumptions)
	}
}

// verifyConsumeMetricsInput verifies the input of the ConsumeMetrics call from this processor.
// This is the best point to verify the computed metrics from spans are as expected.
func verifyConsumeMetricsInput(t testing.TB, input pmetric.Metrics, expectedTemporality pmetric.AggregationTemporality, numCumulativeConsumptions int) bool {
	require.Equal(t, 6, input.DataPointCount(),
		"Should be 3 for each of call count and latency. Each group of 3 data points is made of: "+
			"service-a (server kind) -> service-a (client kind) -> service-b (service kind)",
	)

	rm := input.ResourceMetrics()
	require.Equal(t, 1, rm.Len())

	ilm := rm.At(0).ScopeMetrics()
	require.Equal(t, 1, ilm.Len())
	assert.Equal(t, "signozspanmetricsprocessor", ilm.At(0).Scope().Name())

	m := ilm.At(0).Metrics()
	// 6 metrics: signoz_calls_total, signoz_latency, signoz_db_latency_sum
	// signoz_db_latency_count, signoz_external_latency_sum, signoz_external_latency_count
	require.Equal(t, 6, m.Len())

	seenMetricIDs := make(map[metricID]bool)
	// The first 3 data points are for call counts.
	assert.Equal(t, "signoz_calls_total", m.At(0).Name())
	assert.Equal(t, expectedTemporality, m.At(0).Sum().AggregationTemporality())
	assert.True(t, m.At(0).Sum().IsMonotonic())
	callsDps := m.At(0).Sum().DataPoints()
	require.Equal(t, 3, callsDps.Len())
	for dpi := 0; dpi < 3; dpi++ {
		dp := callsDps.At(dpi)
		assert.Equal(t, int64(numCumulativeConsumptions), dp.IntValue(), "There should only be one metric per Service/operation/kind combination")
		assert.NotZero(t, dp.StartTimestamp(), "StartTimestamp should be set")
		assert.NotZero(t, dp.Timestamp(), "Timestamp should be set")
		verifyMetricLabels(dp, t, seenMetricIDs)
	}

	seenMetricIDs = make(map[metricID]bool)
	// The remaining 3 data points are for latency.
	assert.Equal(t, "signoz_latency", m.At(1).Name())
	assert.Equal(t, "ms", m.At(1).Unit())
	assert.Equal(t, expectedTemporality, m.At(1).Histogram().AggregationTemporality())
	latencyDps := m.At(1).Histogram().DataPoints()
	require.Equal(t, 3, latencyDps.Len())
	for dpi := 0; dpi < 3; dpi++ {
		dp := latencyDps.At(dpi)
		assert.Equal(t, sampleLatency*float64(numCumulativeConsumptions), dp.Sum(), "Should be a 11ms latency measurement, multiplied by the number of stateful accumulations.")
		assert.NotZero(t, dp.Timestamp(), "Timestamp should be set")

		// Verify bucket counts.

		// The bucket counts should be 1 greater than the explicit bounds as documented in:
		// https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/metrics/v1/metrics.proto.
		assert.Equal(t, dp.ExplicitBounds().Len()+1, dp.BucketCounts().Len())

		// Find the bucket index where the 11ms latency should belong in.
		var foundLatencyIndex int
		for foundLatencyIndex = 0; foundLatencyIndex < dp.ExplicitBounds().Len(); foundLatencyIndex++ {
			if dp.ExplicitBounds().At(foundLatencyIndex) > sampleLatency {
				break
			}
		}

		// Then verify that all histogram buckets are empty except for the bucket with the 11ms latency.
		var wantBucketCount uint64
		for bi := 0; bi < dp.BucketCounts().Len(); bi++ {
			wantBucketCount = 0
			if bi == foundLatencyIndex {
				wantBucketCount = uint64(numCumulativeConsumptions)
			}
			assert.Equal(t, wantBucketCount, dp.BucketCounts().At(bi))
		}
		verifyMetricLabels(dp, t, seenMetricIDs)
	}
	return true
}

func verifyMetricLabels(dp metricDataPoint, t testing.TB, seenMetricIDs map[metricID]bool) {
	mID := metricID{}
	wantDimensions := map[string]pcommon.Value{
		conflictResourceAttr:                    pcommon.NewValueStr(sampleConflictingHost),
		resourcePrefix + conflictResourceAttr:   pcommon.NewValueStr(sampleConflictingHost),
		stringAttrName:                          pcommon.NewValueStr("stringAttrValue"),
		intAttrName:                             pcommon.NewValueInt(99),
		doubleAttrName:                          pcommon.NewValueDouble(99.99),
		boolAttrName:                            pcommon.NewValueBool(true),
		nullAttrName:                            pcommon.NewValueEmpty(),
		arrayAttrName:                           pcommon.NewValueSlice(),
		mapAttrName:                             pcommon.NewValueMap(),
		notInSpanAttrName0:                      pcommon.NewValueStr("defaultNotInSpanAttrVal"),
		regionResourceAttrName:                  pcommon.NewValueStr(sampleRegion),
		resourcePrefix + regionResourceAttrName: pcommon.NewValueStr(sampleRegion),
	}
	dp.Attributes().Range(func(k string, v pcommon.Value) bool {
		switch k {
		case serviceNameKey:
			mID.service = v.Str()
		case operationKey:
			mID.operation = v.Str()
		case spanKindKey:
			mID.kind = v.Str()
		case statusCodeKey:
			mID.statusCode = v.Str()
		case notInSpanAttrName1:
			assert.Fail(t, notInSpanAttrName1+" should not be in this metric")
		default:
			assert.Equal(t, wantDimensions[k], v)
			delete(wantDimensions, k)
		}
		return true
	})
	assert.Empty(t, wantDimensions, "Did not see all expected dimensions in metric. Missing: ", wantDimensions)

	// Service/operation/kind should be a unique metric.
	assert.False(t, seenMetricIDs[mID])
	seenMetricIDs[mID] = true
}

func buildBadSampleTrace() ptrace.Traces {
	badTrace := buildSampleTrace()
	span := badTrace.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0)
	now := time.Now()
	// Flipping timestamp for a bad duration
	span.SetEndTimestamp(pcommon.NewTimestampFromTime(now))
	span.SetStartTimestamp(pcommon.NewTimestampFromTime(now.Add(sampleLatencyDuration)))
	return badTrace
}

// buildSampleTrace builds the following trace:
//
//	service-a/ping (server) ->
//	  service-a/ping (client) ->
//	    service-b/ping (server)
func buildSampleTrace() ptrace.Traces {
	traces := ptrace.NewTraces()

	initServiceSpans(
		serviceSpans{
			serviceName: "service-a",
			spans: []span{
				{
					operation:  "/ping",
					kind:       ptrace.SpanKindServer,
					statusCode: ptrace.StatusCodeOk,
				},
				{
					operation:  "/ping",
					kind:       ptrace.SpanKindClient,
					statusCode: ptrace.StatusCodeOk,
				},
			},
		}, traces.ResourceSpans().AppendEmpty())
	initServiceSpans(
		serviceSpans{
			serviceName: "service-b",
			spans: []span{
				{
					operation:  "/ping",
					kind:       ptrace.SpanKindServer,
					statusCode: ptrace.StatusCodeError,
				},
			},
		}, traces.ResourceSpans().AppendEmpty())
	initServiceSpans(serviceSpans{}, traces.ResourceSpans().AppendEmpty())
	return traces
}

func initServiceSpans(serviceSpans serviceSpans, spans ptrace.ResourceSpans) {
	if serviceSpans.serviceName != "" {
		spans.Resource().Attributes().PutStr(conventions.AttributeServiceName, serviceSpans.serviceName)
	}

	spans.Resource().Attributes().PutStr(regionResourceAttrName, sampleRegion)
	spans.Resource().Attributes().PutStr(conflictResourceAttr, sampleConflictingHost)

	ils := spans.ScopeSpans().AppendEmpty()
	for _, span := range serviceSpans.spans {
		initSpan(span, ils.Spans().AppendEmpty())
	}
}

func initSpan(span span, s ptrace.Span) {
	s.SetName(span.operation)
	s.SetKind(span.kind)
	s.Status().SetCode(span.statusCode)
	now := time.Now()
	s.SetStartTimestamp(pcommon.NewTimestampFromTime(now))
	s.SetEndTimestamp(pcommon.NewTimestampFromTime(now.Add(sampleLatencyDuration)))

	s.Attributes().PutStr(stringAttrName, "stringAttrValue")
	s.Attributes().PutStr(conflictResourceAttr, sampleConflictingHost)
	s.Attributes().PutStr("http.response.status_code", "200")
	s.Attributes().PutInt(intAttrName, 99)
	s.Attributes().PutDouble(doubleAttrName, 99.99)
	s.Attributes().PutBool(boolAttrName, true)
	s.Attributes().PutEmpty(nullAttrName)
	s.Attributes().PutEmptyMap(mapAttrName)
	s.Attributes().PutEmptySlice(arrayAttrName)
	s.SetTraceID(pcommon.TraceID([16]byte{byte(42)}))
	s.SetSpanID(pcommon.SpanID([8]byte{byte(42)}))
}

func newOTLPExporters(t *testing.T) (component.ID, exporter.Metrics, exporter.Traces) {
	otlpExpFactory := otlpexporter.NewFactory()
	otlpConfig := &otlpexporter.Config{
		GRPCClientSettings: configgrpc.GRPCClientSettings{
			Endpoint: "example.com:1234",
		},
	}
	expCreationParams := exportertest.NewNopCreateSettings()
	mexp, err := otlpExpFactory.CreateMetricsExporter(context.Background(), expCreationParams, otlpConfig)
	require.NoError(t, err)
	texp, err := otlpExpFactory.CreateTracesExporter(context.Background(), expCreationParams, otlpConfig)
	require.NoError(t, err)
	otlpID := component.NewID("otlp")
	return otlpID, mexp, texp
}

func TestBuildKeySameServiceOperationCharSequence(t *testing.T) {
	span0 := ptrace.NewSpan()
	span0.SetName("c")
	buf := &bytes.Buffer{}
	buildKey(buf, "ab", span0, nil, pcommon.NewMap())
	k0 := metricKey(buf.String())
	buf.Reset()
	span1 := ptrace.NewSpan()
	span1.SetName("bc")
	buildKey(buf, "a", span1, nil, pcommon.NewMap())
	k1 := metricKey(buf.String())
	assert.NotEqual(t, k0, k1)
	assert.Equal(t, metricKey("ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET"), k0)
	assert.Equal(t, metricKey("a\u0000bc\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET"), k1)
}

func TestBuildKeyWithDimensions(t *testing.T) {
	defaultFoo := pcommon.NewValueStr("bar")
	for _, tc := range []struct {
		name            string
		optionalDims    []dimension
		resourceAttrMap map[string]interface{}
		spanAttrMap     map[string]interface{}
		wantKey         string
	}{
		{
			name:    "nil optionalDims",
			wantKey: "ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET",
		},
		{
			name: "neither span nor resource contains key, dim provides default",
			optionalDims: []dimension{
				{name: "foo", value: &defaultFoo},
			},
			wantKey: "ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET\u0000bar",
		},
		{
			name: "neither span nor resource contains key, dim provides no default",
			optionalDims: []dimension{
				{name: "foo"},
			},
			wantKey: "ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET",
		},
		{
			name: "span attribute contains dimension",
			optionalDims: []dimension{
				{name: "foo"},
			},
			spanAttrMap: map[string]interface{}{
				"foo": 99,
			},
			wantKey: "ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET\u000099",
		},
		{
			name: "resource attribute contains dimension",
			optionalDims: []dimension{
				{name: "foo"},
			},
			resourceAttrMap: map[string]interface{}{
				"foo": 99,
			},
			wantKey: "ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET\u000099",
		},
		{
			name: "both span and resource attribute contains dimension, should prefer span attribute",
			optionalDims: []dimension{
				{name: "foo"},
			},
			spanAttrMap: map[string]interface{}{
				"foo": 100,
			},
			resourceAttrMap: map[string]interface{}{
				"foo": 99,
			},
			wantKey: "ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET\u0000100",
		},
		{
			name: "resource attribute contains instance ID",
			optionalDims: []dimension{
				{name: signozID},
			},
			resourceAttrMap: map[string]interface{}{
				signozID: testID,
			},
			wantKey: "ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET\u0000test-instance-id",
		},
		{
			name: "http status code with new sem conv",
			optionalDims: []dimension{
				{name: "http.response.status_code"},
			},
			spanAttrMap: map[string]interface{}{
				"http.response.status_code": 200,
			},
			wantKey: "ab\u0000c\u0000SPAN_KIND_UNSPECIFIED\u0000STATUS_CODE_UNSET\u0000200",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			resAttr := pcommon.NewMap()
			assert.NoError(t, resAttr.FromRaw(tc.resourceAttrMap))
			span0 := ptrace.NewSpan()
			assert.NoError(t, span0.Attributes().FromRaw(tc.spanAttrMap))
			span0.SetName("c")
			buf := &bytes.Buffer{}
			buildKey(buf, "ab", span0, tc.optionalDims, resAttr)
			assert.Equal(t, tc.wantKey, buf.String())
		})
	}
}

func TestProcessorDuplicateDimensions(t *testing.T) {
	// Prepare
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)
	// Duplicate dimension with reserved label after sanitization.
	cfg.Dimensions = []Dimension{
		{Name: "status_code"},
	}

	// Test
	p, err := newProcessor(zaptest.NewLogger(t), testID, cfg, nil)
	assert.Error(t, err)
	assert.Nil(t, p)
}

func TestValidateDimensions(t *testing.T) {
	for _, tc := range []struct {
		name              string
		dimensions        []Dimension
		expectedErr       string
		skipSanitizeLabel bool
	}{
		{
			name:       "no additional dimensions",
			dimensions: []Dimension{},
		},
		{
			name: "no duplicate dimensions",
			dimensions: []Dimension{
				{Name: "http.service_name"},
				{Name: "http.status_code"},
			},
		},
		{
			name: "duplicate dimension with reserved labels",
			dimensions: []Dimension{
				{Name: "service.name"},
			},
			expectedErr: "duplicate dimension name service.name",
		},
		{
			name: "duplicate dimension with reserved labels after sanitization",
			dimensions: []Dimension{
				{Name: "service_name"},
			},
			expectedErr: "duplicate dimension name service_name",
		},
		{
			name: "duplicate additional dimensions",
			dimensions: []Dimension{
				{Name: "service_name"},
				{Name: "service_name"},
			},
			expectedErr: "duplicate dimension name service_name",
		},
		{
			name: "duplicate additional dimensions after sanitization",
			dimensions: []Dimension{
				{Name: "http.status_code"},
				{Name: "http!status_code"},
			},
			expectedErr: "duplicate dimension name http_status_code after sanitization",
		},
		{
			name: "we skip the case if the dimension name is the same after sanitization",
			dimensions: []Dimension{
				{Name: "http_status_code"},
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			tc.skipSanitizeLabel = false
			err := validateDimensions(tc.dimensions, tc.skipSanitizeLabel)
			if tc.expectedErr != "" {
				assert.EqualError(t, err, tc.expectedErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestSanitize(t *testing.T) {
	cfg := createDefaultConfig().(*Config)
	require.Equal(t, "", sanitize("", cfg.skipSanitizeLabel), "")
	require.Equal(t, "key_test", sanitize("_test", cfg.skipSanitizeLabel))
	require.Equal(t, "key__test", sanitize("__test", cfg.skipSanitizeLabel))
	require.Equal(t, "key_0test", sanitize("0test", cfg.skipSanitizeLabel))
	require.Equal(t, "test", sanitize("test", cfg.skipSanitizeLabel))
	require.Equal(t, "test__", sanitize("test_/", cfg.skipSanitizeLabel))
	// testcases with skipSanitizeLabel flag turned on
	cfg.skipSanitizeLabel = true
	require.Equal(t, "", sanitize("", cfg.skipSanitizeLabel), "")
	require.Equal(t, "_test", sanitize("_test", cfg.skipSanitizeLabel))
	require.Equal(t, "key__test", sanitize("__test", cfg.skipSanitizeLabel))
	require.Equal(t, "key_0test", sanitize("0test", cfg.skipSanitizeLabel))
	require.Equal(t, "test", sanitize("test", cfg.skipSanitizeLabel))
	require.Equal(t, "test__", sanitize("test_/", cfg.skipSanitizeLabel))
}

func TestSetExemplars(t *testing.T) {
	// ----- conditions -------------------------------------------------------
	traces := buildSampleTrace()
	traceID := traces.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).TraceID()
	spanID := traces.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).SpanID()
	exemplarSlice := pmetric.NewExemplarSlice()
	timestamp := pcommon.NewTimestampFromTime(time.Now())
	value := float64(42)

	ed := []exemplarData{{traceID: traceID, spanID: spanID, value: value}}

	// ----- call -------------------------------------------------------------
	setExemplars(ed, timestamp, exemplarSlice)

	// ----- verify -----------------------------------------------------------
	traceIDValue := exemplarSlice.At(0).TraceID()
	spanIDValue := exemplarSlice.At(0).SpanID()

	assert.NotEmpty(t, exemplarSlice)
	assert.Equal(t, traceIDValue, traceID)
	assert.Equal(t, spanIDValue, spanID)
	assert.Equal(t, exemplarSlice.At(0).Timestamp(), timestamp)
	assert.Equal(t, exemplarSlice.At(0).DoubleValue(), value)
}

func TestProcessorUpdateExemplars(t *testing.T) {
	// ----- conditions -------------------------------------------------------
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)
	traces := buildSampleTrace()
	traceID := traces.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).TraceID()
	spanID := traces.ResourceSpans().At(0).ScopeSpans().At(0).Spans().At(0).SpanID()
	key := metricKey("metricKey")
	next := new(consumertest.TracesSink)
	p, err := newProcessor(zaptest.NewLogger(t), testID, cfg, nil)
	p.tracesConsumer = next
	value := float64(42)

	// ----- call -------------------------------------------------------------
	p.updateHistogram(key, value, traceID, spanID)

	// ----- verify -----------------------------------------------------------
	assert.NoError(t, err)
	assert.NotEmpty(t, p.histograms[key].exemplarsData)
	assert.Equal(t, p.histograms[key].exemplarsData[0], exemplarData{traceID: traceID, spanID: spanID, value: value})

	// ----- call -------------------------------------------------------------
	p.resetExemplarData()

	// ----- verify -----------------------------------------------------------
	assert.NoError(t, err)
	assert.Empty(t, p.histograms[key].exemplarsData)
}
