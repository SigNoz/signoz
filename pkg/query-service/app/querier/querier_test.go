package querier

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"testing"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	"go.signoz.io/signoz/pkg/query-service/cache/inmemory"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/querycache"
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

func TestFindMissingTimeRangesZeroFreshNess(t *testing.T) {
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

	c := inmemory.New(&inmemory.Options{TTL: 5 * time.Minute, CleanupInterval: 10 * time.Minute})

	qc := querycache.NewQueryCache(querycache.WithCache(c))

	for idx, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cacheKey := fmt.Sprintf("test-cache-key-%d", idx)
			cachedData := &querycache.CachedSeriesData{
				Start: minTimestamp(tc.cachedSeries),
				End:   maxTimestamp(tc.cachedSeries),
				Data:  tc.cachedSeries,
			}
			jsonData, err := json.Marshal([]*querycache.CachedSeriesData{cachedData})
			if err != nil {
				t.Errorf("error marshalling cached data: %v", err)
			}
			err = c.Store(cacheKey, jsonData, 5*time.Minute)
			if err != nil {
				t.Errorf("error storing cached data: %v", err)
			}

			misses := qc.FindMissingTimeRanges(tc.requestedStart, tc.requestedEnd, tc.requestedStep, cacheKey)
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

func TestFindMissingTimeRangesWithFluxInterval(t *testing.T) {

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

	c := inmemory.New(&inmemory.Options{TTL: 5 * time.Minute, CleanupInterval: 10 * time.Minute})

	qc := querycache.NewQueryCache(querycache.WithCache(c))

	for idx, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cacheKey := fmt.Sprintf("test-cache-key-%d", idx)
			cachedData := &querycache.CachedSeriesData{
				Start: minTimestamp(tc.cachedSeries),
				End:   maxTimestamp(tc.cachedSeries),
				Data:  tc.cachedSeries,
			}
			jsonData, err := json.Marshal([]*querycache.CachedSeriesData{cachedData})
			if err != nil {
				t.Errorf("error marshalling cached data: %v", err)
			}
			err = c.Store(cacheKey, jsonData, 5*time.Minute)
			if err != nil {
				t.Errorf("error storing cached data: %v", err)
			}
			misses := qc.FindMissingTimeRanges(tc.requestedStart, tc.requestedEnd, tc.requestedStep, cacheKey)
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

func TestQueryRange(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start: 1675115596722,
			End:   1675115596722 + 120*60*1000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
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
						Expression:        "A",
					},
				},
			},
		},
		{
			Start: 1675115596722 + 60*60*1000,
			End:   1675115596722 + 180*60*1000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
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
						Expression:        "A",
					},
				},
			},
		},
		// No caching for traces & logs yet
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
	cache := inmemory.New(&inmemory.Options{TTL: 5 * time.Minute, CleanupInterval: 10 * time.Minute})
	opts := QuerierOptions{
		Cache:        cache,
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
					{Timestamp: 1675115596722, Value: 1},
					{Timestamp: 1675115596722 + 60*60*1000, Value: 2},
					{Timestamp: 1675115596722 + 120*60*1000, Value: 3},
				},
			},
		},
	}
	q := NewQuerier(opts)
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115520000, 1675115580000+120*60*1000),
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115520000+120*60*1000, 1675115580000+180*60*1000),
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", 1675115580000*1000000, (1675115580000+120*60*1000)*int64(1000000)),
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", (1675115580000+60*60*1000)*int64(1000000), (1675115580000+180*60*1000)*int64(1000000)),
	}

	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), param)
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

