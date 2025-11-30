package v2

import (
	"context"
	"fmt"
	"math"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	logsV4 "github.com/SigNoz/signoz/pkg/query-service/app/logs/v4"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	tracesV3 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v3"
	tracesV4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/querycache"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/valuer"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func minTimestamp(series []*v3.Series) int64 {
	min := int64(math.MaxInt64)
	for _, series := range series {
		for _, point := range series.Points {
			if point.Timestamp < min {
				min = point.Timestamp
			}
		}
	}
	return min
}

func maxTimestamp(series []*v3.Series) int64 {
	max := int64(math.MinInt64)
	for _, series := range series {
		for _, point := range series.Points {
			if point.Timestamp > max {
				max = point.Timestamp
			}
		}
	}
	return max
}

func TestV2FindMissingTimeRangesZeroFreshNess(t *testing.T) {
	// There are five scenarios:
	// 1. Cached time range is a subset of the requested time range
	// 2. Cached time range is a superset of the requested time range
	// 3. Cached time range is a left overlap of the requested time range
	// 4. Cached time range is a right overlap of the requested time range
	// 5. Cached time range is a disjoint of the requested time range
	testCases := []struct {
		name              string
		requestedStart    int64 // in milliseconds
		requestedEnd      int64 // in milliseconds
		requestedStep     int64 // in seconds
		cachedSeries      []*v3.Series
		expectedMiss      []querycache.MissInterval
		replaceCachedData bool
	}{
		{
			name:           "cached time range is a subset of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722 + 60*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 120*60*1000,
							Value:     1,
						},
					},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{
					Start: 1675115596722,
					End:   1675115596722 + 60*60*1000,
				},
				{
					Start: 1675115596722 + 120*60*1000,
					End:   1675115596722 + 180*60*1000,
				},
			},
		},
		{
			name:           "cached time range is a superset of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 60*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 120*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 180*60*1000,
							Value:     1,
						},
					},
				},
			},
			expectedMiss: []querycache.MissInterval{},
		},
		{
			name:           "cached time range is a left overlap of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 60*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 120*60*1000,
							Value:     1,
						},
					},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{
					Start: 1675115596722 + 120*60*1000,
					End:   1675115596722 + 180*60*1000,
				},
			},
		},
		{
			name:           "cached time range is a right overlap of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722 + 60*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 120*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 180*60*1000,
							Value:     1,
						},
					},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{
					Start: 1675115596722,
					End:   1675115596722 + 60*60*1000,
				},
			},
		},
		{
			name:           "cached time range is a disjoint of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722 + 240*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 300*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 360*60*1000,
							Value:     1,
						},
					},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{
					Start: 1675115596722,
					End:   1675115596722 + 180*60*1000,
				},
			},
			replaceCachedData: true,
		},
	}

	opts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	qc := querycache.NewQueryCache(querycache.WithCache(c))

	for idx, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cacheKey := fmt.Sprintf("test-cache-key-%d", idx)
			cachedData := querycache.CachedSeriesData{
				Start: minTimestamp(tc.cachedSeries),
				End:   maxTimestamp(tc.cachedSeries),
				Data:  tc.cachedSeries,
			}
			orgID := valuer.GenerateUUID()
			cacheableData := querycache.CacheableSeriesData{Series: []querycache.CachedSeriesData{cachedData}}
			err = c.Set(context.Background(), orgID, cacheKey, &cacheableData, 0)
			assert.NoError(t, err)

			misses := qc.FindMissingTimeRanges(orgID, tc.requestedStart, tc.requestedEnd, tc.requestedStep, cacheKey)
			if len(misses) != len(tc.expectedMiss) {
				t.Errorf("expected %d misses, got %d", len(tc.expectedMiss), len(misses))
			}

			for i, miss := range misses {
				if miss.Start != tc.expectedMiss[i].Start {
					t.Errorf("expected start %d, got %d", tc.expectedMiss[i].Start, miss.Start)
				}
				if miss.End != tc.expectedMiss[i].End {
					t.Errorf("expected end %d, got %d", tc.expectedMiss[i].End, miss.End)
				}
			}
		})
	}
}

func TestV2FindMissingTimeRangesWithFluxInterval(t *testing.T) {

	testCases := []struct {
		name           string
		requestedStart int64
		requestedEnd   int64
		requestedStep  int64
		cachedSeries   []*v3.Series
		fluxInterval   time.Duration
		expectedMiss   []querycache.MissInterval
	}{
		{
			name:           "cached time range is a subset of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722 + 60*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 120*60*1000,
							Value:     1,
						},
					},
				},
			},
			fluxInterval: 5 * time.Minute,
			expectedMiss: []querycache.MissInterval{
				{
					Start: 1675115596722,
					End:   1675115596722 + 60*60*1000,
				},
				{
					Start: 1675115596722 + 120*60*1000,
					End:   1675115596722 + 180*60*1000,
				},
			},
		},
		{
			name:           "cached time range is a superset of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 60*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 120*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 180*60*1000,
							Value:     1,
						},
					},
				},
			},
			fluxInterval: 5 * time.Minute,
			expectedMiss: []querycache.MissInterval{},
		},
		{
			name:           "cache time range is a left overlap of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 60*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 120*60*1000,
							Value:     1,
						},
					},
				},
			},
			fluxInterval: 5 * time.Minute,
			expectedMiss: []querycache.MissInterval{
				{
					Start: 1675115596722 + 120*60*1000,
					End:   1675115596722 + 180*60*1000,
				},
			},
		},
		{
			name:           "cache time range is a right overlap of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722 + 60*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 120*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 180*60*1000,
							Value:     1,
						},
					},
				},
			},
			fluxInterval: 5 * time.Minute,
			expectedMiss: []querycache.MissInterval{
				{
					Start: 1675115596722,
					End:   1675115596722 + 60*60*1000,
				},
			},
		},
		{
			name:           "cache time range is a disjoint of the requested time range",
			requestedStart: 1675115596722,
			requestedEnd:   1675115596722 + 180*60*1000,
			requestedStep:  60,
			cachedSeries: []*v3.Series{
				{
					Labels: map[string]string{
						"__name__": "http_server_requests_seconds_count",
					},
					Points: []v3.Point{
						{
							Timestamp: 1675115596722 + 240*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 300*60*1000,
							Value:     1,
						},
						{
							Timestamp: 1675115596722 + 360*60*1000,
							Value:     1,
						},
					},
				},
			},
			fluxInterval: 5 * time.Minute,
			expectedMiss: []querycache.MissInterval{
				{
					Start: 1675115596722,
					End:   1675115596722 + 180*60*1000,
				},
			},
		},
	}

	opts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)
	qc := querycache.NewQueryCache(querycache.WithCache(c))

	for idx, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cacheKey := fmt.Sprintf("test-cache-key-%d", idx)
			cachedData := querycache.CachedSeriesData{
				Start: minTimestamp(tc.cachedSeries),
				End:   maxTimestamp(tc.cachedSeries),
				Data:  tc.cachedSeries,
			}
			orgID := valuer.GenerateUUID()
			cacheableData := querycache.CacheableSeriesData{Series: []querycache.CachedSeriesData{cachedData}}
			err = c.Set(context.Background(), orgID, cacheKey, &cacheableData, 0)
			assert.NoError(t, err)

			misses := qc.FindMissingTimeRanges(orgID, tc.requestedStart, tc.requestedEnd, tc.requestedStep, cacheKey)
			if len(misses) != len(tc.expectedMiss) {
				t.Errorf("expected %d misses, got %d", len(tc.expectedMiss), len(misses))
			}
			for i, miss := range misses {
				if miss.Start != tc.expectedMiss[i].Start {
					t.Errorf("expected start %d, got %d", tc.expectedMiss[i].Start, miss.Start)
				}
				if miss.End != tc.expectedMiss[i].End {
					t.Errorf("expected end %d, got %d", tc.expectedMiss[i].End, miss.End)
				}
			}
		})
	}
}

