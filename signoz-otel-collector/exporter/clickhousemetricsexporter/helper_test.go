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

package clickhousemetricsexporter

import (
	"math"
	"testing"
	"time"

	"github.com/prometheus/prometheus/model/timestamp"
	"github.com/prometheus/prometheus/prompb"
	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"
)

// Test_validateMetrics checks validateMetrics return true if a type and temporality combination is valid, false
// otherwise.
func Test_validateMetrics(t *testing.T) {

	// define a single test
	type combTest struct {
		name   string
		metric pmetric.Metric
		want   bool
	}

	tests := []combTest{}

	// append true cases
	for k, validMetric := range validMetrics1 {
		name := "valid_" + k

		tests = append(tests, combTest{
			name,
			validMetric,
			true,
		})
	}

	for k, invalidMetric := range invalidMetrics {
		name := "invalid_" + k

		tests = append(tests, combTest{
			name,
			invalidMetric,
			false,
		})
	}

	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validateMetrics(tt.metric)
			assert.Equal(t, tt.want, got)
		})
	}
}

// Test_addSample checks addSample updates the map it receives correctly based on the sample and Label
// set it receives.
// Test cases are two samples belonging to the same TimeSeries,  two samples belong to different TimeSeries, and nil
// case.
func Test_addSample(t *testing.T) {
	type testCase struct {
		metric pmetric.Metric
		sample prompb.Sample
		labels []prompb.Label
	}

	tests := []struct {
		name     string
		orig     map[string]*prompb.TimeSeries
		testCase []testCase
		want     map[string]*prompb.TimeSeries
	}{
		{
			"two_points_same_ts_same_metric",
			map[string]*prompb.TimeSeries{},
			[]testCase{
				{validMetrics1[validDoubleGauge],
					getSample(floatVal1, msTime1),
					promLbs1,
				},
				{
					validMetrics1[validDoubleGauge],
					getSample(floatVal2, msTime2),
					promLbs1,
				},
			},
			twoPointsSameTs,
		},
		{
			"two_points_different_ts_same_metric",
			map[string]*prompb.TimeSeries{},
			[]testCase{
				{validMetrics1[validIntGauge],
					getSample(float64(intVal1), msTime1),
					promLbs1,
				},
				{validMetrics1[validIntGauge],
					getSample(float64(intVal1), msTime2),
					promLbs2,
				},
			},
			twoPointsDifferentTs,
		},
	}
	t.Run("empty_case", func(t *testing.T) {
		tsMap := map[string]*prompb.TimeSeries{}
		addSample(tsMap, nil, nil, pmetric.NewMetric())
		assert.Exactly(t, tsMap, map[string]*prompb.TimeSeries{})
	})
	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			addSample(tt.orig, &tt.testCase[0].sample, tt.testCase[0].labels, tt.testCase[0].metric)
			addSample(tt.orig, &tt.testCase[1].sample, tt.testCase[1].labels, tt.testCase[1].metric)
			assert.Exactly(t, tt.want, tt.orig)
		})
	}
}

// Test_timeSeries checks timeSeriesSignature returns consistent and unique signatures for a distinct label set and
// metric type combination.
func Test_timeSeriesSignature(t *testing.T) {
	tests := []struct {
		name   string
		lbs    []prompb.Label
		metric pmetric.Metric
		want   string
	}{
		{
			"int64_signature",
			promLbs1,
			validMetrics1[validIntGauge],
			validMetrics1[validIntGauge].Type().String() + lb1Sig,
		},
		{
			"histogram_signature",
			promLbs2,
			validMetrics1[validHistogram],
			validMetrics1[validHistogram].Type().String() + lb2Sig,
		},
		{
			"unordered_signature",
			getPromLabels(label22, value22, label21, value21),
			validMetrics1[validHistogram],
			validMetrics1[validHistogram].Type().String() + lb2Sig,
		},
		// descriptor type cannot be nil, as checked by validateMetrics
		{
			"nil_case",
			nil,
			validMetrics1[validHistogram],
			validMetrics1[validHistogram].Type().String(),
		},
	}

	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.EqualValues(t, tt.want, timeSeriesSignature(tt.metric, &tt.lbs))
		})
	}
}

