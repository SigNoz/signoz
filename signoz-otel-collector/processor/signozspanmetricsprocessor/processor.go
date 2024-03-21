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
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/lightstep/go-expohisto/structure"
	"github.com/tilinna/clock"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
	conventions "go.opentelemetry.io/collector/semconv/v1.6.1"
	"go.uber.org/zap"

	"github.com/SigNoz/signoz-otel-collector/processor/signozspanmetricsprocessor/internal/cache"
)

const (
	serviceNameKey          = conventions.AttributeServiceName
	operationKey            = "operation"   // OpenTelemetry non-standard constant.
	spanKindKey             = "span.kind"   // OpenTelemetry non-standard constant.
	statusCodeKey           = "status.code" // OpenTelemetry non-standard constant.
	tagHTTPStatusCode       = conventions.AttributeHTTPStatusCode
	tagHTTPStatusCodeStable = "http.response.status_code"
	metricKeySeparator      = string(byte(0))
	traceIDKey              = "trace_id"

	signozID = "signoz.collector.id"

	defaultDimensionsCacheSize = 1000
	resourcePrefix             = "resource_"
)

var (
	defaultLatencyHistogramBucketsMs = []float64{
		2, 4, 6, 8, 10, 50, 100, 200, 400, 800, 1000, 1400, 2000, 5000, 10_000, 15_000,
	}
)

type exemplarData struct {
	traceID pcommon.TraceID
	spanID  pcommon.SpanID
	value   float64
}

type exponentialHistogram struct {
	histogram *structure.Histogram[float64]
}

type metricKey string

type processorImp struct {
	lock       sync.Mutex
	logger     *zap.Logger
	instanceID string
	config     Config

	metricsConsumer consumer.Metrics
	tracesConsumer  consumer.Traces

	// Additional dimensions to add to metrics.
	dimensions             []dimension // signoz_latency metric
	expDimensions          []dimension // signoz_latency exphisto metric
	callDimensions         []dimension // signoz_calls_total metric
	dbCallDimensions       []dimension // signoz_db_latency_* metric
	externalCallDimensions []dimension // signoz_external_call_latency_* metric

	// The starting time of the data points.
	startTimestamp pcommon.Timestamp

	// Histogram.
	histograms    map[metricKey]*histogramData // signoz_latency metric
	latencyBounds []float64

	expHistograms map[metricKey]*exponentialHistogram

	callHistograms    map[metricKey]*histogramData // signoz_calls_total metric
	callLatencyBounds []float64

	dbCallHistograms    map[metricKey]*histogramData // signoz_db_latency_* metric
	dbCallLatencyBounds []float64

	externalCallHistograms    map[metricKey]*histogramData // signoz_external_call_latency_* metric
	externalCallLatencyBounds []float64

	keyBuf *bytes.Buffer

	// An LRU cache of dimension key-value maps keyed by a unique identifier formed by a concatenation of its values:
	// e.g. { "foo/barOK": { "serviceName": "foo", "operation": "/bar", "status_code": "OK" }}
	metricKeyToDimensions             *cache.Cache[metricKey, pcommon.Map]
	expHistogramKeyToDimensions       *cache.Cache[metricKey, pcommon.Map]
	callMetricKeyToDimensions         *cache.Cache[metricKey, pcommon.Map]
	dbCallMetricKeyToDimensions       *cache.Cache[metricKey, pcommon.Map]
	externalCallMetricKeyToDimensions *cache.Cache[metricKey, pcommon.Map]

	attrsCardinality    map[string]map[string]struct{}
	excludePatternRegex map[string]*regexp.Regexp

	ticker  *clock.Ticker
	done    chan struct{}
	started bool

	shutdownOnce sync.Once
}

type dimension struct {
	name  string
	value *pcommon.Value
}

func newDimensions(cfgDims []Dimension) []dimension {
	if len(cfgDims) == 0 {
		return nil
	}
	dims := make([]dimension, len(cfgDims))
	for i := range cfgDims {
		dims[i].name = cfgDims[i].Name
		if cfgDims[i].Default != nil {
			val := pcommon.NewValueStr(*cfgDims[i].Default)
			dims[i].value = &val
		}
	}
	return dims
}

type histogramData struct {
	count         uint64
	sum           float64
	bucketCounts  []uint64
	exemplarsData []exemplarData
}

func expoHistToExponentialDataPoint(agg *structure.Histogram[float64], dp pmetric.ExponentialHistogramDataPoint) {
	dp.SetCount(agg.Count())
	dp.SetSum(agg.Sum())
	if agg.Count() != 0 {
		dp.SetMin(agg.Min())
		dp.SetMax(agg.Max())
	}

	dp.SetZeroCount(agg.ZeroCount())
	dp.SetScale(agg.Scale())

	for _, half := range []struct {
		inFunc  func() *structure.Buckets
		outFunc func() pmetric.ExponentialHistogramDataPointBuckets
	}{
		{agg.Positive, dp.Positive},
		{agg.Negative, dp.Negative},
	} {
		in := half.inFunc()
		out := half.outFunc()
		out.SetOffset(in.Offset())
		out.BucketCounts().EnsureCapacity(int(in.Len()))

		for i := uint32(0); i < in.Len(); i++ {
			out.BucketCounts().Append(in.At(i))
		}
	}
}

func (h *exponentialHistogram) Observe(value float64) {
	h.histogram.Update(value)
}