func TestV2QueryRangePanelGraph(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start:   1675115596722,               // 31st Jan, 03:23:16
			End:     1675115596722 + 120*60*1000, // 31st Jan, 05:23:16
			Step:    60,
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						Temporality:        v3.Delta,
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "http_server_requests_seconds_count", Type: v3.AttributeKeyTypeUnspecified, DataType: "float64", IsColumn: true},
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "method", IsColumn: false},
									Operator: "=",
									Value:    "GET",
								},
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "service_name", IsColumn: false},
							{Key: "method", IsColumn: false},
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						TimeAggregation:   v3.TimeAggregationRate,
						SpaceAggregation:  v3.SpaceAggregationSum,
						Expression:        "A",
					},
				},
			},
		},
		{
			Start: 1675115596722 + 60*60*1000,  // 31st Jan, 04:23:16
			End:   1675115596722 + 180*60*1000, // 31st Jan, 06:23:16
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						Temporality:        v3.Delta,
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "http_server_requests_seconds_count", Type: v3.AttributeKeyTypeUnspecified, DataType: "float64", IsColumn: true},
						DataSource:         v3.DataSourceMetrics,
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "method", IsColumn: false},
									Operator: "=",
									Value:    "GET",
								},
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "service_name", IsColumn: false},
							{Key: "method", IsColumn: false},
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						TimeAggregation:   v3.TimeAggregationRate,
						SpaceAggregation:  v3.SpaceAggregationSum,
						Expression:        "A",
					},
				},
			},
		},
		// No caching for traces yet
		{
			Start: 1675115596722,
			End:   1675115596722 + 120*60*1000,
			Step:  5 * time.Minute.Milliseconds(),
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						AggregateAttribute: v3.AttributeKey{Key: "durationNano", Type: v3.AttributeKeyTypeUnspecified, DataType: "float64", IsColumn: true},
						StepInterval:       60,
						DataSource:         v3.DataSourceTraces,
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "method", IsColumn: false},
									Operator: "=",
									Value:    "GET",
								},
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "serviceName", IsColumn: false},
							{Key: "name", IsColumn: false},
						},
						AggregateOperator: v3.AggregateOperatorP95,
						Expression:        "A",
					},
				},
			},
		},
		{
			Start: 1675115596722 + 60*60*1000,
			End:   1675115596722 + 180*60*1000,
			Step:  5 * time.Minute.Milliseconds(),
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						AggregateAttribute: v3.AttributeKey{Key: "durationNano", Type: v3.AttributeKeyTypeUnspecified, DataType: "float64", IsColumn: true},
						StepInterval:       60,
						DataSource:         v3.DataSourceTraces,
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "method", IsColumn: false},
									Operator: "=",
									Value:    "GET",
								},
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "serviceName", IsColumn: false},
							{Key: "name", IsColumn: false},
						},
						AggregateOperator: v3.AggregateOperatorP95,
						Expression:        "A",
					},
				},
			},
		},
	}
	cacheOpts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: cacheOpts})
	require.NoError(t, err)
	opts := QuerierOptions{
		Cache:        c,
		Reader:       nil,
		FluxInterval: 5 * time.Minute,
		KeyGenerator: queryBuilder.NewKeyGenerator(),

		TestingMode: true,
		ReturnedSeries: []*v3.Series{
			{
				Labels: map[string]string{
					"method":       "GET",
					"service_name": "test",
					"__name__":     "http_server_requests_seconds_count",
				},
				Points: []v3.Point{
					{Timestamp: 1675115596722, Value: 1},               // 31st Jan, 03:23:16
					{Timestamp: 1675115596722 + 60*60*1000, Value: 2},  // 31st Jan, 04:23:16
					{Timestamp: 1675115596722 + 120*60*1000, Value: 3}, // 31st Jan, 05:23:16
				},
			},
		},
	}
	q := NewQuerier(opts)
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115580000, 1675115580000+120*60*1000), // 31st Jan, 03:23:00 to 31st Jan, 05:23:00
		// second query uses the cached data from the first query
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115580000+120*60*1000, 1675115580000+180*60*1000), // 31st Jan, 05:23:00 to 31st Jan, 06:23:00
		// No caching for traces yet
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", 1675115580000*1000000, (1675115580000+120*60*1000)*int64(1000000)),                     // 31st Jan, 03:23:00 to 31st Jan, 05:23:00
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", (1675115580000+60*60*1000)*int64(1000000), (1675115580000+180*60*1000)*int64(1000000)), // 31st Jan, 04:23:00 to 31st Jan, 06:23:00
	}

	orgID := valuer.GenerateUUID()
	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), orgID, param)
		if err != nil {
			t.Errorf("expected no error, got %s", err)
		}
		if len(errByName) > 0 {
			t.Errorf("expected no error, got %v", errByName)
		}

		if !strings.Contains(q.QueriesExecuted()[i], expectedTimeRangeInQueryString[i]) {
			t.Errorf("expected query to contain %s, got %s", expectedTimeRangeInQueryString[i], q.QueriesExecuted()[i])
		}
	}
}