func TestQueryRangeValueType(t *testing.T) {
	// There shouldn't be any caching for value panel type
	params := []*v3.QueryRangeParamsV3{
		{
			Start: 1675115596722,
			End:   1675115596722 + 120*60*1000,
			Step:  5 * time.Minute.Milliseconds(),
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
						Expression:        "A",
						ReduceTo:          v3.ReduceToOperatorLast,
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
	cache := inmemory.New(&inmemory.Options{TTL: 60 * time.Minute, CleanupInterval: 10 * time.Minute})
	opts := QuerierOptions{
		Cache:        cache,
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
					{Timestamp: 1675115596722, Value: 1},
					{Timestamp: 1675115596722 + 60*60*1000, Value: 2},
					{Timestamp: 1675115596722 + 120*60*1000, Value: 3},
				},
			},
		},
	}
	q := NewQuerier(opts)
	// No caching
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115520000, 1675115580000+120*60*1000),
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", (1675115580000+60*60*1000)*int64(1000000), (1675115580000+180*60*1000)*int64(1000000)),
	}

	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), param)
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
func TestQueryRangeTimeShift(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start: 1675115596722,               //31, 3:23
			End:   1675115596722 + 120*60*1000, //31, 5:23
			Step:  5 * time.Minute.Milliseconds(),
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
		_, errByName, err := q.QueryRange(context.Background(), param)
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
func TestQueryRangeTimeShiftWithCache(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start: 1675115596722 + 60*60*1000 - 86400*1000,  //30th Jan, 4:23
			End:   1675115596722 + 120*60*1000 - 86400*1000, //30th Jan, 5:23
			Step:  5 * time.Minute.Milliseconds(),
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
			Start: 1675115596722,               //31st Jan, 3:23
			End:   1675115596722 + 120*60*1000, //31st Jan, 5:23
			Step:  5 * time.Minute.Milliseconds(),
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
	cache := inmemory.New(&inmemory.Options{TTL: 60 * time.Minute, CleanupInterval: 10 * time.Minute})
	opts := QuerierOptions{
		Cache:        cache,
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
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722+60*60*1000-86400*1000)*1000000, (1675115596722+120*60*1000-86400*1000)*1000000),
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722-86400*1000)*1000000, ((1675115596722+120*60*1000)-86400*1000)*1000000),
	}

	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), param)
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
func TestQueryRangeTimeShiftWithLimitAndCache(t *testing.T) {
	params := []*v3.QueryRangeParamsV3{
		{
			Start: 1675115596722 + 60*60*1000 - 86400*1000,  //30th Jan, 4:23
			End:   1675115596722 + 120*60*1000 - 86400*1000, //30th Jan, 5:23
			Step:  5 * time.Minute.Milliseconds(),
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
			Start: 1675115596722,               //31st Jan, 3:23
			End:   1675115596722 + 120*60*1000, //31st Jan, 5:23
			Step:  5 * time.Minute.Milliseconds(),
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
	cache := inmemory.New(&inmemory.Options{TTL: 60 * time.Minute, CleanupInterval: 10 * time.Minute})
	opts := QuerierOptions{
		Cache:        cache,
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
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722+60*60*1000-86400*1000)*1000000, (1675115596722+120*60*1000-86400*1000)*1000000),
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722-86400*1000)*1000000, ((1675115596722+120*60*1000)-86400*1000)*1000000),
	}

	for i, param := range params {
		tracesV3.Enrich(param, map[string]v3.AttributeKey{})
		_, errByName, err := q.QueryRange(context.Background(), param)
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

func TestQueryRangeValueTypePromQL(t *testing.T) {
	// There shouldn't be any caching for value panel type
	params := []*v3.QueryRangeParamsV3{
		{
			Start: 1675115596722,
			End:   1675115596722 + 120*60*1000,
			Step:  5 * time.Minute.Milliseconds(),
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
			Start: 1675115596722 + 60*60*1000,
			End:   1675115596722 + 180*60*1000,
			Step:  5 * time.Minute.Milliseconds(),
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
	cache := inmemory.New(&inmemory.Options{TTL: 60 * time.Minute, CleanupInterval: 10 * time.Minute})
	opts := QuerierOptions{
		Cache:        cache,
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
		_, errByName, err := q.QueryRange(context.Background(), param)
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