func newProcessor(logger *zap.Logger, instanceID string, config component.Config, ticker *clock.Ticker) (*processorImp, error) {
	logger.Info("Building signozspanmetricsprocessor")
	pConfig := config.(*Config)

	bounds := defaultLatencyHistogramBucketsMs
	if pConfig.LatencyHistogramBuckets != nil {
		bounds = mapDurationsToMillis(pConfig.LatencyHistogramBuckets)
	}

	if err := validateDimensions(pConfig.Dimensions, pConfig.skipSanitizeLabel); err != nil {
		return nil, err
	}

	callDimensions := []Dimension{
		{Name: tagHTTPStatusCode},
	}
	callDimensions = append(callDimensions, pConfig.Dimensions...)

	dbCallDimensions := []Dimension{
		{Name: conventions.AttributeDBSystem},
		{Name: conventions.AttributeDBName},
	}
	dbCallDimensions = append(dbCallDimensions, pConfig.Dimensions...)

	var externalCallDimensions = []Dimension{
		{Name: tagHTTPStatusCode},
	}
	externalCallDimensions = append(externalCallDimensions, pConfig.Dimensions...)

	if pConfig.DimensionsCacheSize <= 0 {
		return nil, fmt.Errorf(
			"invalid cache size: %v, the maximum number of the items in the cache should be positive",
			pConfig.DimensionsCacheSize,
		)
	}
	metricKeyToDimensionsCache, err := cache.NewCache[metricKey, pcommon.Map](pConfig.DimensionsCacheSize)
	if err != nil {
		return nil, err
	}
	expHistogramKeyToDimensionsCache, err := cache.NewCache[metricKey, pcommon.Map](pConfig.DimensionsCacheSize)
	if err != nil {
		return nil, err
	}

	callMetricKeyToDimensionsCache, err := cache.NewCache[metricKey, pcommon.Map](pConfig.DimensionsCacheSize)
	if err != nil {
		return nil, err
	}
	dbMetricKeyToDimensionsCache, err := cache.NewCache[metricKey, pcommon.Map](pConfig.DimensionsCacheSize)
	if err != nil {
		return nil, err
	}
	externalCallMetricKeyToDimensionsCache, err := cache.NewCache[metricKey, pcommon.Map](pConfig.DimensionsCacheSize)
	if err != nil {
		return nil, err
	}

	excludePatternRegex := make(map[string]*regexp.Regexp)
	for _, pattern := range pConfig.ExcludePatterns {
		excludePatternRegex[pattern.Name] = regexp.MustCompile(pattern.Pattern)
	}

	return &processorImp{
		logger:                            logger,
		instanceID:                        instanceID,
		config:                            *pConfig,
		startTimestamp:                    pcommon.NewTimestampFromTime(time.Now()),
		histograms:                        make(map[metricKey]*histogramData),
		expHistograms:                     make(map[metricKey]*exponentialHistogram),
		callHistograms:                    make(map[metricKey]*histogramData),
		dbCallHistograms:                  make(map[metricKey]*histogramData),
		externalCallHistograms:            make(map[metricKey]*histogramData),
		latencyBounds:                     bounds,
		callLatencyBounds:                 bounds,
		dbCallLatencyBounds:               bounds,
		externalCallLatencyBounds:         bounds,
		dimensions:                        newDimensions(pConfig.Dimensions),
		expDimensions:                     newDimensions(pConfig.Dimensions),
		callDimensions:                    newDimensions(callDimensions),
		dbCallDimensions:                  newDimensions(dbCallDimensions),
		externalCallDimensions:            newDimensions(externalCallDimensions),
		keyBuf:                            bytes.NewBuffer(make([]byte, 0, 1024)),
		metricKeyToDimensions:             metricKeyToDimensionsCache,
		expHistogramKeyToDimensions:       expHistogramKeyToDimensionsCache,
		callMetricKeyToDimensions:         callMetricKeyToDimensionsCache,
		dbCallMetricKeyToDimensions:       dbMetricKeyToDimensionsCache,
		externalCallMetricKeyToDimensions: externalCallMetricKeyToDimensionsCache,
		attrsCardinality:                  make(map[string]map[string]struct{}),
		excludePatternRegex:               excludePatternRegex,
		ticker:                            ticker,
		done:                              make(chan struct{}),
	}, nil
}

// durationToMillis converts the given duration to the number of milliseconds it represents.
// Note that this can return sub-millisecond (i.e. < 1ms) values as well.
func durationToMillis(d time.Duration) float64 {
	return float64(d.Nanoseconds()) / float64(time.Millisecond.Nanoseconds())
}

func mapDurationsToMillis(vs []time.Duration) []float64 {
	vsm := make([]float64, len(vs))
	for i, v := range vs {
		vsm[i] = durationToMillis(v)
	}
	return vsm
}

// validateDimensions checks duplicates for reserved dimensions and additional dimensions. Considering
// the usage of Prometheus related exporters, we also validate the dimensions after sanitization.
func validateDimensions(dimensions []Dimension, skipSanitizeLabel bool) error {
	labelNames := make(map[string]struct{})
	for _, key := range []string{serviceNameKey, spanKindKey, statusCodeKey} {
		labelNames[key] = struct{}{}
		labelNames[sanitize(key, skipSanitizeLabel)] = struct{}{}
	}
	labelNames[operationKey] = struct{}{}

	for _, key := range dimensions {
		if _, ok := labelNames[key.Name]; ok {
			return fmt.Errorf("duplicate dimension name %s", key.Name)
		}
		labelNames[key.Name] = struct{}{}

		sanitizedName := sanitize(key.Name, skipSanitizeLabel)
		if sanitizedName == key.Name {
			continue
		}
		if _, ok := labelNames[sanitizedName]; ok {
			return fmt.Errorf("duplicate dimension name %s after sanitization", sanitizedName)
		}
		labelNames[sanitizedName] = struct{}{}
	}

	return nil
}

func (p *processorImp) shouldSkip(serviceName string, span ptrace.Span, resourceAttrs pcommon.Map) bool {
	for key, pattern := range p.excludePatternRegex {
		if key == serviceNameKey && pattern.MatchString(serviceName) {
			return true
		}
		if key == operationKey && pattern.MatchString(span.Name()) {
			return true
		}
		if key == spanKindKey && pattern.MatchString(span.Kind().String()) {
			return true
		}
		if key == statusCodeKey && pattern.MatchString(span.Status().Code().String()) {
			return true
		}

		matched := false
		span.Attributes().Range(func(k string, v pcommon.Value) bool {
			if key == k && pattern.MatchString(v.AsString()) {
				matched = true
			}
			return true
		})
		resourceAttrs.Range(func(k string, v pcommon.Value) bool {
			if key == k && pattern.MatchString(v.AsString()) {
				matched = true
			}
			return true
		})
		if matched {
			return true
		}
	}
	return false
}

// Start implements the component.Component interface.
func (p *processorImp) Start(ctx context.Context, host component.Host) error {
	p.logger.Info("Starting signozspanmetricsprocessor with config", zap.Any("config", p.config))
	exporters := host.GetExporters()

	availableMetricsExporters := make([]string, 0, len(exporters[component.DataTypeMetrics]))

	// The available list of exporters come from any configured metrics pipelines' exporters.
	for k, exp := range exporters[component.DataTypeMetrics] {
		metricsExp, ok := exp.(exporter.Metrics)
		if !ok {
			return fmt.Errorf("the exporter %q isn't a metrics exporter", k.String())
		}

		availableMetricsExporters = append(availableMetricsExporters, k.String())

		p.logger.Debug("Looking for signozspanmetrics exporter from available exporters",
			zap.String("signozspanmetrics-exporter", p.config.MetricsExporter),
			zap.Any("available-exporters", availableMetricsExporters),
		)
		if k.String() == p.config.MetricsExporter {
			p.metricsConsumer = metricsExp
			p.logger.Info("Found exporter", zap.String("signozspanmetrics-exporter", p.config.MetricsExporter))
			break
		}
	}
	if p.metricsConsumer == nil {
		return fmt.Errorf("failed to find metrics exporter: '%s'; please configure metrics_exporter from one of: %+v",
			p.config.MetricsExporter, availableMetricsExporters)
	}
	p.logger.Info("Started signozspanmetricsprocessor")

	p.started = true
	go func() {
		for {
			select {
			case <-p.done:
				return
			case <-p.ticker.C:
				p.exportMetrics(ctx)
			}
		}
	}()

	return nil
}