func TestV2QueryRangeValueType(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start:   1675115596722,               // 31st Jan, 03:23:16
			End:     1675115596722 + 120*60*1000, // 31st Jan, 05:23:16
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeValue,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						DataSource:         v3.DataSourceMetrics,
						AggregateAttribute: v3.AttributeKey{Key: "http_server_requests_seconds_count", Type: v3.AttributeKeyTypeUnspecified, DataType: "float64", IsColumn: true},
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "method", IsColumn: false},
									Operator: "=",
									Value:    "GET",
								},
							},
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						TimeAggregation:   v3.TimeAggregationRate,
						SpaceAggregation:  v3.SpaceAggregationSum,
						Expression:        "A",
						ReduceTo:          v3.ReduceToOperatorLast,
					},
				},
			},
		},
		{
			Start:   1675115596722 + 60*60*1000,  // 31st Jan, 04:23:16
			End:     1675115596722 + 180*60*1000, // 31st Jan, 06:23:16
			Step:    60,
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeValue,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						Temporality:        v3.Delta,
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "http_server_requests_seconds_count", Type: v3.AttributeKeyTypeUnspecified, DataType: "float64", IsColumn: true},
						DataSource:         v3.DataSourceMetrics,
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "method", IsColumn: false},
									Operator: "=",
									Value:    "GET",
								},
							},
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						TimeAggregation:   v3.TimeAggregationRate,
						SpaceAggregation:  v3.SpaceAggregationSum,
						Expression:        "A",
					},
				},
			},
		},
		{
			Start:   1675115596722 + 60*60*1000,  // 31st Jan, 04:23:16
			End:     1675115596722 + 180*60*1000, // 31st Jan, 06:23:16
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeValue,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						DataSource:         v3.DataSourceTraces,
						AggregateAttribute: v3.AttributeKey{Key: "durationNano", Type: v3.AttributeKeyTypeUnspecified, DataType: "float64", IsColumn: true},
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "method", IsColumn: false},
									Operator: "=",
									Value:    "GET",
								},
							},
						},
						AggregateOperator: v3.AggregateOperatorP95,
						Expression:        "A",
						ReduceTo:          v3.ReduceToOperatorLast,
					},
				},
			},
		},
	}
	cacheOpts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: cacheOpts})
	require.NoError(t, err)
	opts := QuerierOptions{
		Cache:        c,
		Reader:       nil,
		FluxInterval: 5 * time.Minute,
		KeyGenerator: queryBuilder.NewKeyGenerator(),

		TestingMode: true,
		ReturnedSeries: []*v3.Series{
			{
				Labels: map[string]string{
					"method":       "GET",
					"service_name": "test",
					"__name__":     "http_server_requests_seconds_count",
				},
				Points: []v3.Point{
					{Timestamp: 1675115596722, Value: 1},               // 31st Jan, 03:23:16
					{Timestamp: 1675115596722 + 60*60*1000, Value: 2},  // 31st Jan, 04:23:16
					{Timestamp: 1675115596722 + 120*60*1000, Value: 3}, // 31st Jan, 05:23:16
				},
			},
		},
	}
	q := NewQuerier(opts)
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115520000, 1675115580000+120*60*1000),                          // 31st Jan, 03:23:00 to 31st Jan, 05:23:00
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115580000+120*60*1000, 1675115580000+180*60*1000),              // 31st Jan, 05:23:00 to 31st Jan, 06:23:00
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", (1675119196722)*int64(1000000), (1675126396722)*int64(1000000)), // 31st Jan, 05:23:00 to 31st Jan, 06:23:00
	}

	orgID := valuer.GenerateUUID()
	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), orgID, param)
		if err != nil {
			t.Errorf("expected no error, got %s", err)
		}
		if len(errByName) > 0 {
			t.Errorf("expected no error, got %v", errByName)
		}

		if !strings.Contains(q.QueriesExecuted()[i], expectedTimeRangeInQueryString[i]) {
			t.Errorf("expected query to contain %s, got %s", expectedTimeRangeInQueryString[i], q.QueriesExecuted()[i])
		}
	}
}

// test timeshift
func TestV2QueryRangeTimeShift(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start:   1675115596722,               //31, 3:23
			End:     1675115596722 + 120*60*1000, //31, 5:23
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						DataSource:         v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{},
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items:    []v3.FilterItem{},
						},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						ShiftBy:           86400,
					},
				},
			},
		},
	}
	opts := QuerierOptions{
		Reader:       nil,
		FluxInterval: 5 * time.Minute,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
		TestingMode:  true,
	}
	q := NewQuerier(opts)
	// logs queries are generates in ns
	expectedTimeRangeInQueryString := fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722-86400*1000)*1000000, ((1675115596722+120*60*1000)-86400*1000)*1000000)

	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), param)
		if err != nil {
			t.Errorf("expected no error, got %s", err)
		}
		if len(errByName) > 0 {
			t.Errorf("expected no error, got %v", errByName)
		}
		if !strings.Contains(q.QueriesExecuted()[i], expectedTimeRangeInQueryString) {
			t.Errorf("expected query to contain %s, got %s", expectedTimeRangeInQueryString, q.QueriesExecuted()[i])
		}
	}
}

// timeshift works with caching
func TestV2QueryRangeTimeShiftWithCache(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start:   1675115596722 + 60*60*1000 - 86400*1000,  //30th Jan, 4:23
			End:     1675115596722 + 120*60*1000 - 86400*1000, //30th Jan, 5:23
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						DataSource:         v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{},
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items:    []v3.FilterItem{},
						},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						GroupBy: []v3.AttributeKey{
							{Key: "service_name", IsColumn: false},
							{Key: "method", IsColumn: false},
						},
					},
				},
			},
		},
		{
			Start:   1675115596722,               //31st Jan, 3:23
			End:     1675115596722 + 120*60*1000, //31st Jan, 5:23
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						DataSource:         v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{},
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items:    []v3.FilterItem{},
						},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						ShiftBy:           86400,
						GroupBy: []v3.AttributeKey{
							{Key: "service_name", IsColumn: false},
							{Key: "method", IsColumn: false},
						},
					},
				},
			},
		},
	}
	cacheOpts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: cacheOpts})
	require.NoError(t, err)
	opts := QuerierOptions{
		Cache:        c,
		Reader:       nil,
		FluxInterval: 5 * time.Minute,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
		TestingMode:  true,
		ReturnedSeries: []*v3.Series{
			{
				Labels: map[string]string{},
				Points: []v3.Point{
					{Timestamp: 1675115596722 + 60*60*1000 - 86400*1000, Value: 1},               // 30th Jan, 4:23
					{Timestamp: 1675115596722 + 120*60*1000 - 86400*1000 + 60*60*1000, Value: 2}, // 30th Jan, 5:23
				},
			},
		},
	}
	q := NewQuerier(opts)

	// logs queries are generates in ns
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722+60*60*1000-86400*1000)*1000000, (1675115596722+120*60*1000-86400*1000)*1000000), // 30th Jan, 4:23 to 30th Jan, 5:23
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722-86400*1000)*1000000, ((1675115596722+120*60*1000)-86400*1000)*1000000),          // 30th Jan, 3:23 to 30th Jan, 5:23
	}

	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), param)
		if err != nil {
			t.Errorf("expected no error, got %s", err)
		}
		if len(errByName) > 0 {
			t.Errorf("expected no error, got %v", errByName)
		}
		if !strings.Contains(q.QueriesExecuted()[i], expectedTimeRangeInQueryString[i]) {
			t.Errorf("expected query to contain %s, got %s", expectedTimeRangeInQueryString[i], q.QueriesExecuted()[i])
		}
	}
}

