// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package testdata

import (
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"
)

var (
	TestMetricStartTime      = time.Date(2020, 2, 11, 20, 26, 12, 321, time.UTC)
	TestMetricStartTimestamp = pcommon.NewTimestampFromTime(TestMetricStartTime)

	TestMetricExemplarTime      = time.Date(2020, 2, 11, 20, 26, 13, 123, time.UTC)
	TestMetricExemplarTimestamp = pcommon.NewTimestampFromTime(TestMetricExemplarTime)

	TestMetricTime      = time.Date(2020, 2, 11, 20, 26, 13, 789, time.UTC)
	TestMetricTimestamp = pcommon.NewTimestampFromTime(TestMetricTime)
)

const (
	TestGaugeDoubleMetricName          = "gauge-double"
	TestGaugeIntMetricName             = "gauge-int"
	TestSumDoubleMetricName            = "counter-double"
	TestSumIntMetricName               = "counter-int"
	TestDoubleHistogramMetricName      = "double-histogram"
	TestDoubleSummaryMetricName        = "double-summary"
	TestExponentialHistogramMetricName = "exponential-histogram"
)

func GenerateMetricsOneEmptyResourceMetrics() pmetric.Metrics {
	md := pmetric.NewMetrics()
	md.ResourceMetrics().AppendEmpty()
	return md
}

func GenerateMetricsNoLibraries() pmetric.Metrics {
	md := GenerateMetricsOneEmptyResourceMetrics()
	ms0 := md.ResourceMetrics().At(0)
	initResource1(ms0.Resource())
	return md
}

func GenerateMetricsOneEmptyInstrumentationLibrary() pmetric.Metrics {
	md := GenerateMetricsNoLibraries()
	md.ResourceMetrics().At(0).ScopeMetrics().AppendEmpty()
	return md
}

func GenerateMetricsOneMetricNoResource() pmetric.Metrics {
	md := GenerateMetricsOneEmptyResourceMetrics()
	rm0 := md.ResourceMetrics().At(0)
	rm0ils0 := rm0.ScopeMetrics().AppendEmpty()
	initSumIntMetric(rm0ils0.Metrics().AppendEmpty())
	return md
}

func GenerateMetricsOneMetric() pmetric.Metrics {
	md := GenerateMetricsOneEmptyInstrumentationLibrary()
	rm0ils0 := md.ResourceMetrics().At(0).ScopeMetrics().At(0)
	initSumIntMetric(rm0ils0.Metrics().AppendEmpty())
	return md
}

func GenerateMetricsTwoMetrics() pmetric.Metrics {
	md := GenerateMetricsOneEmptyInstrumentationLibrary()
	rm0ils0 := md.ResourceMetrics().At(0).ScopeMetrics().At(0)
	initSumIntMetric(rm0ils0.Metrics().AppendEmpty())
	initSumIntMetric(rm0ils0.Metrics().AppendEmpty())
	return md
}

func GenerateMetricsOneCounterOneSummaryMetrics() pmetric.Metrics {
	md := GenerateMetricsOneEmptyInstrumentationLibrary()
	rm0ils0 := md.ResourceMetrics().At(0).ScopeMetrics().At(0)
	initSumIntMetric(rm0ils0.Metrics().AppendEmpty())
	initDoubleSummaryMetric(rm0ils0.Metrics().AppendEmpty())
	return md
}

func GenerateMetricsOneMetricNoAttributes() pmetric.Metrics {
	md := GenerateMetricsOneMetric()
	dps := md.ResourceMetrics().At(0).ScopeMetrics().At(0).Metrics().At(0).Sum().DataPoints()
	pcommon.NewMap().CopyTo(dps.At(0).Attributes())
	pcommon.NewMap().CopyTo(dps.At(1).Attributes())
	return md
}

func GenerateMetricsAllTypesNoDataPoints() pmetric.Metrics {
	md := GenerateMetricsOneEmptyInstrumentationLibrary()
	ilm0 := md.ResourceMetrics().At(0).ScopeMetrics().At(0)
	ms := ilm0.Metrics()
	initMetric(ms.AppendEmpty(), TestGaugeDoubleMetricName, pmetric.MetricTypeGauge)
	initMetric(ms.AppendEmpty(), TestGaugeIntMetricName, pmetric.MetricTypeGauge)
	initMetric(ms.AppendEmpty(), TestSumDoubleMetricName, pmetric.MetricTypeSum)
	initMetric(ms.AppendEmpty(), TestSumIntMetricName, pmetric.MetricTypeSum)
	initMetric(ms.AppendEmpty(), TestDoubleHistogramMetricName, pmetric.MetricTypeHistogram)
	initMetric(ms.AppendEmpty(), TestDoubleSummaryMetricName, pmetric.MetricTypeSummary)
	return md
}