// Shutdown implements the component.Component interface.
func (p *processorImp) Shutdown(ctx context.Context) error {
	p.logger.Info("Shutting down signozspanmetricsprocessor")
	p.shutdownOnce.Do(func() {
		if p.started {
			p.logger.Info("Stopping ticker")
			p.ticker.Stop()
			p.done <- struct{}{}
			p.started = false
		}
	})
	return nil
}

// Capabilities implements the consumer interface.
func (p *processorImp) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{MutatesData: false}
}

// ConsumeTraces implements the consumer.Traces interface.
// It aggregates the trace data to generate metrics, forwarding these metrics to the discovered metrics exporter.
// The original input trace data will be forwarded to the next consumer, unmodified.
func (p *processorImp) ConsumeTraces(ctx context.Context, traces ptrace.Traces) error {
	p.lock.Lock()
	p.aggregateMetrics(traces)
	p.lock.Unlock()

	// Forward trace data unmodified and propagate trace pipeline errors, if any.
	return p.tracesConsumer.ConsumeTraces(ctx, traces)
}

func (p *processorImp) exportMetrics(ctx context.Context) {
	p.lock.Lock()

	m, err := p.buildMetrics()

	// Exemplars are only relevant to this batch of traces, so must be cleared within the lock,
	// regardless of error while building metrics, before the next batch of spans is received.
	p.resetExemplarData()

	// This component no longer needs to read the metrics once built, so it is safe to unlock.
	p.lock.Unlock()

	if err != nil {
		p.logCardinalityInfo()
		p.logger.Error("Failed to build metrics", zap.Error(err))
	}

	if err := p.metricsConsumer.ConsumeMetrics(ctx, m); err != nil {
		p.logger.Error("Failed ConsumeMetrics", zap.Error(err))
		return
	}
}

// buildMetrics collects the computed raw metrics data, builds the metrics object and
// writes the raw metrics data into the metrics object.
func (p *processorImp) buildMetrics() (pmetric.Metrics, error) {
	m := pmetric.NewMetrics()
	ilm := m.ResourceMetrics().AppendEmpty().ScopeMetrics().AppendEmpty()
	ilm.Scope().SetName("signozspanmetricsprocessor")

	if err := p.collectCallMetrics(ilm); err != nil {
		return pmetric.Metrics{}, err
	}
	if err := p.collectLatencyMetrics(ilm); err != nil {
		return pmetric.Metrics{}, err
	}
	if err := p.collectExternalCallMetrics(ilm); err != nil {
		return pmetric.Metrics{}, err
	}
	if err := p.collectDBCallMetrics(ilm); err != nil {
		return pmetric.Metrics{}, err
	}

	if err := p.collectExpHistogramMetrics(ilm); err != nil {
		return pmetric.Metrics{}, err
	}

	p.metricKeyToDimensions.RemoveEvictedItems()
	p.expHistogramKeyToDimensions.RemoveEvictedItems()
	p.callMetricKeyToDimensions.RemoveEvictedItems()
	p.dbCallMetricKeyToDimensions.RemoveEvictedItems()
	p.externalCallMetricKeyToDimensions.RemoveEvictedItems()

	for key := range p.histograms {
		if !p.metricKeyToDimensions.Contains(key) {
			delete(p.histograms, key)
		}
	}
	for key := range p.callHistograms {
		if !p.callMetricKeyToDimensions.Contains(key) {
			delete(p.callHistograms, key)
		}
	}
	for key := range p.dbCallHistograms {
		if !p.dbCallMetricKeyToDimensions.Contains(key) {
			delete(p.dbCallHistograms, key)
		}
	}
	for key := range p.externalCallHistograms {
		if !p.externalCallMetricKeyToDimensions.Contains(key) {
			delete(p.externalCallHistograms, key)
		}
	}

	for key := range p.expHistograms {
		if !p.expHistogramKeyToDimensions.Contains(key) {
			delete(p.expHistograms, key)
		}
	}

	// If delta metrics, reset accumulated data
	if p.config.GetAggregationTemporality() == pmetric.AggregationTemporalityDelta {
		p.resetAccumulatedMetrics()
	}
	p.resetExemplarData()

	return m, nil
}

func (p *processorImp) logCardinalityInfo() {
	for k, v := range p.attrsCardinality {
		values := make([]string, 0, len(v))
		for key := range v {
			values = append(values, key)
		}
		p.logger.Info("Attribute cardinality", zap.String("attribute", k), zap.Int("cardinality", len(v)))
		p.logger.Debug("Attribute values", zap.Strings("values", values))
	}
}

// collectLatencyMetrics collects the raw latency metrics, writing the data
// into the given instrumentation library metrics.
func (p *processorImp) collectLatencyMetrics(ilm pmetric.ScopeMetrics) error {
	mLatency := ilm.Metrics().AppendEmpty()
	mLatency.SetName("signoz_latency")
	mLatency.SetUnit("ms")
	mLatency.SetEmptyHistogram().SetAggregationTemporality(p.config.GetAggregationTemporality())
	dps := mLatency.Histogram().DataPoints()
	dps.EnsureCapacity(len(p.histograms))
	timestamp := pcommon.NewTimestampFromTime(time.Now())
	for key, hist := range p.histograms {
		dpLatency := dps.AppendEmpty()
		dpLatency.SetStartTimestamp(p.startTimestamp)
		dpLatency.SetTimestamp(timestamp)
		dpLatency.ExplicitBounds().FromRaw(p.latencyBounds)
		dpLatency.BucketCounts().FromRaw(hist.bucketCounts)
		dpLatency.SetCount(hist.count)
		dpLatency.SetSum(hist.sum)
		setExemplars(hist.exemplarsData, timestamp, dpLatency.Exemplars())

		dimensions, err := p.getDimensionsByMetricKey(key)
		if err != nil {
			return err
		}

		dimensions.CopyTo(dpLatency.Attributes())
	}
	return nil
}