// timeshift with limit queries
func TestV2QueryRangeTimeShiftWithLimitAndCache(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start:   1675115596722 + 60*60*1000 - 86400*1000,  //30th Jan, 4:23
			End:     1675115596722 + 120*60*1000 - 86400*1000, //30th, 5:23
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						DataSource:         v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{},
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items:    []v3.FilterItem{},
						},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						GroupBy: []v3.AttributeKey{
							{Key: "service_name", IsColumn: false},
							{Key: "method", IsColumn: false},
						},
						Limit: 5,
					},
				},
			},
		},
		{
			Start:   1675115596722,               //31st Jan, 3:23
			End:     1675115596722 + 120*60*1000, //31st Jan, 5:23
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						DataSource:         v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{},
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items:    []v3.FilterItem{},
						},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						ShiftBy:           86400,
						GroupBy: []v3.AttributeKey{
							{Key: "service_name", IsColumn: false},
							{Key: "method", IsColumn: false},
						},
						Limit: 5,
					},
				},
			},
		},
	}
	cacheOpts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: cacheOpts})
	require.NoError(t, err)
	opts := QuerierOptions{
		Cache:        c,
		Reader:       nil,
		FluxInterval: 5 * time.Minute,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
		TestingMode:  true,
		ReturnedSeries: []*v3.Series{
			{
				Labels: map[string]string{},
				Points: []v3.Point{
					{Timestamp: 1675115596722 + 60*60*1000 - 86400*1000, Value: 1},               // 30th Jan, 4:23
					{Timestamp: 1675115596722 + 120*60*1000 - 86400*1000 + 60*60*1000, Value: 2}, // 30th Jan, 6:23
				},
			},
		},
	}
	q := NewQuerier(opts)

	// logs queries are generates in ns
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722+60*60*1000-86400*1000)*1000000, (1675115596722+120*60*1000-86400*1000)*1000000), // 30th Jan, 4:23 to 30th Jan, 5:23
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722-86400*1000)*1000000, ((1675115596722+120*60*1000)-86400*1000)*1000000),
	}

	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), param)
		if err != nil {
			t.Errorf("expected no error, got %s", err)
		}
		if len(errByName) > 0 {
			t.Errorf("expected no error, got %v", errByName)
		}
		if !strings.Contains(q.QueriesExecuted()[i], expectedTimeRangeInQueryString[i]) {
			t.Errorf("expected query to contain %s, got %s", expectedTimeRangeInQueryString[i], q.QueriesExecuted()[i])
		}
	}
}

func TestV2QueryRangeValueTypePromQL(t *testing.T) {
	// There shouldn't be any caching for value panel type
	params := []*v3.QueryRangeParamsV3{
		{
			Start:   1675115596722,
			End:     1675115596722 + 120*60*1000,
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PanelType: v3.PanelTypeValue,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query: "signoz_calls_total",
					},
				},
			},
		},
		{
			Start:   1675115596722 + 60*60*1000,
			End:     1675115596722 + 180*60*1000,
			Step:    5 * time.Minute.Milliseconds(),
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PanelType: v3.PanelTypeValue,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query: "signoz_latency_bucket",
					},
				},
			},
		},
	}
	cacheOpts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: cacheOpts})
	require.NoError(t, err)
	opts := QuerierOptions{
		Cache:        c,
		Reader:       nil,
		FluxInterval: 5 * time.Minute,
		KeyGenerator: queryBuilder.NewKeyGenerator(),

		TestingMode: true,
		ReturnedSeries: []*v3.Series{
			{
				Labels: map[string]string{
					"method":       "GET",
					"service_name": "test",
					"__name__":     "doesn't matter",
				},
				Points: []v3.Point{
					{Timestamp: 1675115596722, Value: 1},
					{Timestamp: 1675115596722 + 60*60*1000, Value: 2},
					{Timestamp: 1675115596722 + 120*60*1000, Value: 3},
				},
			},
		},
	}
	q := NewQuerier(opts)

	expectedQueryAndTimeRanges := []struct {
		query  string
		ranges []querycache.MissInterval
	}{
		{
			query: "signoz_calls_total",
			ranges: []querycache.MissInterval{
				{Start: 1675115596722, End: 1675115596722 + 120*60*1000},
			},
		},
		{
			query: "signoz_latency_bucket",
			ranges: []querycache.MissInterval{
				{Start: 1675115596722 + 60*60*1000, End: 1675115596722 + 180*60*1000},
			},
		},
	}

	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), valuer.GenerateUUID(), param)
		if err != nil {
			t.Errorf("expected no error, got %s", err)
		}
		if len(errByName) > 0 {
			t.Errorf("expected no error, got %v", errByName)
		}

		if !strings.Contains(q.QueriesExecuted()[i], expectedQueryAndTimeRanges[i].query) {
			t.Errorf("expected query to contain %s, got %s", expectedQueryAndTimeRanges[i].query, q.QueriesExecuted()[i])
		}
		if len(q.TimeRanges()[i]) != 2 {
			t.Errorf("expected time ranges to be %v, got %v", expectedQueryAndTimeRanges[i].ranges, q.TimeRanges()[i])
		}
		if q.TimeRanges()[i][0] != int(expectedQueryAndTimeRanges[i].ranges[0].Start) {
			t.Errorf("expected time ranges to be %v, got %v", expectedQueryAndTimeRanges[i].ranges, q.TimeRanges()[i])
		}
		if q.TimeRanges()[i][1] != int(expectedQueryAndTimeRanges[i].ranges[0].End) {
			t.Errorf("expected time ranges to be %v, got %v", expectedQueryAndTimeRanges[i].ranges, q.TimeRanges()[i])
		}
	}
}