func GenerateMetricsAllTypesEmptyDataPoint() pmetric.Metrics {
	md := GenerateMetricsOneEmptyInstrumentationLibrary()
	ilm0 := md.ResourceMetrics().At(0).ScopeMetrics().At(0)
	ms := ilm0.Metrics()

	doubleGauge := ms.AppendEmpty()
	initMetric(doubleGauge, TestGaugeDoubleMetricName, pmetric.MetricTypeGauge)
	doubleGauge.Gauge().DataPoints().AppendEmpty()
	intGauge := ms.AppendEmpty()
	initMetric(intGauge, TestGaugeIntMetricName, pmetric.MetricTypeGauge)
	intGauge.Gauge().DataPoints().AppendEmpty()
	doubleSum := ms.AppendEmpty()
	initMetric(doubleSum, TestSumDoubleMetricName, pmetric.MetricTypeSum)
	doubleSum.Sum().DataPoints().AppendEmpty()
	intSum := ms.AppendEmpty()
	initMetric(intSum, TestSumIntMetricName, pmetric.MetricTypeSum)
	intSum.Sum().DataPoints().AppendEmpty()
	histogram := ms.AppendEmpty()
	initMetric(histogram, TestDoubleHistogramMetricName, pmetric.MetricTypeHistogram)
	histogram.Histogram().DataPoints().AppendEmpty()
	summary := ms.AppendEmpty()
	initMetric(summary, TestDoubleSummaryMetricName, pmetric.MetricTypeSummary)
	summary.Summary().DataPoints().AppendEmpty()
	exphist := ms.AppendEmpty()
	initMetric(exphist, TestExponentialHistogramMetricName, pmetric.MetricTypeExponentialHistogram)
	exphist.ExponentialHistogram().DataPoints().AppendEmpty()
	return md
}

func GenerateMetricsMetricTypeInvalid() pmetric.Metrics {
	md := GenerateMetricsOneEmptyInstrumentationLibrary()
	ilm0 := md.ResourceMetrics().At(0).ScopeMetrics().At(0)
	initMetric(ilm0.Metrics().AppendEmpty(), TestSumIntMetricName, pmetric.MetricTypeEmpty)
	return md
}

func GeneratMetricsAllTypesWithSampleDatapoints() pmetric.Metrics {
	md := GenerateMetricsOneEmptyInstrumentationLibrary()

	ilm := md.ResourceMetrics().At(0).ScopeMetrics().At(0)
	ms := ilm.Metrics()
	initGaugeIntMetric(ms.AppendEmpty())
	initGaugeDoubleMetric(ms.AppendEmpty())
	initSumIntMetric(ms.AppendEmpty())
	initSumDoubleMetric(ms.AppendEmpty())
	initDoubleHistogramMetric(ms.AppendEmpty())
	initDoubleSummaryMetric(ms.AppendEmpty())

	return md
}

func initGaugeIntMetric(im pmetric.Metric) {
	initMetric(im, TestGaugeIntMetricName, pmetric.MetricTypeGauge)

	idps := im.Gauge().DataPoints()
	idp0 := idps.AppendEmpty()
	initMetricAttributes1(idp0.Attributes())
	idp0.SetStartTimestamp(TestMetricStartTimestamp)
	idp0.SetTimestamp(TestMetricTimestamp)
	idp0.SetIntValue(123)
	idp1 := idps.AppendEmpty()
	initMetricAttributes2(idp1.Attributes())
	idp1.SetStartTimestamp(TestMetricStartTimestamp)
	idp1.SetTimestamp(TestMetricTimestamp)
	idp1.SetIntValue(456)
}

func initGaugeDoubleMetric(im pmetric.Metric) {
	initMetric(im, TestGaugeDoubleMetricName, pmetric.MetricTypeGauge)

	idps := im.Gauge().DataPoints()
	idp0 := idps.AppendEmpty()
	initMetricAttributes12(idp0.Attributes())
	idp0.SetStartTimestamp(TestMetricStartTimestamp)
	idp0.SetTimestamp(TestMetricTimestamp)
	idp0.SetDoubleValue(1.23)
	idp1 := idps.AppendEmpty()
	initMetricAttributes13(idp1.Attributes())
	idp1.SetStartTimestamp(TestMetricStartTimestamp)
	idp1.SetTimestamp(TestMetricTimestamp)
	idp1.SetDoubleValue(4.56)
}

