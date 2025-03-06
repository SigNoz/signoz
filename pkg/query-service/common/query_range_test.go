package common

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/querycache"
)

func TestGetSeriesFromCachedData(t *testing.T) {
	testCases := []struct {
		name           string
		data           []querycache.CachedSeriesData
		start          int64
		end            int64
		expectedCount  int
		expectedPoints int
	}{
		{
			name: "Single point outside range",
			data: []querycache.CachedSeriesData{
				{
					Data: []*v3.Series{
						{
							Labels: map[string]string{"label1": "value1"},
							Points: []v3.Point{
								{Timestamp: 1609473600000, Value: 1.0},
							},
						},
					},
				},
			},
			start:          1609475400000, // 01 Jan 2021 04:30:00 UTC
			end:            1609477200000, // 01 Jan 2021 05:00:00 UTC
			expectedCount:  1,
			expectedPoints: 0,
		},
		{
			name: "Single point inside range",
			data: []querycache.CachedSeriesData{
				{
					Data: []*v3.Series{
						{
							Labels: map[string]string{"label1": "value1"},
							Points: []v3.Point{
								{Timestamp: 1609476000000, Value: 1.0},
							},
						},
					},
				},
			},
			start:          1609475400000, // 01 Jan 2021 04:30:00 UTC
			end:            1609477200000, // 01 Jan 2021 05:00:00 UTC
			expectedCount:  1,
			expectedPoints: 1,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			series := GetSeriesFromCachedData(tc.data, tc.start, tc.end)

			if len(series) != tc.expectedCount {
				t.Errorf("Expected %d series, got %d", tc.expectedCount, len(series))
			}
			if len(series[0].Points) != tc.expectedPoints {
				t.Errorf("Expected %d points, got %d", tc.expectedPoints, len(series[0].Points))
			}
		})
	}
}

func TestGetSeriesFromCachedDataV2(t *testing.T) {
	testCases := []struct {
		name           string
		data           []querycache.CachedSeriesData
		start          int64
		end            int64
		step           int64
		expectedCount  int
		expectedPoints int
	}{
		{
			name: "Single point outside range",
			data: []querycache.CachedSeriesData{
				{
					Data: []*v3.Series{
						{
							Labels: map[string]string{"label1": "value1"},
							Points: []v3.Point{
								{Timestamp: 1609473600000, Value: 1.0},
							},
						},
					},
				},
			},
			start:          1609475400000,
			end:            1609477200000,
			step:           1000,
			expectedCount:  1,
			expectedPoints: 0,
		},
		{
			name: "Single point inside range",
			data: []querycache.CachedSeriesData{
				{
					Data: []*v3.Series{
						{
							Labels: map[string]string{"label1": "value1"},
							Points: []v3.Point{
								{Timestamp: 1609476000000, Value: 1.0},
							},
						},
					},
				},
			},
			start:          1609475400000,
			end:            1609477200000,
			step:           1000,
			expectedCount:  1,
			expectedPoints: 1,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			series := GetSeriesFromCachedDataV2(tc.data, tc.start, tc.end, tc.step)

			if len(series) != tc.expectedCount {
				t.Errorf("Expected %d series, got %d", tc.expectedCount, len(series))
			}
			if len(series[0].Points) != tc.expectedPoints {
				t.Errorf("Expected %d points, got %d", tc.expectedPoints, len(series[0].Points))
			}
		})
	}
}