func Test_querier_Traces_runWindowBasedListQueryDesc(t *testing.T) {
	params := &v3.QueryRangeParamsV3{
		Start: 1722171576000000000, // July 28, 2024 6:29:36 PM
		End:   1722262800000000000, // July 29, 2024 7:50:00 PM
		CompositeQuery: &v3.CompositeQuery{
			PanelType: v3.PanelTypeList,
			BuilderQueries: map[string]*v3.BuilderQuery{
				"A": {
					QueryName:         "A",
					Expression:        "A",
					DataSource:        v3.DataSourceTraces,
					PageSize:          10,
					Limit:             100,
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					SelectColumns:     []v3.AttributeKey{{Key: "serviceName"}},
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items:    []v3.FilterItem{},
					},
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							IsColumn:   true,
							Order:      "DESC",
						},
					},
				},
			},
		},
	}

	tsRanges := []utils.LogsListTsRange{
		{
			Start: 1722259200000000000, // July 29, 2024 6:50:00 PM
			End:   1722262800000000000, // July 29, 2024 7:50:00 PM
		},
		{
			Start: 1722252000000000000, // July 29, 2024 4:50:00 PM
			End:   1722259200000000000, // July 29, 2024 6:50:00 PM
		},
		{
			Start: 1722237600000000000, // July 29, 2024 12:50:00 PM
			End:   1722252000000000000, // July 29, 2024 4:50:00 PM
		},
		{
			Start: 1722208800000000000, // July 29, 2024 4:50:00 AM
			End:   1722237600000000000, // July 29, 2024 12:50:00 PM
		},
		{
			Start: 1722171576000000000, // July 28, 2024 6:29:36 PM
			End:   1722208800000000000, // July 29, 2024 4:50:00 AM
		},
	}

	type queryParams struct {
		start  int64
		end    int64
		limit  uint64
		offset uint64
	}

	type queryResponse struct {
		expectedQuery string
		timestamps    []uint64
	}

	// create test struct with moc data i.e array of timestamps, limit, offset and expected results
	testCases := []struct {
		name               string
		queryResponses     []queryResponse
		queryParams        queryParams
		expectedTimestamps []int64
		expectedError      bool
	}{
		{
			name: "should return correct timestamps when querying within time window",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= '1722259200000000000' AND timestamp <= '1722262800000000000').* DESC LIMIT 2",
					timestamps:    []uint64{1722259400000000000, 1722259300000000000},
				},
			},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  2,
				offset: 0,
			},
			expectedTimestamps: []int64{1722259400000000000, 1722259300000000000},
		},
		{
			name: "all data not in first windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= '1722259200000000000' AND timestamp <= '1722262800000000000').* DESC LIMIT 3",
					timestamps:    []uint64{1722259400000000000, 1722259300000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722252000000000000' AND timestamp <= '1722259200000000000').* DESC LIMIT 1",
					timestamps:    []uint64{1722253000000000000},
				},
			},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  3,
				offset: 0,
			},
			expectedTimestamps: []int64{1722259400000000000, 1722259300000000000, 1722253000000000000},
		},
		{
			name: "data in multiple windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= '1722259200000000000' AND timestamp <= '1722262800000000000').* DESC LIMIT 5",
					timestamps:    []uint64{1722259400000000000, 1722259300000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722252000000000000' AND timestamp <= '1722259200000000000').* DESC LIMIT 3",
					timestamps:    []uint64{1722253000000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722237600000000000' AND timestamp <= '1722252000000000000').* DESC LIMIT 2",
					timestamps:    []uint64{1722237700000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722208800000000000' AND timestamp <= '1722237600000000000').* DESC LIMIT 1",
					timestamps:    []uint64{},
				},
				{
					expectedQuery: ".*(timestamp >= '1722171576000000000' AND timestamp <= '1722208800000000000').* DESC LIMIT 1",
					timestamps:    []uint64{},
				},
			},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  5,
				offset: 0,
			},
			expectedTimestamps: []int64{1722259400000000000, 1722259300000000000, 1722253000000000000, 1722237700000000000},
		},
		{
			name: "query with offset",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= '1722259200000000000' AND timestamp <= '1722262800000000000').* DESC LIMIT 7",
					timestamps:    []uint64{1722259230000000000, 1722259220000000000, 1722259210000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722252000000000000' AND timestamp <= '1722259200000000000').* DESC LIMIT 4",
					timestamps:    []uint64{1722255000000000000, 1722254000000000000, 1722253000000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722237600000000000' AND timestamp <= '1722252000000000000').* DESC LIMIT 1",
					timestamps:    []uint64{1722237700000000000},
				},
			},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  4,
				offset: 3,
			},
			expectedTimestamps: []int64{1722255000000000000, 1722254000000000000, 1722253000000000000, 1722237700000000000},
		},
		{
			name: "query with offset and limit- data spread across multiple windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= '1722259200000000000' AND timestamp <= '1722262800000000000').* DESC LIMIT 11",
					timestamps:    []uint64{},
				},
				{
					expectedQuery: ".*(timestamp >= '1722252000000000000' AND timestamp <= '1722259200000000000').* DESC LIMIT 11",
					timestamps:    []uint64{1722255000000000000, 1722254000000000000, 1722253000000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722237600000000000' AND timestamp <= '1722252000000000000').* DESC LIMIT 8",
					timestamps:    []uint64{1722237920000000000, 1722237910000000000, 1722237900000000000, 1722237800000000000, 1722237700000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722208800000000000' AND timestamp <= '1722237600000000000').* DESC LIMIT 3",
					timestamps:    []uint64{1722208830000000000, 1722208820000000000, 1722208810000000000},
				},
			},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  5,
				offset: 6,
			},
			expectedTimestamps: []int64{1722237800000000000, 1722237700000000000, 1722208830000000000, 1722208820000000000, 1722208810000000000},
		},
		{
			name:           "don't allow pagination to get more than 10k spans",
			queryResponses: []queryResponse{},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  10,
				offset: 9991,
			},
			expectedError: true,
		},
	}

	cols := []cmock.ColumnType{
		{Name: "timestamp", Type: "UInt64"},
		{Name: "name", Type: "String"},
	}
	testName := "name"

	options := clickhouseReader.NewOptions("", "", "archiveNamespace")

	// iterate over test data, create reader and run test
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)

			// Configure mock responses
			for _, response := range tc.queryResponses {
				values := make([][]any, 0, len(response.timestamps))
				for _, ts := range response.timestamps {
					values = append(values, []any{&ts, &testName})
				}
				// if len(values) > 0 {
				telemetryStore.Mock().ExpectQuery(response.expectedQuery).WillReturnRows(
					cmock.NewRows(cols, values),
				)
			}

			// Create reader and querier
			reader := clickhouseReader.NewReader(
				nil,
				telemetryStore,
				prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}),
				"",
				time.Duration(time.Second),
				nil,
				nil,
				options,
			)

			q := &querier{
				reader: reader,
				builder: queryBuilder.NewQueryBuilder(
					queryBuilder.QueryBuilderOptions{
						BuildTraceQuery: tracesV4.PrepareTracesQuery,
					},
				),
			}
			// Update query parameters
			params.Start = tc.queryParams.start
			params.End = tc.queryParams.end
			params.CompositeQuery.BuilderQueries["A"].Limit = tc.queryParams.limit
			params.CompositeQuery.BuilderQueries["A"].Offset = tc.queryParams.offset

			// Execute query
			results, errMap, err := q.runWindowBasedListQuery(context.Background(), params, tsRanges)

			if tc.expectedError {
				require.Error(t, err)
				return
			}

			// Assertions
			require.NoError(t, err, "Query execution failed")
			require.Nil(t, errMap, "Unexpected error map in results")
			require.Len(t, results, 1, "Expected exactly one result set")

			result := results[0]
			require.Equal(t, "A", result.QueryName, "Incorrect query name in results")
			require.Len(t, result.List, len(tc.expectedTimestamps),
				"Result count mismatch: got %d results, expected %d",
				len(result.List), len(tc.expectedTimestamps))

			for i, expected := range tc.expectedTimestamps {
				require.Equal(t, expected, result.List[i].Timestamp.UnixNano(),
					"Timestamp mismatch at index %d: got %d, expected %d",
					i, result.List[i].Timestamp.UnixNano(), expected)
			}

			// Verify mock expectations
			err = telemetryStore.Mock().ExpectationsWereMet()
			require.NoError(t, err, "Mock expectations were not met")
		})
	}
}