// collectExpHistogramMetrics collects the raw latency metrics, writing the data
// into the given instrumentation library metrics.
func (p *processorImp) collectExpHistogramMetrics(ilm pmetric.ScopeMetrics) error {
	mExpLatency := ilm.Metrics().AppendEmpty()
	mExpLatency.SetName("signoz_latency")
	mExpLatency.SetUnit("ms")
	mExpLatency.SetEmptyExponentialHistogram().SetAggregationTemporality(p.config.GetAggregationTemporality())
	dps := mExpLatency.ExponentialHistogram().DataPoints()
	dps.EnsureCapacity(len(p.expHistograms))
	timestamp := pcommon.NewTimestampFromTime(time.Now())
	for key, hist := range p.expHistograms {
		dp := dps.AppendEmpty()
		dp.SetStartTimestamp(p.startTimestamp)
		dp.SetTimestamp(timestamp)
		expoHistToExponentialDataPoint(hist.histogram, dp)
		dimensions, err := p.getDimensionsByExpHistogramKey(key)
		if err != nil {
			return err
		}

		dimensions.CopyTo(dps.At(dps.Len() - 1).Attributes())
	}
	return nil
}

// collectDBCallMetrics collects the raw latency sum and count metrics, writing the data
// into the given instrumentation library metrics.
func (p *processorImp) collectDBCallMetrics(ilm pmetric.ScopeMetrics) error {
	mDBCallSum := ilm.Metrics().AppendEmpty()
	mDBCallSum.SetName("signoz_db_latency_sum")
	mDBCallSum.SetUnit("1")
	mDBCallSum.SetEmptySum().SetIsMonotonic(true)
	mDBCallSum.Sum().SetAggregationTemporality(p.config.GetAggregationTemporality())

	mDBCallCount := ilm.Metrics().AppendEmpty()
	mDBCallCount.SetName("signoz_db_latency_count")
	mDBCallCount.SetUnit("1")
	mDBCallCount.SetEmptySum().SetIsMonotonic(true)
	mDBCallCount.Sum().SetAggregationTemporality(p.config.GetAggregationTemporality())

	callSumDps := mDBCallSum.Sum().DataPoints()
	callCountDps := mDBCallCount.Sum().DataPoints()

	callSumDps.EnsureCapacity(len(p.dbCallHistograms))
	callCountDps.EnsureCapacity(len(p.dbCallHistograms))
	timestamp := pcommon.NewTimestampFromTime(time.Now())
	for key, metric := range p.dbCallHistograms {
		dpDBCallSum := callSumDps.AppendEmpty()
		dpDBCallSum.SetStartTimestamp(p.startTimestamp)
		dpDBCallSum.SetTimestamp(timestamp)
		dpDBCallSum.SetDoubleValue(metric.sum)

		dpDBCallCount := callCountDps.AppendEmpty()
		dpDBCallCount.SetStartTimestamp(p.startTimestamp)
		dpDBCallCount.SetTimestamp(timestamp)
		dpDBCallCount.SetIntValue(int64(metric.count))

		dimensions, err := p.getDimensionsByDBCallMetricKey(key)
		if err != nil {
			return err
		}

		dimensions.CopyTo(dpDBCallSum.Attributes())
		dimensions.CopyTo(dpDBCallCount.Attributes())
	}
	return nil
}

func (p *processorImp) collectExternalCallMetrics(ilm pmetric.ScopeMetrics) error {
	mExternalCallSum := ilm.Metrics().AppendEmpty()
	mExternalCallSum.SetName("signoz_external_call_latency_sum")
	mExternalCallSum.SetUnit("1")
	mExternalCallSum.SetEmptySum().SetIsMonotonic(true)
	mExternalCallSum.Sum().SetAggregationTemporality(p.config.GetAggregationTemporality())

	mExternalCallCount := ilm.Metrics().AppendEmpty()
	mExternalCallCount.SetName("signoz_external_call_latency_count")
	mExternalCallCount.SetUnit("1")
	mExternalCallCount.SetEmptySum().SetIsMonotonic(true)
	mExternalCallCount.Sum().SetAggregationTemporality(p.config.GetAggregationTemporality())

	callSumDps := mExternalCallSum.Sum().DataPoints()
	callCountDps := mExternalCallCount.Sum().DataPoints()

	callSumDps.EnsureCapacity(len(p.externalCallHistograms))
	callCountDps.EnsureCapacity(len(p.externalCallHistograms))
	timestamp := pcommon.NewTimestampFromTime(time.Now())
	for key, metric := range p.externalCallHistograms {
		dpExternalCallSum := callSumDps.AppendEmpty()
		dpExternalCallSum.SetStartTimestamp(p.startTimestamp)
		dpExternalCallSum.SetTimestamp(timestamp)
		dpExternalCallSum.SetDoubleValue(metric.sum)

		dpExternalCallCount := callCountDps.AppendEmpty()
		dpExternalCallCount.SetStartTimestamp(p.startTimestamp)
		dpExternalCallCount.SetTimestamp(timestamp)
		dpExternalCallCount.SetIntValue(int64(metric.count))

		dimensions, err := p.getDimensionsByExternalCallMetricKey(key)
		if err != nil {
			return err
		}

		dimensions.CopyTo(dpExternalCallSum.Attributes())
		dimensions.CopyTo(dpExternalCallCount.Attributes())
	}
	return nil
}

// collectCallMetrics collects the raw call count metrics, writing the data
// into the given instrumentation library metrics.
func (p *processorImp) collectCallMetrics(ilm pmetric.ScopeMetrics) error {
	mCalls := ilm.Metrics().AppendEmpty()
	mCalls.SetName("signoz_calls_total")
	mCalls.SetEmptySum().SetIsMonotonic(true)
	mCalls.Sum().SetAggregationTemporality(p.config.GetAggregationTemporality())
	dps := mCalls.Sum().DataPoints()
	dps.EnsureCapacity(len(p.callHistograms))
	timestamp := pcommon.NewTimestampFromTime(time.Now())
	for key, hist := range p.callHistograms {
		dpCalls := dps.AppendEmpty()
		dpCalls.SetStartTimestamp(p.startTimestamp)
		dpCalls.SetTimestamp(timestamp)
		dpCalls.SetIntValue(int64(hist.count))

		dimensions, err := p.getDimensionsByCallMetricKey(key)
		if err != nil {
			return err
		}

		dimensions.CopyTo(dpCalls.Attributes())
	}
	return nil
}

// getDimensionsByMetricKey gets dimensions from `metricKeyToDimensions` cache.
func (p *processorImp) getDimensionsByMetricKey(k metricKey) (pcommon.Map, error) {
	if attributeMap, ok := p.metricKeyToDimensions.Get(k); ok {
		return attributeMap, nil
	}
	return pcommon.Map{}, fmt.Errorf("value not found in metricKeyToDimensions cache by key %q", k)
}

// getDimensionsByExpHistogramKey gets dimensions from `expHistogramKeyToDimensions` cache.
func (p *processorImp) getDimensionsByExpHistogramKey(k metricKey) (pcommon.Map, error) {
	if attributeMap, ok := p.expHistogramKeyToDimensions.Get(k); ok {
		return attributeMap, nil
	}
	return pcommon.Map{}, fmt.Errorf("value not found in expHistogramKeyToDimensions cache by key %q", k)
}