// Test_createLabelSet checks resultant label names are sanitized and label in extra overrides label in labels if
// collision happens. It does not check whether labels are not sorted
func Test_createLabelSet(t *testing.T) {
	tests := []struct {
		name           string
		resource       pcommon.Resource
		orig           pcommon.Map
		externalLabels map[string]string
		extras         []string
		want           []prompb.Label
	}{
		{
			"labels_clean",
			getResource(),
			lbs1,
			map[string]string{},
			[]string{label31, value31, label32, value32},
			getPromLabels(label11, value11, label12, value12, label31, value31, label32, value32),
		},
		{
			"labels_with_resource",
			getResource("job", "prometheus", "instance", "127.0.0.1:8080"),
			lbs1,
			map[string]string{},
			[]string{label31, value31, label32, value32},
			getPromLabels(label11, value11, label12, value12, label31, value31, label32, value32, "job", "prometheus", "instance", "127.0.0.1:8080"),
		},
		{
			"labels_duplicate_in_extras",
			getResource(),
			lbs1,
			map[string]string{},
			[]string{label11, value31},
			getPromLabels(label11, value31, label12, value12),
		},
		{
			"labels_dirty",
			getResource(),
			lbs1Dirty,
			map[string]string{},
			[]string{label31 + dirty1, value31, label32, value32},
			getPromLabels(label11+"_", value11, "key_"+label12, value12, label31+"_", value31, label32, value32),
		},
		{
			"no_original_case",
			getResource(),
			pcommon.NewMap(),
			nil,
			[]string{label31, value31, label32, value32},
			getPromLabels(label31, value31, label32, value32),
		},
		{
			"empty_extra_case",
			getResource(),
			lbs1,
			map[string]string{},
			[]string{"", ""},
			getPromLabels(label11, value11, label12, value12, "", ""),
		},
		{
			"single_left_over_case",
			getResource(),
			lbs1,
			map[string]string{},
			[]string{label31, value31, label32},
			getPromLabels(label11, value11, label12, value12, label31, value31),
		},
		{
			"valid_external_labels",
			getResource(),
			lbs1,
			exlbs1,
			[]string{label31, value31, label32, value32},
			getPromLabels(label11, value11, label12, value12, label41, value41, label31, value31, label32, value32),
		},
		{
			"overwritten_external_labels",
			getResource(),
			lbs1,
			exlbs2,
			[]string{label31, value31, label32, value32},
			getPromLabels(label11, value11, label12, value12, label31, value31, label32, value32),
		},
	}
	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.ElementsMatch(t, tt.want, createAttributes(tt.resource, tt.orig, tt.externalLabels, tt.extras...))
		})
	}
}

// Tes_getPromMetricName checks if OTLP metric names are converted to Cortex metric names correctly.
// Test cases are empty namespace, monotonic metrics that require a total suffix, and metric names that contains
// invalid characters.
func Test_getPromMetricName(t *testing.T) {
	tests := []struct {
		name   string
		metric pmetric.Metric
		ns     string
		want   string
	}{
		{
			"empty_case",
			invalidMetrics[empty],
			ns1,
			"test_ns_",
		},
		{
			"normal_case",
			validMetrics1[validDoubleGauge],
			ns1,
			"test_ns_" + validDoubleGauge,
		},
		{
			"empty_namespace",
			validMetrics1[validDoubleGauge],
			"",
			validDoubleGauge,
		},
		{
			// Ensure removed functionality stays removed.
			// See https://github.com/open-telemetry/opentelemetry-collector/pull/2993 for context
			"no_counter_suffix",
			validMetrics1[validIntSum],
			ns1,
			"test_ns_" + validIntSum,
		},
		{
			"dirty_string",
			validMetrics2[validIntGaugeDirty],
			"7" + ns1,
			"key_7test_ns__" + validIntGauge + "_",
		},
	}
	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, getPromMetricName(tt.metric, tt.ns))
		})
	}
}