func initSumIntMetric(im pmetric.Metric) {
	initMetric(im, TestSumIntMetricName, pmetric.MetricTypeSum)

	idps := im.Sum().DataPoints()
	idp0 := idps.AppendEmpty()
	initMetricAttributes1(idp0.Attributes())
	idp0.SetStartTimestamp(TestMetricStartTimestamp)
	idp0.SetTimestamp(TestMetricTimestamp)
	idp0.SetIntValue(123)
	idp1 := idps.AppendEmpty()
	initMetricAttributes2(idp1.Attributes())
	idp1.SetStartTimestamp(TestMetricStartTimestamp)
	idp1.SetTimestamp(TestMetricTimestamp)
	idp1.SetIntValue(456)
}

func initSumDoubleMetric(dm pmetric.Metric) {
	initMetric(dm, TestSumDoubleMetricName, pmetric.MetricTypeSum)

	ddps := dm.Sum().DataPoints()
	ddp0 := ddps.AppendEmpty()
	initMetricAttributes12(ddp0.Attributes())
	ddp0.SetStartTimestamp(TestMetricStartTimestamp)
	ddp0.SetTimestamp(TestMetricTimestamp)
	ddp0.SetDoubleValue(1.23)

	ddp1 := ddps.AppendEmpty()
	initMetricAttributes13(ddp1.Attributes())
	ddp1.SetStartTimestamp(TestMetricStartTimestamp)
	ddp1.SetTimestamp(TestMetricTimestamp)
	ddp1.SetDoubleValue(4.56)
}

func initDoubleHistogramMetric(hm pmetric.Metric) {
	initMetric(hm, TestDoubleHistogramMetricName, pmetric.MetricTypeHistogram)

	hdps := hm.Histogram().DataPoints()
	hdp0 := hdps.AppendEmpty()
	initMetricAttributes13(hdp0.Attributes())
	hdp0.SetStartTimestamp(TestMetricStartTimestamp)
	hdp0.SetTimestamp(TestMetricTimestamp)
	hdp0.SetCount(1)
	hdp0.SetSum(15)
	hdp1 := hdps.AppendEmpty()
	initMetricAttributes2(hdp1.Attributes())
	hdp1.SetStartTimestamp(TestMetricStartTimestamp)
	hdp1.SetTimestamp(TestMetricTimestamp)
	hdp1.SetCount(1)
	hdp1.SetSum(15)
	hdp1.BucketCounts().FromRaw([]uint64{0, 1})
	exemplar := hdp1.Exemplars().AppendEmpty()
	exemplar.SetTimestamp(TestMetricExemplarTimestamp)
	exemplar.SetDoubleValue(15)
	initMetricAttachment(exemplar.FilteredAttributes())
	hdp1.ExplicitBounds().FromRaw([]float64{1})
}

func initDoubleSummaryMetric(sm pmetric.Metric) {
	initMetric(sm, TestDoubleSummaryMetricName, pmetric.MetricTypeSummary)

	sdps := sm.Summary().DataPoints()
	sdp0 := sdps.AppendEmpty()
	initMetricAttributes13(sdp0.Attributes())
	sdp0.SetStartTimestamp(TestMetricStartTimestamp)
	sdp0.SetTimestamp(TestMetricTimestamp)
	sdp0.SetCount(1)
	sdp0.SetSum(15)
	sdp1 := sdps.AppendEmpty()
	initMetricAttributes2(sdp1.Attributes())
	sdp1.SetStartTimestamp(TestMetricStartTimestamp)
	sdp1.SetTimestamp(TestMetricTimestamp)
	sdp1.SetCount(1)
	sdp1.SetSum(15)

	quantile := sdp1.QuantileValues().AppendEmpty()
	quantile.SetQuantile(0.01)
	quantile.SetValue(15)
}

func initMetric(m pmetric.Metric, name string, ty pmetric.MetricType) {
	m.SetName(name)
	m.SetDescription("")
	m.SetUnit("1")
	switch ty {
	case pmetric.MetricTypeGauge:
		m.SetEmptyGauge()

	case pmetric.MetricTypeSum:
		sum := m.SetEmptySum()
		sum.SetIsMonotonic(true)
		sum.SetAggregationTemporality(pmetric.AggregationTemporalityCumulative)

	case pmetric.MetricTypeHistogram:
		histo := m.SetEmptyHistogram()
		histo.SetAggregationTemporality(pmetric.AggregationTemporalityCumulative)

	case pmetric.MetricTypeExponentialHistogram:
		m.SetEmptyExponentialHistogram()

	case pmetric.MetricTypeSummary:
		m.SetEmptySummary()
	}
}

func GenerateMetricsManyMetricsSameResource(metricsCount int) pmetric.Metrics {
	md := GenerateMetricsOneEmptyInstrumentationLibrary()
	rs0ilm0 := md.ResourceMetrics().At(0).ScopeMetrics().At(0)
	rs0ilm0.Metrics().EnsureCapacity(metricsCount)
	for i := 0; i < metricsCount; i++ {
		initSumIntMetric(rs0ilm0.Metrics().AppendEmpty())
	}
	return md
}