// callMetricKeyToDimensions gets dimensions from `callMetricKeyToDimensions` cache.
func (p *processorImp) getDimensionsByCallMetricKey(k metricKey) (pcommon.Map, error) {
	if attributeMap, ok := p.callMetricKeyToDimensions.Get(k); ok {
		return attributeMap, nil
	}
	return pcommon.Map{}, fmt.Errorf("value not found in callMetricKeyToDimensions cache by key %q", k)
}

// getDimensionsByDBCallMetricKey gets dimensions from `dbCallMetricKeyToDimensions` cache.
func (p *processorImp) getDimensionsByDBCallMetricKey(k metricKey) (pcommon.Map, error) {
	if attributeMap, ok := p.dbCallMetricKeyToDimensions.Get(k); ok {
		return attributeMap, nil
	}
	return pcommon.Map{}, fmt.Errorf("value not found in dbCallMetricKeyToDimensions cache by key %q", k)
}

// getDimensionsByExternalCallMetricKey gets dimensions from `externalCallMetricKeyToDimensions` cache.
func (p *processorImp) getDimensionsByExternalCallMetricKey(k metricKey) (pcommon.Map, error) {
	if attributeMap, ok := p.externalCallMetricKeyToDimensions.Get(k); ok {
		return attributeMap, nil
	}
	return pcommon.Map{}, fmt.Errorf("value not found in externalCallMetricKeyToDimensions cache by key %q", k)
}

func getRemoteAddress(span ptrace.Span) (string, bool) {
	var addr string

	getPeerAddress := func(attrs pcommon.Map) (string, bool) {
		var addr string
		// Since net.peer.name is readable, it is preferred over net.peer.ip.
		peerName, ok := attrs.Get(conventions.AttributeNetPeerName)
		if ok {
			addr = peerName.Str()
			port, ok := attrs.Get(conventions.AttributeNetPeerPort)
			if ok {
				addr += ":" + port.Str()
			}
			return addr, true
		}
		// net.peer.name|net.host.name is renamed to server.address
		peerAddress, ok := attrs.Get("server.address")
		if ok {
			addr = peerAddress.Str()
			port, ok := attrs.Get("server.port")
			if ok {
				addr += ":" + port.Str()
			}
			return addr, true
		}

		peerIp, ok := attrs.Get(conventions.AttributeNetPeerIP)
		if ok {
			addr = peerIp.Str()
			port, ok := attrs.Get(conventions.AttributeNetPeerPort)
			if ok {
				addr += ":" + port.Str()
			}
			return addr, true
		}
		// net.peer.ip is renamed to net.sock.peer.addr
		peerAddress, ok = attrs.Get("net.sock.peer.addr")
		if ok {
			addr = peerAddress.Str()
			port, ok := attrs.Get("net.sock.peer.port")
			if ok {
				addr += ":" + port.Str()
			}
			return addr, true
		}

		// And later net.sock.peer.addr is renamed to network.peer.address
		peerAddress, ok = attrs.Get("network.peer.address")
		if ok {
			addr = peerAddress.Str()
			port, ok := attrs.Get("network.peer.port")
			if ok {
				addr += ":" + port.Str()
			}
			return addr, true
		}

		return "", false
	}

	attrs := span.Attributes()
	_, isRPC := attrs.Get(conventions.AttributeRPCSystem)
	// If the span is an RPC, the remote address is service/method.
	if isRPC {
		service, svcOK := attrs.Get(conventions.AttributeRPCService)
		if svcOK {
			addr = service.Str()
		}
		method, methodOK := attrs.Get(conventions.AttributeRPCMethod)
		if methodOK {
			addr += "/" + method.Str()
		}
		if addr != "" {
			return addr, true
		}
		// Ideally shouldn't reach here but if for some reason
		// service/method not set for RPC, fallback to peer address.
		return getPeerAddress(attrs)
	}

	// If HTTP host is set, use it.
	host, ok := attrs.Get(conventions.AttributeHTTPHost)
	if ok {
		return host.Str(), true
	}

	peerAddress, ok := getPeerAddress(attrs)
	if ok {
		// If the peer address is set and the transport is not unix domain socket, or pipe
		transport, ok := attrs.Get(conventions.AttributeNetTransport)
		if ok && transport.Str() == "unix" && transport.Str() == "pipe" {
			return "", false
		}
		return peerAddress, true
	}

	// If none of the above is set, check for full URL.
	httpURL, ok := attrs.Get(conventions.AttributeHTTPURL)
	if !ok {
		// http.url is renamed to url.full
		httpURL, ok = attrs.Get("url.full")
	}
	if ok {
		urlValue := httpURL.Str()
		// url pattern from godoc [scheme:][//[userinfo@]host][/]path[?query][#fragment]
		if !strings.HasPrefix(urlValue, "http://") && !strings.HasPrefix(urlValue, "https://") {
			urlValue = "http://" + urlValue
		}
		parsedURL, err := url.Parse(urlValue)
		if err != nil {
			return "", false
		}
		return parsedURL.Host, true
	}

	peerService, ok := attrs.Get(conventions.AttributePeerService)
	if ok {
		return peerService.Str(), true
	}

	return "", false
}