func Test_querier_Traces_runWindowBasedListQueryAsc(t *testing.T) {
	params := &v3.QueryRangeParamsV3{
		Start: 1722171576000000000, // July 28, 2024 6:29:36 PM
		End:   1722262800000000000, // July 29, 2024 7:50:00 PM
		CompositeQuery: &v3.CompositeQuery{
			PanelType: v3.PanelTypeList,
			BuilderQueries: map[string]*v3.BuilderQuery{
				"A": {
					QueryName:         "A",
					Expression:        "A",
					DataSource:        v3.DataSourceTraces,
					PageSize:          10,
					Limit:             100,
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					SelectColumns:     []v3.AttributeKey{{Key: "serviceName"}},
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items:    []v3.FilterItem{},
					},
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							IsColumn:   true,
							Key:        "timestamp",
							Order:      "asc",
						},
					},
				},
			},
		},
	}

	tsRanges := []utils.LogsListTsRange{
		{
			Start: 1722259200000000000, // July 29, 2024 6:50:00 PM
			End:   1722262800000000000, // July 29, 2024 7:50:00 PM
		},
		{
			Start: 1722252000000000000, // July 29, 2024 4:50:00 PM
			End:   1722259200000000000, // July 29, 2024 6:50:00 PM
		},
		{
			Start: 1722237600000000000, // July 29, 2024 12:50:00 PM
			End:   1722252000000000000, // July 29, 2024 4:50:00 PM
		},
		{
			Start: 1722208800000000000, // July 29, 2024 4:50:00 AM
			End:   1722237600000000000, // July 29, 2024 12:50:00 PM
		},
		{
			Start: 1722171576000000000, // July 28, 2024 6:29:36 PM
			End:   1722208800000000000, // July 29, 2024 4:50:00 AM
		},
	}

	type queryParams struct {
		start  int64
		end    int64
		limit  uint64
		offset uint64
	}

	type queryResponse struct {
		expectedQuery string
		timestamps    []uint64
	}

	// create test struct with moc data i.e array of timestamps, limit, offset and expected results
	testCases := []struct {
		name               string
		queryResponses     []queryResponse
		queryParams        queryParams
		expectedTimestamps []int64
		expectedError      bool
	}{
		{
			name: "should return correct timestamps when querying within time window",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= '1722171576000000000' AND timestamp <= '1722208800000000000').* asc LIMIT 2",
					timestamps:    []uint64{1722171576000000000, 1722171577000000000},
				},
			},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  2,
				offset: 0,
			},
			expectedTimestamps: []int64{1722171576000000000, 1722171577000000000},
		},
		{
			name: "all data not in first windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= '1722171576000000000' AND timestamp <= '1722208800000000000').* asc LIMIT 3",
					timestamps:    []uint64{1722259200000000000, 1722259201000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722208800000000000' AND timestamp <= '1722237600000000000').* asc LIMIT 1",
					timestamps:    []uint64{1722208800100000000},
				},
			},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  3,
				offset: 0,
			},
			expectedTimestamps: []int64{1722259200000000000, 1722259201000000000, 1722208800100000000},
		},
		{
			name: "query with offset and limit- data spread across multiple windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= '1722171576000000000' AND timestamp <= '1722208800000000000').* asc LIMIT 11",
					timestamps:    []uint64{},
				},
				{
					expectedQuery: ".*(timestamp >= '1722208800000000000' AND timestamp <= '1722237600000000000').* asc LIMIT 11",
					timestamps:    []uint64{1722208801000000000, 1722208802000000000, 1722208803000000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722237600000000000' AND timestamp <= '1722252000000000000').* asc LIMIT 8",
					timestamps:    []uint64{1722237600010000000, 1722237600020000000, 1722237600030000000, 1722237600040000000, 1722237600050000000},
				},
				{
					expectedQuery: ".*(timestamp >= '1722252000000000000' AND timestamp <= '1722259200000000000').* asc LIMIT 3",
					timestamps:    []uint64{1722252000100000000, 1722252000200000000, 1722252000300000000},
				},
			},
			queryParams: queryParams{
				start:  1722171576000000000,
				end:    1722262800000000000,
				limit:  5,
				offset: 6,
			},
			expectedTimestamps: []int64{1722237600040000000, 1722237600050000000, 1722252000100000000, 1722252000200000000, 1722252000300000000},
		},
	}

	cols := []cmock.ColumnType{
		{Name: "timestamp", Type: "UInt64"},
		{Name: "name", Type: "String"},
	}
	testName := "name"

	options := clickhouseReader.NewOptions("", "", "archiveNamespace")

	// iterate over test data, create reader and run test
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)

			// Configure mock responses
			for _, response := range tc.queryResponses {
				values := make([][]any, 0, len(response.timestamps))
				for _, ts := range response.timestamps {
					values = append(values, []any{&ts, &testName})
				}
				telemetryStore.Mock().ExpectQuery(response.expectedQuery).WillReturnRows(
					cmock.NewRows(cols, values),
				)
			}

			// Create reader and querier
			reader := clickhouseReader.NewReader(
				nil,
				telemetryStore,
				prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}),
				"",
				time.Duration(time.Second),
				nil,
				nil,
				options,
			)

			q := &querier{
				reader: reader,
				builder: queryBuilder.NewQueryBuilder(
					queryBuilder.QueryBuilderOptions{
						BuildTraceQuery: tracesV4.PrepareTracesQuery,
					},
				),
			}
			// Update query parameters
			params.Start = tc.queryParams.start
			params.End = tc.queryParams.end
			params.CompositeQuery.BuilderQueries["A"].Limit = tc.queryParams.limit
			params.CompositeQuery.BuilderQueries["A"].Offset = tc.queryParams.offset

			// Create a copy of tsRanges before passing to the function
			// required because tsRanges is modified in the function
			tsRangesCopy := make([]utils.LogsListTsRange, len(tsRanges))
			copy(tsRangesCopy, tsRanges)

			results, errMap, err := q.runWindowBasedListQuery(context.Background(), params, tsRangesCopy)

			if tc.expectedError {
				require.Error(t, err)
				return
			}

			// Assertions
			require.NoError(t, err, "Query execution failed")
			require.Nil(t, errMap, "Unexpected error map in results")
			require.Len(t, results, 1, "Expected exactly one result set")

			result := results[0]
			require.Equal(t, "A", result.QueryName, "Incorrect query name in results")
			require.Len(t, result.List, len(tc.expectedTimestamps),
				"Result count mismatch: got %d results, expected %d",
				len(result.List), len(tc.expectedTimestamps))

			for i, expected := range tc.expectedTimestamps {
				require.Equal(t, expected, result.List[i].Timestamp.UnixNano(),
					"Timestamp mismatch at index %d: got %d, expected %d",
					i, result.List[i].Timestamp.UnixNano(), expected)
			}

			// Verify mock expectations
			err = telemetryStore.Mock().ExpectationsWereMet()
			require.NoError(t, err, "Mock expectations were not met")
		})
	}
}

