package v2

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

func TestV2FindMissingTimeRangesZeroFreshNess(t *testing.T) {
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

func TestV2FindMissingTimeRangesWithFluxInterval(t *testing.T) {

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

	for i, param := range params {
		_, errByName, err := q.QueryRange(context.Background(), param, nil)
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
					{Timestamp: 1675115596722, Value: 1},               // 31st Jan, 03:23:16
					{Timestamp: 1675115596722 + 60*60*1000, Value: 2},  // 31st Jan, 04:23:16
					{Timestamp: 1675115596722 + 120*60*1000, Value: 3}, // 31st Jan, 05:23:16
				},
			},
		},
	}
	q := NewQuerier(opts)
	expectedTimeRangeInQueryString := []string{
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115520000, 1675115580000+120*60*1000),                                                 // 31st Jan, 03:23:00 to 31st Jan, 05:23:00
		fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", 1675115580000+120*60*1000, 1675115580000+180*60*1000),                                     // 31st Jan, 05:23:00 to 31st Jan, 06:23:00
		fmt.Sprintf("timestamp >= '%d' AND timestamp <= '%d'", (1675115580000+60*60*1000)*int64(1000000), (1675115580000+180*60*1000)*int64(1000000)), // 31st Jan, 05:23:00 to 31st Jan, 06:23:00
	}

	for i, param := range params {
		_, errByName, err := q.QueryRange(context.Background(), param, nil)
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
		_, errByName, err := q.QueryRange(context.Background(), param, nil)
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
		_, errByName, err := q.QueryRange(context.Background(), param, nil)
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
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722+60*60*1000-86400*1000)*1000000, (1675115596722+120*60*1000-86400*1000)*1000000), // 30th Jan, 4:23 to 30th Jan, 5:23
		fmt.Sprintf("timestamp >= %d AND timestamp <= %d", (1675115596722-86400*1000)*1000000, ((1675115596722+120*60*1000)-86400*1000)*1000000),
	}

	for i, param := range params {
		_, errByName, err := q.QueryRange(context.Background(), param, nil)
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
		ranges []missInterval
	}{
		{
			query: "signoz_calls_total",
			ranges: []missInterval{
				{start: 1675115596722, end: 1675115596722 + 120*60*1000},
			},
		},
		{
			query: "signoz_latency_bucket",
			ranges: []missInterval{
				{start: 1675115596722 + 60*60*1000, end: 1675115596722 + 180*60*1000},
			},
		},
	}

	for i, param := range params {
		_, errByName, err := q.QueryRange(context.Background(), param, nil)
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
		if q.TimeRanges()[i][0] != int(expectedQueryAndTimeRanges[i].ranges[0].start) {
			t.Errorf("expected time ranges to be %v, got %v", expectedQueryAndTimeRanges[i].ranges, q.TimeRanges()[i])
		}
		if q.TimeRanges()[i][1] != int(expectedQueryAndTimeRanges[i].ranges[0].end) {
			t.Errorf("expected time ranges to be %v, got %v", expectedQueryAndTimeRanges[i].ranges, q.TimeRanges()[i])
		}
	}
}