func (p *processorImp) aggregateMetricsForSpan(serviceName string, span ptrace.Span, resourceAttr pcommon.Map) {

	if p.shouldSkip(serviceName, span, resourceAttr) {
		p.logger.Debug("Skipping span", zap.String("span", span.Name()), zap.String("service", serviceName))
		return
	}
	// Protect against end timestamps before start timestamps. Assume 0 duration.
	latencyInMilliseconds := float64(0)
	startTime := span.StartTimestamp()
	endTime := span.EndTimestamp()
	if endTime > startTime {
		latencyInMilliseconds = float64(endTime-startTime) / float64(time.Millisecond.Nanoseconds())
	}
	// Always reset the buffer before re-using.
	p.keyBuf.Reset()
	buildKey(p.keyBuf, serviceName, span, p.dimensions, resourceAttr)
	key := metricKey(p.keyBuf.String())
	p.cache(serviceName, span, key, resourceAttr)
	p.updateHistogram(key, latencyInMilliseconds, span.TraceID(), span.SpanID())

	if p.config.EnableExpHistogram {
		p.keyBuf.Reset()
		buildKey(p.keyBuf, serviceName, span, p.expDimensions, resourceAttr)
		expKey := metricKey(p.keyBuf.String())
		p.expHistogramCache(serviceName, span, expKey, resourceAttr)
		p.updateExpHistogram(expKey, latencyInMilliseconds, span.TraceID(), span.SpanID())
	}

	p.keyBuf.Reset()
	buildKey(p.keyBuf, serviceName, span, p.callDimensions, resourceAttr)
	callKey := metricKey(p.keyBuf.String())
	p.callCache(serviceName, span, callKey, resourceAttr)
	p.updateCallHistogram(callKey, latencyInMilliseconds, span.TraceID(), span.SpanID())

	spanAttr := span.Attributes()
	remoteAddr, externalCallPresent := getRemoteAddress(span)

	if span.Kind() == ptrace.SpanKindClient && externalCallPresent {
		extraVals := []string{remoteAddr}
		p.keyBuf.Reset()
		buildCustomKey(p.keyBuf, serviceName, span, p.externalCallDimensions, resourceAttr, extraVals)
		externalCallKey := metricKey(p.keyBuf.String())
		extraDims := map[string]pcommon.Value{
			"address": pcommon.NewValueStr(remoteAddr),
		}
		p.externalCallCache(serviceName, span, externalCallKey, resourceAttr, extraDims)
		p.updateExternalHistogram(externalCallKey, latencyInMilliseconds, span.TraceID(), span.SpanID())
	}

	_, dbCallPresent := spanAttr.Get("db.system")
	if span.Kind() != ptrace.SpanKindServer && dbCallPresent {
		p.keyBuf.Reset()
		buildCustomKey(p.keyBuf, serviceName, span, p.dbCallDimensions, resourceAttr, nil)
		dbCallKey := metricKey(p.keyBuf.String())
		p.dbCallCache(serviceName, span, dbCallKey, resourceAttr)
		p.updateDBHistogram(dbCallKey, latencyInMilliseconds, span.TraceID(), span.SpanID())
	}
}

// aggregateMetrics aggregates the raw metrics from the input trace data.
// Each metric is identified by a key that is built from the service name
// and span metadata such as operation, kind, status_code and any additional
// dimensions the user has configured.
func (p *processorImp) aggregateMetrics(traces ptrace.Traces) {
	for i := 0; i < traces.ResourceSpans().Len(); i++ {
		rspans := traces.ResourceSpans().At(i)
		resourceAttr := rspans.Resource().Attributes()
		serviceAttr, ok := resourceAttr.Get(conventions.AttributeServiceName)
		if !ok {
			continue
		}
		resourceAttr.PutStr(signozID, p.instanceID)
		serviceName := serviceAttr.Str()
		ilsSlice := rspans.ScopeSpans()
		for j := 0; j < ilsSlice.Len(); j++ {
			ils := ilsSlice.At(j)
			spans := ils.Spans()
			for k := 0; k < spans.Len(); k++ {
				span := spans.At(k)
				p.aggregateMetricsForSpan(serviceName, span, resourceAttr)
			}
		}
	}
}

// resetAccumulatedMetrics resets the internal maps used to store created metric data. Also purge the cache for
// metricKeyToDimensions.
func (p *processorImp) resetAccumulatedMetrics() {
	p.histograms = make(map[metricKey]*histogramData)
	p.expHistograms = make(map[metricKey]*exponentialHistogram)
	p.callHistograms = make(map[metricKey]*histogramData)
	p.dbCallHistograms = make(map[metricKey]*histogramData)
	p.externalCallHistograms = make(map[metricKey]*histogramData)

	p.metricKeyToDimensions.Purge()
	p.expHistogramKeyToDimensions.Purge()
	p.callMetricKeyToDimensions.Purge()
	p.dbCallMetricKeyToDimensions.Purge()
	p.externalCallMetricKeyToDimensions.Purge()
}

// updateHistogram adds the histogram sample to the histogram defined by the metric key.
func (p *processorImp) updateHistogram(key metricKey, latency float64, traceID pcommon.TraceID, spanID pcommon.SpanID) {
	histo, ok := p.histograms[key]
	if !ok {
		histo = &histogramData{
			bucketCounts: make([]uint64, len(p.latencyBounds)+1),
		}
		p.histograms[key] = histo
	}

	histo.sum += latency
	histo.count++
	// Binary search to find the latencyInMilliseconds bucket index.
	index := sort.SearchFloat64s(p.latencyBounds, latency)
	histo.bucketCounts[index]++
	histo.exemplarsData = append(histo.exemplarsData, exemplarData{traceID: traceID, spanID: spanID, value: latency})
}

func (p *processorImp) updateExpHistogram(key metricKey, latency float64, traceID pcommon.TraceID, spanID pcommon.SpanID) {
	histo, ok := p.expHistograms[key]
	if !ok {
		histogram := new(structure.Histogram[float64])
		cfg := structure.NewConfig(
			structure.WithMaxSize(structure.DefaultMaxSize),
		)
		histogram.Init(cfg)

		histo = &exponentialHistogram{
			histogram: histogram,
		}
		p.expHistograms[key] = histo
	}

	histo.Observe(latency)
}

func (p *processorImp) updateCallHistogram(key metricKey, latency float64, traceID pcommon.TraceID, spanID pcommon.SpanID) {
	histo, ok := p.callHistograms[key]
	if !ok {
		histo = &histogramData{
			bucketCounts: make([]uint64, len(p.latencyBounds)+1),
		}
		p.callHistograms[key] = histo
	}

	histo.sum += latency
	histo.count++
	// Binary search to find the latencyInMilliseconds bucket index.
	index := sort.SearchFloat64s(p.latencyBounds, latency)
	histo.bucketCounts[index]++
	histo.exemplarsData = append(histo.exemplarsData, exemplarData{traceID: traceID, spanID: spanID, value: latency})
}

func (p *processorImp) updateDBHistogram(key metricKey, latency float64, traceID pcommon.TraceID, spanID pcommon.SpanID) {
	histo, ok := p.dbCallHistograms[key]
	if !ok {
		histo = &histogramData{
			bucketCounts: make([]uint64, len(p.latencyBounds)+1),
		}
		p.dbCallHistograms[key] = histo
	}

	histo.sum += latency
	histo.count++
	// Binary search to find the latencyInMilliseconds bucket index.
	index := sort.SearchFloat64s(p.latencyBounds, latency)
	histo.bucketCounts[index]++
	histo.exemplarsData = append(histo.exemplarsData, exemplarData{traceID: traceID, spanID: spanID, value: latency})
}

func (p *processorImp) updateExternalHistogram(key metricKey, latency float64, traceID pcommon.TraceID, spanID pcommon.SpanID) {
	histo, ok := p.externalCallHistograms[key]
	if !ok {
		histo = &histogramData{
			bucketCounts: make([]uint64, len(p.latencyBounds)+1),
		}
		p.externalCallHistograms[key] = histo
	}

	histo.sum += latency
	histo.count++
	// Binary search to find the latencyInMilliseconds bucket index.
	index := sort.SearchFloat64s(p.latencyBounds, latency)
	histo.bucketCounts[index]++
	histo.exemplarsData = append(histo.exemplarsData, exemplarData{traceID: traceID, spanID: spanID, value: latency})
}