// Test_batchTimeSeries checks batchTimeSeries return the correct number of requests
// depending on byte size.
func Test_batchTimeSeries(t *testing.T) {
	// First we will instantiate a dummy TimeSeries instance to pass into both the export call and compare the http request
	labels := getPromLabels(label11, value11, label12, value12, label21, value21, label22, value22)
	sample1 := getSample(floatVal1, msTime1)
	sample2 := getSample(floatVal2, msTime2)
	sample3 := getSample(floatVal3, msTime3)
	ts1 := getTimeSeries(labels, sample1, sample2)
	ts2 := getTimeSeries(labels, sample1, sample2, sample3)

	tsMap1 := getTimeseriesMap([]*prompb.TimeSeries{})
	tsMap2 := getTimeseriesMap([]*prompb.TimeSeries{ts1})
	tsMap3 := getTimeseriesMap([]*prompb.TimeSeries{ts1, ts2})

	tests := []struct {
		name                string
		tsMap               map[string]*prompb.TimeSeries
		maxBatchByteSize    int
		numExpectedRequests int
	}{
		{
			"no_timeseries",
			tsMap1,
			100,
			0,
		},
		{
			"normal_case",
			tsMap2,
			300,
			1,
		},
		{
			"two_requests",
			tsMap3,
			300,
			2,
		},
	}
	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requests := batchTimeSeries(tt.tsMap, tt.maxBatchByteSize)
			assert.Equal(t, tt.numExpectedRequests, len(requests))
		})
	}
}

// Ensure that before a prompb.WriteRequest is created, that the points per TimeSeries
// are sorted by Timestamp value, to prevent Prometheus from barfing when it gets poorly
// sorted values. See issues:
// * https://github.com/open-telemetry/wg-prometheus/issues/10
// * https://github.com/open-telemetry/opentelemetry-collector/issues/2315
func TestEnsureTimeseriesPointsAreSortedByTimestamp(t *testing.T) {
	outOfOrder := []prompb.TimeSeries{
		{
			Samples: []prompb.Sample{
				{
					Value:     10.11,
					Timestamp: 1000,
				},
				{
					Value:     7.81,
					Timestamp: 2,
				},
				{
					Value:     987.81,
					Timestamp: 1,
				},
				{
					Value:     18.22,
					Timestamp: 999,
				},
			},
		},
		{
			Samples: []prompb.Sample{
				{
					Value:     99.91,
					Timestamp: 5,
				},
				{
					Value:     4.33,
					Timestamp: 3,
				},
				{
					Value:     47.81,
					Timestamp: 4,
				},
				{
					Value:     18.22,
					Timestamp: 8,
				},
			},
		},
	}
	got := convertTimeseriesToRequest(outOfOrder)

	// We must ensure that the resulting Timeseries' sample points are sorted by Timestamp.
	want := &prompb.WriteRequest{
		Timeseries: []prompb.TimeSeries{
			{
				Samples: []prompb.Sample{
					{
						Value:     987.81,
						Timestamp: 1,
					},
					{
						Value:     7.81,
						Timestamp: 2,
					},
					{
						Value:     18.22,
						Timestamp: 999,
					},
					{
						Value:     10.11,
						Timestamp: 1000,
					},
				},
			},
			{
				Samples: []prompb.Sample{
					{
						Value:     4.33,
						Timestamp: 3,
					},
					{
						Value:     47.81,
						Timestamp: 4,
					},
					{
						Value:     99.91,
						Timestamp: 5,
					},
					{
						Value:     18.22,
						Timestamp: 8,
					},
				},
			},
		},
	}
	assert.Equal(t, got, want)

	// For a full sanity/logical check, assert that EVERY
	// Sample has a Timestamp bigger than its prior values.
	for ti, ts := range got.Timeseries {
		for i := range ts.Samples {
			si := ts.Samples[i]
			for j := 0; j < i; j++ {
				sj := ts.Samples[j]
				if sj.Timestamp > si.Timestamp {
					t.Errorf("Timeseries[%d]: Sample[%d].Timestamp(%d) > Sample[%d].Timestamp(%d)",
						ti, j, sj.Timestamp, i, si.Timestamp)
				}
			}
		}
	}
}

