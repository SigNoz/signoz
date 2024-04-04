package querier

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	"go.signoz.io/signoz/pkg/query-service/cache/inmemory"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestFindMissingTimeRangesZeroFreshNess(t *testing.T) {
	// There are five scenarios:
	// 1. Cached time range is a subset of the requested time range
	// 2. Cached time range is a superset of the requested time range
	// 3. Cached time range is a left overlap of the requested time range
	// 4. Cached time range is a right overlap of the requested time range
	// 5. Cached time range is a disjoint of the requested time range
	testCases := []struct {
		name           string
		requestedStart int64 // in milliseconds
		requestedEnd   int64 // in milliseconds
		requestedStep  int64 // in seconds
		cachedSeries   []*v3.Series
		expectedMiss   []missInterval
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
			expectedMiss: []missInterval{
				{
					start: 1675115596722,
					end:   1675115596722 + 60*60*1000 - 1,
				},
				{
					start: 1675115596722 + 120*60*1000 + 1,
					end:   1675115596722 + 180*60*1000,
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
			expectedMiss: []missInterval{},
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
			expectedMiss: []missInterval{
				{
					start: 1675115596722 + 120*60*1000 + 1,
					end:   1675115596722 + 180*60*1000,
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
			expectedMiss: []missInterval{
				{
					start: 1675115596722,
					end:   1675115596722 + 60*60*1000 - 1,
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
			expectedMiss: []missInterval{
				{
					start: 1675115596722,
					end:   1675115596722 + 180*60*1000,
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			misses := findMissingTimeRanges(tc.requestedStart, tc.requestedEnd, tc.requestedStep, tc.cachedSeries, 0*time.Minute)
			if len(misses) != len(tc.expectedMiss) {
				t.Errorf("expected %d misses, got %d", len(tc.expectedMiss), len(misses))
			}
			for i, miss := range misses {
				if miss.start != tc.expectedMiss[i].start {
					t.Errorf("expected start %d, got %d", tc.expectedMiss[i].start, miss.start)
				}
				if miss.end != tc.expectedMiss[i].end {
					t.Errorf("expected end %d, got %d", tc.expectedMiss[i].end, miss.end)
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
		expectedMiss   []missInterval
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
			expectedMiss: []missInterval{
				{
					start: 1675115596722,
					end:   1675115596722 + 60*60*1000 - 1,
				},
				{
					start: 1675115596722 + 120*60*1000 + 1,
					end:   1675115596722 + 180*60*1000,
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
			expectedMiss: []missInterval{},
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
			expectedMiss: []missInterval{
				{
					start: 1675115596722 + 120*60*1000 + 1,
					end:   1675115596722 + 180*60*1000,
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
			expectedMiss: []missInterval{
				{
					start: 1675115596722,
					end:   1675115596722 + 60*60*1000 - 1,
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
			expectedMiss: []missInterval{
				{
					start: 1675115596722,
					end:   1675115596722 + 180*60*1000,
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			misses := findMissingTimeRanges(tc.requestedStart, tc.requestedEnd, tc.requestedStep, tc.cachedSeries, tc.fluxInterval)
			if len(misses) != len(tc.expectedMiss) {
				t.Errorf("expected %d misses, got %d", len(tc.expectedMiss), len(misses))
			}
			for i, miss := range misses {
				if miss.start != tc.expectedMiss[i].start {
					t.Errorf("expected start %d, got %d", tc.expectedMiss[i].start, miss.start)
				}
				if miss.end != tc.expectedMiss[i].end {
					t.Errorf("expected end %d, got %d", tc.expectedMiss[i].end, miss.end)
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
		fmt.Sprintf("timestamp_ms >= %d AND timestamp_ms < %d", 1675115520000, 1675115580000+120*60*1000),
		fmt.Sprintf("timestamp_ms >= %d AND timestamp_ms < %d", 1675115520000+120*60*1000, 1675115580000+180*60*1000),
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", 1675115580000*1000000, (1675115580000+120*60*1000)*int64(1000000)),
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", (1675115580000+60*60*1000)*int64(1000000), (1675115580000+180*60*1000)*int64(1000000)),
	}

	for i, param := range params {
		_, err, errByName := q.QueryRange(context.Background(), param, nil)
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
		fmt.Sprintf("timestamp_ms >= %d AND timestamp_ms < %d", 1675115520000, 1675115580000+120*60*1000),
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", (1675115580000+60*60*1000)*int64(1000000), (1675115580000+180*60*1000)*int64(1000000)),
	}

	for i, param := range params {
		_, err, errByName := q.QueryRange(context.Background(), param, nil)
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
		_, err, errByName := q.QueryRange(context.Background(), param, nil)
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
			Start: 1675115596722 + 60*60*1000 - 86400*1000,  //30, 4:23
			End:   1675115596722 + 120*60*1000 - 86400*1000, //30, 5:23
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
					{Timestamp: 1675115596722 + 60*60*1000 - 86400*1000, Value: 1},
					{Timestamp: 1675115596722 + 120*60*1000 - 86400*1000 + 60*60*1000, Value: 2},
				},
			},
		},
	}
	q := NewQuerier(opts)

	// logs queries are generates in ns
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722+60*60*1000-86400*1000)*1000000, (1675115596722+120*60*1000-86400*1000)*1000000),
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722-86400*1000)*1000000, ((1675115596722+60*60*1000)-86400*1000-1)*1000000),
	}

	for i, param := range params {
		_, err, errByName := q.QueryRange(context.Background(), param, nil)
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
			Start: 1675115596722 + 60*60*1000 - 86400*1000,  //30, 4:23
			End:   1675115596722 + 120*60*1000 - 86400*1000, //30, 5:23
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
					{Timestamp: 1675115596722 + 60*60*1000 - 86400*1000, Value: 1},
					{Timestamp: 1675115596722 + 120*60*1000 - 86400*1000 + 60*60*1000, Value: 2},
				},
			},
		},
	}
	q := NewQuerier(opts)

	// logs queries are generates in ns
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722+60*60*1000-86400*1000)*1000000, (1675115596722+120*60*1000-86400*1000)*1000000),
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722-86400*1000)*1000000, ((1675115596722+60*60*1000)-86400*1000-1)*1000000),
	}

	for i, param := range params {
		_, err, errByName := q.QueryRange(context.Background(), param, nil)
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