// resetExemplarData resets the entire exemplars map so the next trace will recreate all
// the data structure. An exemplar is a punctual value that exists at specific moment in time
// and should be not considered like a metrics that persist over time.
func (p *processorImp) resetExemplarData() {
	for _, histo := range p.histograms {
		histo.exemplarsData = nil
	}
	for _, histo := range p.callHistograms {
		histo.exemplarsData = nil
	}
	for _, histo := range p.dbCallHistograms {
		histo.exemplarsData = nil
	}
	for _, histo := range p.externalCallHistograms {
		histo.exemplarsData = nil
	}
}

func (p *processorImp) buildDimensionKVs(serviceName string, span ptrace.Span, optionalDims []dimension, resourceAttrs pcommon.Map) pcommon.Map {
	dims := pcommon.NewMap()
	dims.EnsureCapacity(4 + len(optionalDims))
	dims.PutStr(serviceNameKey, serviceName)
	dims.PutStr(operationKey, span.Name())
	dims.PutStr(spanKindKey, SpanKindStr(span.Kind()))
	dims.PutStr(statusCodeKey, StatusCodeStr(span.Status().Code()))
	for _, d := range optionalDims {
		v, ok, foundInResource := getDimensionValueWithResource(d, span.Attributes(), resourceAttrs)
		if ok {
			v.CopyTo(dims.PutEmpty(d.name))
		}
		if foundInResource {
			v.CopyTo(dims.PutEmpty(resourcePrefix + d.name))
		}
	}
	dims.Range(func(k string, v pcommon.Value) bool {
		if _, exists := p.attrsCardinality[k]; !exists {
			p.attrsCardinality[k] = make(map[string]struct{})
		}
		p.attrsCardinality[k][v.AsString()] = struct{}{}
		return true
	})
	return dims
}

func (p *processorImp) buildCustomDimensionKVs(serviceName string, span ptrace.Span, optionalDims []dimension, resourceAttrs pcommon.Map, extraDims map[string]pcommon.Value) pcommon.Map {
	dims := pcommon.NewMap()

	dims.PutStr(serviceNameKey, serviceName)
	for k, v := range extraDims {
		v.CopyTo(dims.PutEmpty(k))
	}
	dims.PutStr(statusCodeKey, StatusCodeStr(span.Status().Code()))

	for _, d := range optionalDims {
		v, ok, foundInResource := getDimensionValueWithResource(d, span.Attributes(), resourceAttrs)
		if ok {
			v.CopyTo(dims.PutEmpty(d.name))
		}
		if foundInResource {
			v.CopyTo(dims.PutEmpty(resourcePrefix + d.name))
		}
	}
	dims.Range(func(k string, v pcommon.Value) bool {
		if _, exists := p.attrsCardinality[k]; !exists {
			p.attrsCardinality[k] = make(map[string]struct{})
		}
		p.attrsCardinality[k][v.AsString()] = struct{}{}
		return true
	})
	return dims
}

func concatDimensionValue(dest *bytes.Buffer, value string, prefixSep bool) {
	if prefixSep {
		dest.WriteString(metricKeySeparator)
	}
	dest.WriteString(value)
}

// buildKey builds the metric key from the service name and span metadata such as operation, kind, status_code and
// will attempt to add any additional dimensions the user has configured that match the span's attributes
// or resource attributes. If the dimension exists in both, the span's attributes, being the most specific, takes precedence.
//
// The metric key is a simple concatenation of dimension values, delimited by a null character.
func buildKey(dest *bytes.Buffer, serviceName string, span ptrace.Span, optionalDims []dimension, resourceAttrs pcommon.Map) {
	concatDimensionValue(dest, serviceName, false)
	concatDimensionValue(dest, span.Name(), true)
	concatDimensionValue(dest, SpanKindStr(span.Kind()), true)
	concatDimensionValue(dest, StatusCodeStr(span.Status().Code()), true)

	for _, d := range optionalDims {
		if v, ok := getDimensionValue(d, span.Attributes(), resourceAttrs); ok {
			concatDimensionValue(dest, v.AsString(), true)
		}
	}
}

// buildCustomKey builds the metric key from the service name and span metadata such as operation, kind, status_code and
// will attempt to add any additional dimensions the user has configured that match the span's attributes
// or resource attributes. If the dimension exists in both, the span's attributes, being the most specific, takes precedence.
//
// The metric key is a simple concatenation of dimension values, delimited by a null character.
func buildCustomKey(dest *bytes.Buffer, serviceName string, span ptrace.Span, optionalDims []dimension, resourceAttrs pcommon.Map, extraVals []string) {
	concatDimensionValue(dest, serviceName, false)
	concatDimensionValue(dest, StatusCodeStr(span.Status().Code()), true)
	for _, val := range extraVals {
		concatDimensionValue(dest, val, true)
	}

	for _, d := range optionalDims {
		v, ok, foundInResource := getDimensionValueWithResource(d, span.Attributes(), resourceAttrs)
		if ok {
			concatDimensionValue(dest, v.AsString(), true)
		}

		if foundInResource {
			concatDimensionValue(dest, resourcePrefix+v.AsString(), true)
		}
	}
}

// getDimensionValue gets the dimension value for the given configured dimension.
// It searches through the span's attributes first, being the more specific;
// falling back to searching in resource attributes if it can't be found in the span.
// Finally, falls back to the configured default value if provided.
//
// The ok flag indicates if a dimension value was fetched in order to differentiate
// an empty string value from a state where no value was found.
func getDimensionValue(d dimension, spanAttr pcommon.Map, resourceAttr pcommon.Map) (v pcommon.Value, ok bool) {
	// The more specific span attribute should take precedence.
	if attr, exists := spanAttr.Get(d.name); exists {
		return attr, true
	} else if d.name == tagHTTPStatusCode {
		if attr, exists := spanAttr.Get(tagHTTPStatusCodeStable); exists {
			return attr, true
		}
	}
	if attr, exists := resourceAttr.Get(d.name); exists {
		return attr, true
	}
	// Set the default if configured, otherwise this metric will have no value set for the dimension.
	if d.value != nil {
		return *d.value, true
	}
	return v, ok
}

func getDimensionValueWithResource(d dimension, spanAttr pcommon.Map, resourceAttr pcommon.Map) (v pcommon.Value, ok bool, foundInResource bool) {
	if attr, exists := spanAttr.Get(d.name); exists {
		if _, exists := resourceAttr.Get(d.name); exists {
			return attr, true, true
		}
		return attr, true, false
	} else if d.name == tagHTTPStatusCode {
		if attr, exists := spanAttr.Get(tagHTTPStatusCodeStable); exists {
			return attr, true, false
		}
	}
	if attr, exists := resourceAttr.Get(d.name); exists {
		return attr, true, true
	}
	// Set the default if configured, otherwise this metric will have no value set for the dimension.
	if d.value != nil {
		return *d.value, true, false
	}
	return v, ok, foundInResource
}