// Test_addExemplars checks addExemplars updates the map it receives correctly based on the exemplars and bucket bounds data it receives.
func Test_addExemplars(t *testing.T) {
	type testCase struct {
		exemplars    []prompb.Exemplar
		bucketBounds []bucketBoundsData
	}

	tests := []struct {
		name     string
		orig     map[string]*prompb.TimeSeries
		testCase []testCase
		want     map[string]*prompb.TimeSeries
	}{
		{
			"timeSeries_is_empty",
			map[string]*prompb.TimeSeries{},
			[]testCase{
				{
					[]prompb.Exemplar{getExemplar(float64(intVal1), msTime1)},
					getBucketBoundsData([]float64{1, 2, 3}),
				},
			},
			map[string]*prompb.TimeSeries{},
		},
		{
			"timeSeries_without_sample",
			tsWithoutSampleAndExemplar,
			[]testCase{
				{
					[]prompb.Exemplar{getExemplar(float64(intVal1), msTime1)},
					getBucketBoundsData([]float64{1, 2, 3}),
				},
			},
			tsWithoutSampleAndExemplar,
		},
		{
			"exemplar_value_less_than_bucket_bound",
			map[string]*prompb.TimeSeries{
				lb1Sig: getTimeSeries(getPromLabels(label11, value11, label12, value12),
					getSample(float64(intVal1), msTime1)),
			},
			[]testCase{
				{
					[]prompb.Exemplar{getExemplar(floatVal2, msTime1)},
					getBucketBoundsData([]float64{1, 2, 3}),
				},
			},
			tsWithSamplesAndExemplars,
		},
		{
			"infinite_bucket_bound",
			map[string]*prompb.TimeSeries{
				lb1Sig: getTimeSeries(getPromLabels(label11, value11, label12, value12),
					getSample(float64(intVal1), msTime1)),
			},
			[]testCase{
				{
					[]prompb.Exemplar{getExemplar(math.MaxFloat64, msTime1)},
					getBucketBoundsData([]float64{1, math.Inf(1)}),
				},
			},
			tsWithInfiniteBoundExemplarValue,
		},
	}
	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			addExemplars(tt.orig, tt.testCase[0].exemplars, tt.testCase[0].bucketBounds)
			assert.Exactly(t, tt.want, tt.orig)
		})
	}
}

// Test_getPromExemplars checks if exemplars is not nul and return the prometheus exemplars.
func Test_getPromExemplars(t *testing.T) {
	tnow := time.Now()
	tests := []struct {
		name      string
		histogram *pmetric.HistogramDataPoint
		expected  []prompb.Exemplar
	}{
		{
			"with_exemplars",
			getHistogramDataPointWithExemplars(tnow, floatVal1, traceIDKey, traceIDValue1),
			[]prompb.Exemplar{
				{
					Value:     floatVal1,
					Timestamp: timestamp.FromTime(tnow),
					Labels:    []prompb.Label{getLabel(traceIDKey, traceIDValue1)},
				},
			},
		},
		{
			"without_exemplar",
			getHistogramDataPoint(),
			nil,
		},
	}
	// run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requests := getPromExemplars(*tt.histogram)
			assert.Exactly(t, tt.expected, requests)
		})
	}
}
