package querier

import (
	"log/slog"
	"math"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRemoveAllVarMatchers(t *testing.T) {
	logger := slog.Default()
	q := &promqlQuery{logger: logger, parser: prometheus.NewParser()}

	tests := []struct {
		name      string
		query     string
		vars      map[string]qbv5.VariableItem
		expected  string
		expectErr bool
	}{
		{
			name:  "remove $var pattern with __all__",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "remove {{var}} pattern with __all__",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"{{host.name}}"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "remove [[var]] pattern with __all__",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"[[host.name]]"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "multiple variables, one with __all__",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name", "env"="$env"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
				"env": {
					Type:  qbv5.DynamicVariableType,
					Value: "production",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time",env="$env"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "no __all__ variables, query unchanged",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "host1",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "non-dynamic variable type, not removed",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.QueryVariableType,
					Value: "__all__",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "invalid PromQL query",
			query: `invalid promql query syntax {`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  "",
			expectErr: true,
		},
		{
			name:  "invalid PromQL query with mismatched brackets",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  "",
			expectErr: true,
		},
		{
			name:      "empty vars map",
			query:     `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars:      map[string]qbv5.VariableItem{},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "multiple matchers with __all__ variable",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name", "env"="$env", "region"=~"$region"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
				"env": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
				"region": {
					Type:  qbv5.DynamicVariableType,
					Value: "us-east",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time",region=~"$region"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "__all__ value not string type",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: 123, // Not a string
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := q.removeAllVarMatchers(tt.query, tt.vars)
			if tt.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result, "removeAllVarMatchers(%q) with vars=%v", tt.query, tt.vars)
			}
		})
	}
}

func TestEnhancePromQLError(t *testing.T) {
	parseErr := errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "unexpected character: '.' at position 12")

	t.Run("dotted name patterns", func(t *testing.T) {
		tests := []struct {
			name                  string
			query                 string
			wantDottedNameHint    bool
			wantDottedNameExample string
		}{
			{
				name:                  "query with unquoted dotted metric name",
				query:                 `sum(rate(k8s.container.restarts[5m]))`,
				wantDottedNameHint:    true,
				wantDottedNameExample: "k8s.container.restarts",
			},
			{
				name:                  "query with unquoted dotted label in group by",
				query:                 `sum by (k8s.pod.name) (rate(requests_total[5m]))`,
				wantDottedNameHint:    true,
				wantDottedNameExample: "k8s.pod.name",
			},
			{
				name:                  "query with unquoted dotted label in filter",
				query:                 `requests_total{k8s.namespace.name="default"}`,
				wantDottedNameHint:    true,
				wantDottedNameExample: "k8s.namespace.name",
			},
			{
				name:                  "query with multiple unquoted dotted names",
				query:                 `sum by (k8s.pod.name, deployment.environment) (increase(k8s.container.restarts[15m]))`,
				wantDottedNameHint:    true,
				wantDottedNameExample: "k8s.pod.name", // should match first one
			},
			{
				name:               "query without dotted names - no hint",
				query:              `sum(rate(http_requests_total[5m]))`,
				wantDottedNameHint: false,
			},
			{
				name:               "query with properly quoted dotted names - no hint",
				query:              `sum(rate({"k8s.container.restarts"}[5m]))`,
				wantDottedNameHint: false,
			},
			{
				name:               "query with dotted name inside regex string - no hint",
				query:              `requests_total{pod=~"k8s.pod.name.*"}`,
				wantDottedNameHint: false,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				err := enhancePromQLError(tt.query, parseErr)
				errMsg := err.Error()

				assert.True(t, strings.Contains(errMsg, parseErr.Error()),
					"error should contain original parse error message")

				if tt.wantDottedNameHint {
					assert.True(t, strings.Contains(errMsg, "Hint:"),
						"error should contain hint for dotted name query")
					assert.True(t, strings.Contains(errMsg, "UTF-8 syntax"),
						"error should mention UTF-8 syntax")
					assert.True(t, strings.Contains(errMsg, tt.wantDottedNameExample),
						"error should contain the dotted name example: %s", tt.wantDottedNameExample)
				} else {
					assert.False(t, strings.Contains(errMsg, "Hint:"),
						"error should not contain hint for non-dotted-name query")
				}
			})
		}
	})

	t.Run("quoted metric outside braces patterns", func(t *testing.T) {
		tests := []struct {
			name             string
			query            string
			wantHint         bool
			wantMetricInHint string
		}{
			{
				name:             "quoted metric name followed by selector",
				query:            `"kube_pod_status_ready_time"{"condition"="true"}`,
				wantHint:         true,
				wantMetricInHint: "kube_pod_status_ready_time",
			},
			{
				name:             "quoted metric with space before brace",
				query:            `"kube_pod_labels" {"label"!=""}`,
				wantHint:         true,
				wantMetricInHint: "kube_pod_labels",
			},
			{
				name:             "complex query with quoted metric outside braces",
				query:            `min by (namespace) ("kube_pod_status_ready_time"{"condition"="true"})`,
				wantHint:         true,
				wantMetricInHint: "kube_pod_status_ready_time",
			},
			{
				name:             "label_replace with quoted metric outside braces",
				query:            `label_replace("kube_pod_labels"{"label_cnpg_io_cluster"!=""}, "cluster","$1","label","(.+)")`,
				wantHint:         true,
				wantMetricInHint: "kube_pod_labels",
			},
			{
				name:     "correctly formatted query - no hint",
				query:    `{"kube_pod_status_ready_time", condition="true"}`,
				wantHint: false,
			},
			{
				name:     "old syntax without quotes - no hint for this pattern",
				query:    `kube_pod_status_ready_time{condition="true"}`,
				wantHint: false,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				err := enhancePromQLError(tt.query, parseErr)
				errMsg := err.Error()

				assert.True(t, strings.Contains(errMsg, parseErr.Error()),
					"error should contain original parse error message")

				if tt.wantHint {
					assert.True(t, strings.Contains(errMsg, "Hint:"),
						"error should contain hint")
					assert.True(t, strings.Contains(errMsg, "inside the braces"),
						"error should mention putting metric inside braces")
					assert.True(t, strings.Contains(errMsg, tt.wantMetricInHint),
						"error should contain the metric name: %s", tt.wantMetricInHint)
				}
			})
		}
	})
}

func TestUnquotedDottedNamePattern(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string // empty string means no match expected
	}{
		{
			name:     "metric name at start",
			input:    "k8s.pod.name",
			expected: "k8s.pod.name",
		},
		{
			name:     "label in group by clause",
			input:    "sum by (k8s.pod.name) (rate(x[5m]))",
			expected: "k8s.pod.name",
		},
		{
			name:     "label in filter",
			input:    "metric{k8s.namespace.name=\"default\"}",
			expected: "k8s.namespace.name",
		},
		{
			name:     "metric with underscore and dots",
			input:    "http_server.request.duration",
			expected: "http_server.request.duration",
		},
		{
			name:     "quoted metric name - no match",
			input:    `{"k8s.pod.name"}`,
			expected: "",
		},
		{
			name:     "inside regex string - no match",
			input:    `{pod=~"k8s.pod.name.*"}`,
			expected: "",
		},
		{
			name:     "simple metric without dots - no match",
			input:    "http_requests_total",
			expected: "",
		},
		{
			name:     "single dot only - no match",
			input:    "a.b",
			expected: "a.b",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			matches := unquotedDottedNamePattern.FindStringSubmatch(tt.input)
			if tt.expected == "" {
				assert.True(t, len(matches) < 2 || matches[1] == "",
					"expected no match for input %q but got %v", tt.input, matches)
			} else {
				assert.True(t, len(matches) >= 2,
					"expected match for input %q but got none", tt.input)
				if len(matches) >= 2 {
					assert.Equal(t, tt.expected, matches[1],
						"unexpected match for input %q", tt.input)
				}
			}
		})
	}
}

func TestQuotedMetricOutsideBracesPattern(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string // empty string means no match expected
	}{
		{
			name:     "quoted metric followed by braces",
			input:    `"kube_pod_status_ready_time"{"condition"="true"}`,
			expected: "kube_pod_status_ready_time",
		},
		{
			name:     "quoted metric with space before brace",
			input:    `"kube_pod_labels" {"label"!=""}`,
			expected: "kube_pod_labels",
		},
		{
			name:     "quoted metric in label_replace",
			input:    `label_replace("kube_pod_labels"{"x"="y"}, "a","b","c","d")`,
			expected: "kube_pod_labels",
		},
		{
			name:     "quoted metric with dots",
			input:    `"k8s.container.restarts"{"pod"="test"}`,
			expected: "k8s.container.restarts",
		},
		{
			name:     "correct UTF-8 syntax - no match",
			input:    `{"kube_pod_status_ready_time", condition="true"}`,
			expected: "",
		},
		{
			name:     "old syntax without quotes - no match",
			input:    `kube_pod_status_ready_time{condition="true"}`,
			expected: "",
		},
		{
			name:     "quoted string in label value - no match",
			input:    `metric{label="value"}{other="x"}`,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			matches := quotedMetricOutsideBracesPattern.FindStringSubmatch(tt.input)
			if tt.expected == "" {
				assert.True(t, len(matches) < 2 || matches[1] == "",
					"expected no match for input %q but got %v", tt.input, matches)
			} else {
				assert.True(t, len(matches) >= 2,
					"expected match for input %q but got none", tt.input)
				if len(matches) >= 2 {
					assert.Equal(t, tt.expected, matches[1],
						"unexpected match for input %q", tt.input)
				}
			}
		})
	}
}

// A pinned request must not share cache entries with default serving: a
// cached default result would satisfy the pin without running the pinned
// provider.
func TestFingerprint_PinnedProviderBypassesCache(t *testing.T) {
	q := &promqlQuery{
		logger: slog.Default(),
		query:  qbv5.PromQuery{Query: "up"},
		opts:   promqlOptions{serve: &prometheustest.Provider{}},
	}
	assert.Empty(t, q.Fingerprint())
}

func TestToResultDropsNonFiniteValues(t *testing.T) {
	tests := []struct {
		description        string
		floats             []promql.FPoint
		expectedTimestamps []int64
		expectedValues     []float64
	}{
		{
			description:        "finite values pass through untouched",
			floats:             []promql.FPoint{{T: 1000, F: 1.5}, {T: 2000, F: 2.5}},
			expectedTimestamps: []int64{1000, 2000},
			expectedValues:     []float64{1.5, 2.5},
		},
		{
			description:        "a ratio's 0/0 points are dropped, the rest kept",
			floats:             []promql.FPoint{{T: 1000, F: 1.5}, {T: 2000, F: math.NaN()}, {T: 3000, F: 2.5}},
			expectedTimestamps: []int64{1000, 3000},
			expectedValues:     []float64{1.5, 2.5},
		},
		{
			description:        "both infinities are dropped",
			floats:             []promql.FPoint{{T: 1000, F: math.Inf(1)}, {T: 2000, F: 4.5}, {T: 3000, F: math.Inf(-1)}},
			expectedTimestamps: []int64{2000},
			expectedValues:     []float64{4.5},
		},
	}

	for _, test := range tests {
		t.Run(test.description, func(t *testing.T) {
			q := &promqlQuery{query: qbv5.PromQuery{Name: "A"}, requestType: qbv5.RequestTypeTimeSeries}
			matrix := promql.Matrix{{Metric: labels.FromStrings("job_name", "dbBloatMonitorJob"), Floats: test.floats}}

			var mu sync.Mutex
			var rows, bytes uint64
			result, err := q.toResult(matrix, nil, time.Now(), &mu, &rows, &bytes)
			require.NoError(t, err)

			tsData, ok := result.Value.(*qbv5.TimeSeriesData)
			require.True(t, ok)
			require.Len(t, tsData.Aggregations, 1)
			require.Len(t, tsData.Aggregations[0].Series, 1)

			timestamps := make([]int64, 0, len(test.expectedTimestamps))
			values := make([]float64, 0, len(test.expectedValues))
			for _, v := range tsData.Aggregations[0].Series[0].Values {
				timestamps = append(timestamps, v.Timestamp)
				values = append(values, v.Value)
			}
			assert.Equal(t, test.expectedTimestamps, timestamps)
			assert.Equal(t, test.expectedValues, values)
		})
	}
}

// A series left with nothing must not surface as an empty series, and a result
// left with no series must carry no aggregation bucket at all — the cache reads
// a bucket holding no series as a real, filtered-to-empty result and stores it.
func TestToResultDropsSeriesAndBucketLeftEmpty(t *testing.T) {
	q := &promqlQuery{query: qbv5.PromQuery{Name: "A"}, requestType: qbv5.RequestTypeTimeSeries}
	matrix := promql.Matrix{
		{Metric: labels.FromStrings("job_name", "idleJob"), Floats: []promql.FPoint{{T: 1000, F: math.NaN()}}},
		{Metric: labels.FromStrings("job_name", "activeJob"), Floats: []promql.FPoint{{T: 1000, F: 7.5}}},
	}

	var mu sync.Mutex
	var rows, bytes uint64
	result, err := q.toResult(matrix, nil, time.Now(), &mu, &rows, &bytes)
	require.NoError(t, err)
	tsData, ok := result.Value.(*qbv5.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)
	require.Len(t, tsData.Aggregations[0].Series, 1, "the all-NaN series is gone")
	assert.Equal(t, "activeJob", tsData.Aggregations[0].Series[0].Labels[0].Value)

	allNaN := promql.Matrix{
		{Metric: labels.FromStrings("job_name", "idleJob"), Floats: []promql.FPoint{{T: 1000, F: math.NaN()}}},
	}
	result, err = q.toResult(allNaN, nil, time.Now(), &mu, &rows, &bytes)
	require.NoError(t, err)
	tsData, ok = result.Value.(*qbv5.TimeSeriesData)
	require.True(t, ok)
	assert.Empty(t, tsData.Aggregations)
}