// cache the dimension key-value map for the metricKey if there is a cache miss.
// This enables a lookup of the dimension key-value map when constructing the metric like so:
//
//	LabelsMap().InitFromMap(p.metricKeyToDimensions[key])
func (p *processorImp) cache(serviceName string, span ptrace.Span, k metricKey, resourceAttrs pcommon.Map) {
	// Use Get to ensure any existing key has its recent-ness updated.
	if _, has := p.metricKeyToDimensions.Get(k); !has {
		p.metricKeyToDimensions.Add(k, p.buildDimensionKVs(serviceName, span, p.dimensions, resourceAttrs))
	}
}

// expHistogramCache caches the dimension key-value map for the metricKey if there is a cache miss.
// This enables a lookup of the dimension key-value map when constructing the metric like so:
//
//	LabelsMap().InitFromMap(p.expHistogramKeyToDimensions[key])
func (p *processorImp) expHistogramCache(serviceName string, span ptrace.Span, k metricKey, resourceAttrs pcommon.Map) {
	// Use Get to ensure any existing key has its recent-ness updated.
	if _, has := p.expHistogramKeyToDimensions.Get(k); !has {
		p.expHistogramKeyToDimensions.Add(k, p.buildDimensionKVs(serviceName, span, p.expDimensions, resourceAttrs))
	}
}

// callCache caches the dimension key-value map for the metricKey if there is a cache miss.
// This enables a lookup of the dimension key-value map when constructing the metric like so:
//
//	LabelsMap().InitFromMap(p.callMetricKeyToDimensions[key])
func (p *processorImp) callCache(serviceName string, span ptrace.Span, k metricKey, resourceAttrs pcommon.Map) {
	// Use Get to ensure any existing key has its recent-ness updated.
	if _, has := p.callMetricKeyToDimensions.Get(k); !has {
		p.callMetricKeyToDimensions.Add(k, p.buildDimensionKVs(serviceName, span, p.callDimensions, resourceAttrs))
	}
}

// dbCallCache caches the dimension key-value map for the metricKey if there is a cache miss.
// This enables a lookup of the dimension key-value map when constructing the metric like so:
//
//	LabelsMap().InitFromMap(p.dbCallMetricKeyToDimensions[key])
func (p *processorImp) dbCallCache(serviceName string, span ptrace.Span, k metricKey, resourceAttrs pcommon.Map) {
	// Use Get to ensure any existing key has its recent-ness updated.
	if _, has := p.dbCallMetricKeyToDimensions.Get(k); !has {
		p.dbCallMetricKeyToDimensions.Add(k, p.buildCustomDimensionKVs(serviceName, span, p.dbCallDimensions, resourceAttrs, nil))
	}
}

// externalCallCache caches the dimension key-value map for the metricKey if there is a cache miss.
// This enables a lookup of the dimension key-value map when constructing the metric like so:
//
//	LabelsMap().InitFromMap(p.externalCallMetricKeyToDimensions[key])
func (p *processorImp) externalCallCache(serviceName string, span ptrace.Span, k metricKey, resourceAttrs pcommon.Map, extraDims map[string]pcommon.Value) {
	// Use Get to ensure any existing key has its recent-ness updated.
	if _, has := p.externalCallMetricKeyToDimensions.Get(k); !has {
		p.externalCallMetricKeyToDimensions.Add(k, p.buildCustomDimensionKVs(serviceName, span, p.externalCallDimensions, resourceAttrs, extraDims))
	}
}

// copied from prometheus-go-metric-exporter
// sanitize replaces non-alphanumeric characters with underscores in s.
func sanitize(s string, skipSanitizeLabel bool) string {
	if len(s) == 0 {
		return s
	}

	// Note: No length limit for label keys because Prometheus doesn't
	// define a length limit, thus we should NOT be truncating label keys.
	// See https://github.com/orijtech/prometheus-go-metrics-exporter/issues/4.
	s = strings.Map(sanitizeRune, s)
	if unicode.IsDigit(rune(s[0])) {
		s = "key_" + s
	}
	// replace labels starting with _ only when skipSanitizeLabel is disabled
	if !skipSanitizeLabel && strings.HasPrefix(s, "_") {
		s = "key" + s
	}
	// labels starting with __ are reserved in prometheus
	if strings.HasPrefix(s, "__") {
		s = "key" + s
	}
	return s
}

// copied from prometheus-go-metric-exporter
// sanitizeRune converts anything that is not a letter or digit to an underscore
func sanitizeRune(r rune) rune {
	if unicode.IsLetter(r) || unicode.IsDigit(r) {
		return r
	}
	// Everything else turns into an underscore
	return '_'
}

// setExemplars sets the histogram exemplars.
func setExemplars(exemplarsData []exemplarData, timestamp pcommon.Timestamp, exemplars pmetric.ExemplarSlice) {
	es := pmetric.NewExemplarSlice()
	es.EnsureCapacity(len(exemplarsData))

	for _, ed := range exemplarsData {
		value := ed.value
		traceID := ed.traceID
		spanID := ed.spanID

		exemplar := es.AppendEmpty()

		if traceID.IsEmpty() {
			continue
		}

		exemplar.SetDoubleValue(value)
		exemplar.SetTimestamp(timestamp)
		exemplar.SetTraceID(traceID)
		exemplar.SetSpanID(spanID)
	}

	es.CopyTo(exemplars)
}

func SpanKindStr(sk ptrace.SpanKind) string {
	switch sk {
	case ptrace.SpanKindUnspecified:
		return "SPAN_KIND_UNSPECIFIED"
	case ptrace.SpanKindInternal:
		return "SPAN_KIND_INTERNAL"
	case ptrace.SpanKindServer:
		return "SPAN_KIND_SERVER"
	case ptrace.SpanKindClient:
		return "SPAN_KIND_CLIENT"
	case ptrace.SpanKindProducer:
		return "SPAN_KIND_PRODUCER"
	case ptrace.SpanKindConsumer:
		return "SPAN_KIND_CONSUMER"
	}
	return ""
}

func StatusCodeStr(sk ptrace.StatusCode) string {
	switch sk {
	case ptrace.StatusCodeUnset:
		return "STATUS_CODE_UNSET"
	case ptrace.StatusCodeOk:
		return "STATUS_CODE_OK"
	case ptrace.StatusCodeError:
		return "STATUS_CODE_ERROR"
	}
	return ""
}