func Test_querier_Logs_runWindowBasedListQueryDesc(t *testing.T) {
	params := &v3.QueryRangeParamsV3{
		Start: 1722171576000000000, // July 28, 2024 6:29:36 PM
		End:   1722262800000000000, // July 29, 2024 7:50:00 PM
		CompositeQuery: &v3.CompositeQuery{
			PanelType: v3.PanelTypeList,
			BuilderQueries: map[string]*v3.BuilderQuery{
				"A": {
					QueryName:         "A",
					Expression:        "A",
					DataSource:        v3.DataSourceLogs,
					PageSize:          10,
					Limit:             100,
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items:    []v3.FilterItem{},
					},
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							Order:      "DESC",
						},
						{
							ColumnName: "id",
							Order:      "DESC",
						},
					},
				},
			},
		},
	}

	tsRanges := []utils.LogsListTsRange{
		{
			Start: 1722259200000000000, // July 29, 2024 6:50:00 PM
			End:   1722262800000000000, // July 29, 2024 7:50:00 PM
		},
		{
			Start: 1722252000000000000, // July 29, 2024 4:50:00 PM
			End:   1722259200000000000, // July 29, 2024 6:50:00 PM
		},
		{
			Start: 1722237600000000000, // July 29, 2024 12:50:00 PM
			End:   1722252000000000000, // July 29, 2024 4:50:00 PM
		},
		{
			Start: 1722208800000000000, // July 29, 2024 4:50:00 AM
			End:   1722237600000000000, // July 29, 2024 12:50:00 PM
		},
		{
			Start: 1722171576000000000, // July 28, 2024 6:29:36 PM
			End:   1722208800000000000, // July 29, 2024 4:50:00 AM
		},
	}

	type queryParams struct {
		start    int64
		end      int64
		limit    uint64
		offset   uint64
		pageSize uint64
	}

	type queryResponse struct {
		expectedQuery string
		timestamps    []uint64
	}

	// create test struct with moc data i.e array of timestamps, limit, offset and expected results
	testCases := []struct {
		name               string
		queryResponses     []queryResponse
		queryParams        queryParams
		expectedTimestamps []int64
		expectedError      bool
	}{
		{
			name: "should return correct timestamps when querying within time window",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= 1722259200000000000 AND timestamp <= 1722262800000000000).* DESC LIMIT 2",
					timestamps:    []uint64{1722259400000000000, 1722259300000000000},
				},
			},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				pageSize: 2,
				offset:   0,
			},
			expectedTimestamps: []int64{1722259400000000000, 1722259300000000000},
		},
		{
			name: "all data not in first windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= 1722259200000000000 AND timestamp <= 1722262800000000000).* DESC LIMIT 3",
					timestamps:    []uint64{1722259400000000000, 1722259300000000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722252000000000000 AND timestamp <= 1722259200000000000).* DESC LIMIT 1",
					timestamps:    []uint64{1722253000000000000},
				},
			},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				pageSize: 3,
				offset:   0,
			},
			expectedTimestamps: []int64{1722259400000000000, 1722259300000000000, 1722253000000000000},
		},
		{
			name: "data in multiple windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= 1722259200000000000 AND timestamp <= 1722262800000000000).* DESC LIMIT 5",
					timestamps:    []uint64{1722259400000000000, 1722259300000000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722252000000000000 AND timestamp <= 1722259200000000000).* DESC LIMIT 3",
					timestamps:    []uint64{1722253000000000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722237600000000000 AND timestamp <= 1722252000000000000).* DESC LIMIT 2",
					timestamps:    []uint64{1722237700000000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722208800000000000 AND timestamp <= 1722237600000000000).* DESC LIMIT 1",
					timestamps:    []uint64{},
				},
				{
					expectedQuery: ".*(timestamp >= 1722171576000000000 AND timestamp <= 1722208800000000000).* DESC LIMIT 1",
					timestamps:    []uint64{},
				},
			},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				pageSize: 5,
				offset:   0,
			},
			expectedTimestamps: []int64{1722259400000000000, 1722259300000000000, 1722253000000000000, 1722237700000000000},
		},
		{
			name: "query with offset",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= 1722259200000000000 AND timestamp <= 1722262800000000000).* DESC LIMIT 7",
					timestamps:    []uint64{1722259230000000000, 1722259220000000000, 1722259210000000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722252000000000000 AND timestamp <= 1722259200000000000).* DESC LIMIT 4",
					timestamps:    []uint64{1722255000000000000, 1722254000000000000, 1722253000000000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722237600000000000 AND timestamp <= 1722252000000000000).* DESC LIMIT 1",
					timestamps:    []uint64{1722237700000000000},
				},
			},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				pageSize: 4,
				offset:   3,
			},
			expectedTimestamps: []int64{1722255000000000000, 1722254000000000000, 1722253000000000000, 1722237700000000000},
		},
		{
			name: "query with offset and limit- data spread across multiple windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= 1722259200000000000 AND timestamp <= 1722262800000000000).* DESC LIMIT 11",
					timestamps:    []uint64{},
				},
				{
					expectedQuery: ".*(timestamp >= 1722252000000000000 AND timestamp <= 1722259200000000000).* DESC LIMIT 11",
					timestamps:    []uint64{1722255000000000000, 1722254000000000000, 1722253000000000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722237600000000000 AND timestamp <= 1722252000000000000).* DESC LIMIT 8",
					timestamps:    []uint64{1722237920000000000, 1722237910000000000, 1722237900000000000, 1722237800000000000, 1722237700000000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722208800000000000 AND timestamp <= 1722237600000000000).* DESC LIMIT 3",
					timestamps:    []uint64{1722208830000000000, 1722208820000000000, 1722208810000000000},
				},
			},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				pageSize: 5,
				offset:   6,
			},
			expectedTimestamps: []int64{1722237800000000000, 1722237700000000000, 1722208830000000000, 1722208820000000000, 1722208810000000000},
		},
		{
			name:           "dont allow pagination to get more than speficied limit",
			queryResponses: []queryResponse{},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				limit:    200,
				offset:   210,
				pageSize: 30,
			},
			expectedError: true,
		},
	}

	cols := []cmock.ColumnType{
		{Name: "timestamp", Type: "UInt64"},
		{Name: "name", Type: "String"},
	}
	testName := "name"

	options := clickhouseReader.NewOptions("", "", "archiveNamespace")

	// iterate over test data, create reader and run test
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)

			// Configure mock responses
			for _, response := range tc.queryResponses {
				values := make([][]any, 0, len(response.timestamps))
				for _, ts := range response.timestamps {
					values = append(values, []any{&ts, &testName})
				}
				telemetryStore.Mock().ExpectQuery(response.expectedQuery).WillReturnRows(
					cmock.NewRows(cols, values),
				)
			}

			// Create reader and querier
			reader := clickhouseReader.NewReader(
				nil,
				telemetryStore,
				prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}),
				"",
				time.Duration(time.Second),
				nil,
				nil,
				options,
			)

			q := &querier{
				reader: reader,
				builder: queryBuilder.NewQueryBuilder(
					queryBuilder.QueryBuilderOptions{
						BuildLogQuery: logsV4.PrepareLogsQuery,
					},
				),
			}
			// Update query parameters
			params.Start = tc.queryParams.start
			params.End = tc.queryParams.end
			params.CompositeQuery.BuilderQueries["A"].Limit = tc.queryParams.limit
			params.CompositeQuery.BuilderQueries["A"].Offset = tc.queryParams.offset
			params.CompositeQuery.BuilderQueries["A"].PageSize = tc.queryParams.pageSize
			// Execute query
			results, errMap, err := q.runWindowBasedListQuery(context.Background(), params, tsRanges)

			if tc.expectedError {
				require.Error(t, err)
				return
			}

			// Assertions
			require.NoError(t, err, "Query execution failed")
			require.Nil(t, errMap, "Unexpected error map in results")
			require.Len(t, results, 1, "Expected exactly one result set")

			result := results[0]
			require.Equal(t, "A", result.QueryName, "Incorrect query name in results")
			require.Len(t, result.List, len(tc.expectedTimestamps),
				"Result count mismatch: got %d results, expected %d",
				len(result.List), len(tc.expectedTimestamps))

			for i, expected := range tc.expectedTimestamps {
				require.Equal(t, expected, result.List[i].Timestamp.UnixNano(),
					"Timestamp mismatch at index %d: got %d, expected %d",
					i, result.List[i].Timestamp.UnixNano(), expected)
			}

			// Verify mock expectations
			err = telemetryStore.Mock().ExpectationsWereMet()
			require.NoError(t, err, "Mock expectations were not met")
		})
	}
}

func Test_querier_Logs_runWindowBasedListQueryAsc(t *testing.T) {
	params := &v3.QueryRangeParamsV3{
		Start: 1722171576000000000, // July 28, 2024 6:29:36 PM
		End:   1722262800000000000, // July 29, 2024 7:50:00 PM
		CompositeQuery: &v3.CompositeQuery{
			PanelType: v3.PanelTypeList,
			BuilderQueries: map[string]*v3.BuilderQuery{
				"A": {
					QueryName:         "A",
					Expression:        "A",
					DataSource:        v3.DataSourceLogs,
					PageSize:          10,
					Limit:             100,
					StepInterval:      60,
					AggregateOperator: v3.AggregateOperatorNoOp,
					Filters: &v3.FilterSet{
						Operator: "AND",
						Items:    []v3.FilterItem{},
					},
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							Order:      "asc",
						},
						{
							ColumnName: "id",
							Order:      "asc",
						},
					},
				},
			},
		},
	}

	tsRanges := []utils.LogsListTsRange{
		{
			Start: 1722259200000000000, // July 29, 2024 6:50:00 PM
			End:   1722262800000000000, // July 29, 2024 7:50:00 PM
		},
		{
			Start: 1722252000000000000, // July 29, 2024 4:50:00 PM
			End:   1722259200000000000, // July 29, 2024 6:50:00 PM
		},
		{
			Start: 1722237600000000000, // July 29, 2024 12:50:00 PM
			End:   1722252000000000000, // July 29, 2024 4:50:00 PM
		},
		{
			Start: 1722208800000000000, // July 29, 2024 4:50:00 AM
			End:   1722237600000000000, // July 29, 2024 12:50:00 PM
		},
		{
			Start: 1722171576000000000, // July 28, 2024 6:29:36 PM
			End:   1722208800000000000, // July 29, 2024 4:50:00 AM
		},
	}

	type queryParams struct {
		start    int64
		end      int64
		limit    uint64
		offset   uint64
		pageSize uint64
	}

	type queryResponse struct {
		expectedQuery string
		timestamps    []uint64
	}

	// create test struct with moc data i.e array of timestamps, limit, offset and expected results
	testCases := []struct {
		name               string
		queryResponses     []queryResponse
		queryParams        queryParams
		expectedTimestamps []int64
		expectedError      bool
	}{
		{
			name: "should return correct timestamps when querying within time window",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= 1722171576000000000 AND timestamp <= 1722208800000000000).* asc LIMIT 2",
					timestamps:    []uint64{1722171576010000000, 1722171576020000000},
				},
			},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				pageSize: 2,
				offset:   0,
			},
			expectedTimestamps: []int64{1722171576010000000, 1722171576020000000},
		},
		{
			name: "all data not in first windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= 1722171576000000000 AND timestamp <= 1722208800000000000).* asc LIMIT 3",
					timestamps:    []uint64{1722171576001000000, 1722171576002000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722208800000000000 AND timestamp <= 1722237600000000000).* asc LIMIT 1",
					timestamps:    []uint64{1722208800100000000},
				},
			},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				pageSize: 3,
				offset:   0,
			},
			expectedTimestamps: []int64{1722171576001000000, 1722171576002000000, 1722208800100000000},
		},
		{
			name: "query with offset and limit- data spread across multiple windows",
			queryResponses: []queryResponse{
				{
					expectedQuery: ".*(timestamp >= 1722171576000000000 AND timestamp <= 1722208800000000000).* asc LIMIT 11",
					timestamps:    []uint64{},
				},
				{
					expectedQuery: ".*(timestamp >= 1722208800000000000 AND timestamp <= 1722237600000000000).* asc LIMIT 11",
					timestamps:    []uint64{1722208800100000000, 1722208800200000000, 1722208800300000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722237600000000000 AND timestamp <= 1722252000000000000).* asc LIMIT 8",
					timestamps:    []uint64{1722237600100000000, 1722237600200000000, 1722237600300000000, 1722237600400000000, 1722237600500000000},
				},
				{
					expectedQuery: ".*(timestamp >= 1722252000000000000 AND timestamp <= 1722259200000000000).* asc LIMIT 3",
					timestamps:    []uint64{1722252000000100000, 1722252000000200000, 1722252000000300000},
				},
			},
			queryParams: queryParams{
				start:    1722171576000000000,
				end:      1722262800000000000,
				pageSize: 5,
				offset:   6,
			},
			expectedTimestamps: []int64{1722237600400000000, 1722237600500000000, 1722252000000100000, 1722252000000200000, 1722252000000300000},
		},
	}

	cols := []cmock.ColumnType{
		{Name: "timestamp", Type: "UInt64"},
		{Name: "name", Type: "String"},
	}
	testName := "name"

	options := clickhouseReader.NewOptions("", "", "archiveNamespace")

	// iterate over test data, create reader and run test
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)

			// Configure mock responses
			for _, response := range tc.queryResponses {
				values := make([][]any, 0, len(response.timestamps))
				for _, ts := range response.timestamps {
					values = append(values, []any{&ts, &testName})
				}
				telemetryStore.Mock().ExpectQuery(response.expectedQuery).WillReturnRows(
					cmock.NewRows(cols, values),
				)
			}

			// Create reader and querier
			reader := clickhouseReader.NewReader(
				nil,
				telemetryStore,
				prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}),
				"",
				time.Duration(time.Second),
				nil,
				nil,
				options,
			)

			q := &querier{
				reader: reader,
				builder: queryBuilder.NewQueryBuilder(
					queryBuilder.QueryBuilderOptions{
						BuildLogQuery: logsV4.PrepareLogsQuery,
					},
				),
			}
			// Update query parameters
			params.Start = tc.queryParams.start
			params.End = tc.queryParams.end
			params.CompositeQuery.BuilderQueries["A"].Limit = tc.queryParams.limit
			params.CompositeQuery.BuilderQueries["A"].Offset = tc.queryParams.offset
			params.CompositeQuery.BuilderQueries["A"].PageSize = tc.queryParams.pageSize

			// Create a copy of tsRanges before passing to the function
			// required because tsRanges is modified in the function
			tsRangesCopy := make([]utils.LogsListTsRange, len(tsRanges))
			copy(tsRangesCopy, tsRanges)
			// Execute query
			results, errMap, err := q.runWindowBasedListQuery(context.Background(), params, tsRangesCopy)

			if tc.expectedError {
				require.Error(t, err)
				return
			}

			// Assertions
			require.NoError(t, err, "Query execution failed")
			require.Nil(t, errMap, "Unexpected error map in results")
			require.Len(t, results, 1, "Expected exactly one result set")

			result := results[0]
			require.Equal(t, "A", result.QueryName, "Incorrect query name in results")
			require.Len(t, result.List, len(tc.expectedTimestamps),
				"Result count mismatch: got %d results, expected %d",
				len(result.List), len(tc.expectedTimestamps))

			for i, expected := range tc.expectedTimestamps {
				require.Equal(t, expected, result.List[i].Timestamp.UnixNano(),
					"Timestamp mismatch at index %d: got %d, expected %d",
					i, result.List[i].Timestamp.UnixNano(), expected)
			}

			// Verify mock expectations
			err = telemetryStore.Mock().ExpectationsWereMet()
			require.NoError(t, err, "Mock expectations were not met")
		})
	}
}
