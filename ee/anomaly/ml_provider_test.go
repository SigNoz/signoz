package anomaly

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type providerFunc func(
	ctx context.Context,
	orgID valuer.UUID,
	request *AnomaliesRequest,
) (*AnomaliesResponse, error)

func (function providerFunc) GetAnomalies(
	ctx context.Context,
	orgID valuer.UUID,
	request *AnomaliesRequest,
) (*AnomaliesResponse, error) {
	return function(ctx, orgID, request)
}

func TestMLProviderDelegatesToBaseProvider(t *testing.T) {
	expectedResponse := &AnomaliesResponse{
		Results: []*qbtypes.TimeSeriesData{},
	}

	var receivedRequest *AnomaliesRequest

	stub := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		request *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		receivedRequest = request
		return expectedResponse, nil
	})

	provider := NewMLProvider(
		stub,
		nil,
		slog.Default(),
	)

	originalRequest := &AnomaliesRequest{
		Params:      &qbtypes.QueryRangeRequest{},
		Seasonality: SeasonalityWeekly,
	}

	var orgID valuer.UUID

	response, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		originalRequest,
	)
	if err != nil {
		t.Fatalf("get anomalies: %v", err)
	}

	if response != expectedResponse {
		t.Fatal("ML provider did not return the base provider response")
	}

	if receivedRequest == nil {
		t.Fatal("base provider did not receive a request")
	}

	if receivedRequest == originalRequest {
		t.Fatal("ML provider passed the original request without copying it")
	}

	if receivedRequest.Params != originalRequest.Params {
		t.Fatal("ML provider unexpectedly copied query parameters")
	}

	if receivedRequest.Seasonality != originalRequest.Seasonality {
		t.Fatalf(
			"unexpected seasonality: got %q, want %q",
			receivedRequest.Seasonality.StringValue(),
			originalRequest.Seasonality.StringValue(),
		)
	}
}

func TestMLProviderPropagatesBaseProviderError(t *testing.T) {
	expectedErr := errors.New("base provider failed")

	stub := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		return nil, expectedErr
	})

	provider := NewMLProvider(
		stub,
		nil,
		slog.Default(),
	)

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		&AnomaliesRequest{
			Params: &qbtypes.QueryRangeRequest{},
		},
	)
	if !errors.Is(err, expectedErr) {
		t.Fatalf(
			"unexpected error: got %v, want %v",
			err,
			expectedErr,
		)
	}
}

func TestMLProviderRejectsNilRequest(t *testing.T) {
	stub := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		t.Fatal("base provider must not be called")
		return nil, nil
	})

	provider := NewMLProvider(
		stub,
		nil,
		slog.Default(),
	)

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		nil,
	)
	if err == nil {
		t.Fatal("expected an error")
	}
}

func TestMLProviderRejectsNilParams(t *testing.T) {
	stub := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		t.Fatal("base provider must not be called")
		return nil, nil
	})

	provider := NewMLProvider(
		stub,
		nil,
		slog.Default(),
	)

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		&AnomaliesRequest{},
	)
	if err == nil {
		t.Fatal("expected an error")
	}
}

func TestMLProviderRejectsNilBaseProvider(t *testing.T) {
	provider := NewMLProvider(
		nil,
		nil,
		slog.Default(),
	)

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		&AnomaliesRequest{
			Params: &qbtypes.QueryRangeRequest{},
		},
	)
	if err == nil {
		t.Fatal("expected an error")
	}
}

func TestLoadNABEC2CPU(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	seriesKey := "realAWSCloudwatch/ec2_cpu_utilization_5f5533.csv"

	seriesPath := filepath.Join(
		nabRoot,
		"data",
		filepath.FromSlash(seriesKey),
	)

	labelsPath := filepath.Join(
		nabRoot,
		"labels",
		"combined_windows.json",
	)

	points, err := loadNABPoints(seriesPath)
	if err != nil {
		t.Fatalf("load NAB points: %v", err)
	}

	windows, err := loadNABWindows(labelsPath, seriesKey)
	if err != nil {
		t.Fatalf("load NAB windows: %v", err)
	}

	if len(points) == 0 {
		t.Fatal("NAB series contains no points")
	}

	if len(windows) == 0 {
		t.Fatal("NAB series contains no anomaly windows")
	}

	for index := 1; index < len(points); index++ {
		if !points[index].Timestamp.After(
			points[index-1].Timestamp,
		) {
			t.Fatalf(
				"timestamps are not strictly increasing at index %d",
				index,
			)
		}
	}

	anomalousPoints := 0

	for _, point := range points {
		if isInsideNABWindow(point.Timestamp, windows) {
			anomalousPoints++
		}
	}

	if anomalousPoints == 0 {
		t.Fatal("no points fall inside NAB anomaly windows")
	}

	t.Logf(
		"loaded points=%d windows=%d anomalous_points=%d",
		len(points),
		len(windows),
		anomalousPoints,
	)
}

func TestCompareStandardAndMLScoresOnNAB(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	seriesKey := "realAWSCloudwatch/ec2_cpu_utilization_5f5533.csv"

	points, err := loadNABPoints(filepath.Join(
		nabRoot,
		"data",
		filepath.FromSlash(seriesKey),
	))
	if err != nil {
		t.Fatalf("load NAB points: %v", err)
	}

	windows, err := loadNABWindows(
		filepath.Join(
			nabRoot,
			"labels",
			"combined_windows.json",
		),
		seriesKey,
	)
	if err != nil {
		t.Fatalf("load NAB windows: %v", err)
	}

	if len(windows) == 0 {
		t.Fatal("NAB series contains no anomaly windows")
	}

	const pointsPerSeries = 24
	const historicalSeriesCount = 5

	currentStart := -1

	for index, point := range points {
		if !point.Timestamp.Before(windows[0].Start) {
			currentStart = index
			break
		}
	}

	if currentStart == -1 {
		t.Fatal("first anomaly window is outside the NAB series")
	}

	historyStart := currentStart -
		pointsPerSeries*historicalSeriesCount

	currentEnd := currentStart + pointsPerSeries

	if historyStart < 0 {
		t.Fatalf(
			"not enough history: current_start=%d required=%d",
			currentStart,
			pointsPerSeries*historicalSeriesCount,
		)
	}

	if currentEnd > len(points) {
		t.Fatalf(
			"not enough current points: current_end=%d total=%d",
			currentEnd,
			len(points),
		)
	}

	past3SeasonSeries := nabPointsToTimeSeries(
		points[historyStart : historyStart+pointsPerSeries],
	)

	past2SeasonSeries := nabPointsToTimeSeries(
		points[historyStart+pointsPerSeries : historyStart+2*pointsPerSeries],
	)

	pastSeasonSeries := nabPointsToTimeSeries(
		points[historyStart+2*pointsPerSeries : historyStart+3*pointsPerSeries],
	)

	currentSeasonSeries := nabPointsToTimeSeries(
		points[historyStart+3*pointsPerSeries : historyStart+4*pointsPerSeries],
	)

	previousSeries := nabPointsToTimeSeries(
		points[historyStart+4*pointsPerSeries : historyStart+5*pointsPerSeries],
	)

	currentPoints := points[currentStart:currentEnd]
	currentSeries := nabPointsToTimeSeries(currentPoints)

	standardProvider := &BaseSeasonalProvider{}

	standardScores := standardProvider.getAnomalyScores(
		currentSeries,
		previousSeries,
		currentSeasonSeries,
		pastSeasonSeries,
		past2SeasonSeries,
		past3SeasonSeries,
	)

	baseResponse := &AnomaliesResponse{
		Results: []*qbtypes.TimeSeriesData{
			{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Series: []*qbtypes.TimeSeries{
							currentSeries,
						},
						AnomalyScores: []*qbtypes.TimeSeries{
							standardScores,
						},
					},
				},
			},
		},
	}

	baseProvider := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		return baseResponse, nil
	})

	request := &AnomaliesRequest{
		Params:      &qbtypes.QueryRangeRequest{},
		Seasonality: SeasonalityDaily,
	}

	var orgID valuer.UUID

	standardResponse, err := baseProvider.GetAnomalies(
		context.Background(),
		orgID,
		request,
	)
	if err != nil {
		t.Fatalf("get Standard anomalies: %v", err)
	}

	logger := slog.New(
		slog.NewTextHandler(io.Discard, nil),
	)

	mlProvider := NewMLProvider(
		baseProvider,
		nil,
		logger,
	)

	mlResponse, err := mlProvider.GetAnomalies(
		context.Background(),
		orgID,
		request,
	)
	if err != nil {
		t.Fatalf("get ML anomalies: %v", err)
	}

	standardScoreSeries, err := firstAnomalyScoreSeries(
		standardResponse,
	)
	if err != nil {
		t.Fatalf("read Standard scores: %v", err)
	}

	mlScoreSeries, err := firstAnomalyScoreSeries(
		mlResponse,
	)
	if err != nil {
		t.Fatalf("read ML scores: %v", err)
	}

	if len(standardScoreSeries.Values) != len(mlScoreSeries.Values) {
		t.Fatalf(
			"different score lengths: Standard=%d ML=%d",
			len(standardScoreSeries.Values),
			len(mlScoreSeries.Values),
		)
	}

	if len(currentPoints) != len(standardScoreSeries.Values) {
		t.Fatalf(
			"different metric and score lengths: metrics=%d scores=%d",
			len(currentPoints),
			len(standardScoreSeries.Values),
		)
	}

	equalScores := 0

	t.Log("")
	t.Log(
		"timestamp | cpu | in_nab_window | standard_score | ml_score | equal",
	)

	for index := range standardScoreSeries.Values {
		standardValue := standardScoreSeries.Values[index]
		mlValue := mlScoreSeries.Values[index]
		point := currentPoints[index]

		equal := standardValue.Timestamp == mlValue.Timestamp &&
			standardValue.Value == mlValue.Value

		if equal {
			equalScores++
		}

		t.Logf(
			"%s | %.6f | %t | %.6f | %.6f | %t",
			point.Timestamp.Format(time.RFC3339),
			point.Value,
			isInsideNABWindow(point.Timestamp, windows),
			standardValue.Value,
			mlValue.Value,
			equal,
		)
	}

	t.Log("")
	t.Logf(
		"comparison: total=%d equal=%d different=%d",
		len(standardScoreSeries.Values),
		equalScores,
		len(standardScoreSeries.Values)-equalScores,
	)

	if equalScores != len(standardScoreSeries.Values) {
		t.Fatalf(
			"Standard and ML scores differ: equal=%d total=%d",
			equalScores,
			len(standardScoreSeries.Values),
		)
	}
}

type nabPoint struct {
	Timestamp time.Time
	Value     float64
}

type nabWindow struct {
	Start time.Time
	End   time.Time
}

func loadNABPoints(path string) ([]nabPoint, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open NAB series: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)

	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("read NAB header: %w", err)
	}

	if len(header) != 2 {
		return nil, fmt.Errorf(
			"unexpected NAB header: %v",
			header,
		)
	}

	header[0] = strings.TrimPrefix(
		strings.TrimSpace(header[0]),
		"\uFEFF",
	)
	header[1] = strings.TrimSpace(header[1])

	if header[0] != "timestamp" || header[1] != "value" {
		return nil, fmt.Errorf(
			"unexpected NAB header: %v",
			header,
		)
	}

	points := make([]nabPoint, 0)

	for {
		record, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf(
				"read NAB record: %w",
				err,
			)
		}

		if len(record) != 2 {
			return nil, fmt.Errorf(
				"unexpected NAB record: %v",
				record,
			)
		}

		timestamp, err := parseNABTimestamp(record[0])
		if err != nil {
			return nil, fmt.Errorf(
				"parse NAB timestamp %q: %w",
				record[0],
				err,
			)
		}

		value, err := strconv.ParseFloat(
			strings.TrimSpace(record[1]),
			64,
		)
		if err != nil {
			return nil, fmt.Errorf(
				"parse NAB value %q: %w",
				record[1],
				err,
			)
		}

		points = append(points, nabPoint{
			Timestamp: timestamp,
			Value:     value,
		})
	}

	return points, nil
}

func loadNABWindows(
	path string,
	seriesKey string,
) ([]nabWindow, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf(
			"read NAB windows: %w",
			err,
		)
	}

	var labels map[string][][]string

	if err := json.Unmarshal(content, &labels); err != nil {
		return nil, fmt.Errorf(
			"decode NAB windows: %w",
			err,
		)
	}

	normalizedKey := filepath.ToSlash(seriesKey)

	rawWindows, ok := labels[normalizedKey]
	if !ok {
		return nil, fmt.Errorf(
			"NAB windows not found for %q",
			normalizedKey,
		)
	}

	windows := make([]nabWindow, 0, len(rawWindows))

	for _, rawWindow := range rawWindows {
		if len(rawWindow) != 2 {
			return nil, fmt.Errorf(
				"invalid NAB window for %q: %v",
				normalizedKey,
				rawWindow,
			)
		}

		start, err := parseNABTimestamp(rawWindow[0])
		if err != nil {
			return nil, fmt.Errorf(
				"parse NAB window start %q: %w",
				rawWindow[0],
				err,
			)
		}

		end, err := parseNABTimestamp(rawWindow[1])
		if err != nil {
			return nil, fmt.Errorf(
				"parse NAB window end %q: %w",
				rawWindow[1],
				err,
			)
		}

		if end.Before(start) {
			return nil, fmt.Errorf(
				"invalid NAB window: end %s is before start %s",
				end,
				start,
			)
		}

		windows = append(windows, nabWindow{
			Start: start,
			End:   end,
		})
	}

	return windows, nil
}

func parseNABTimestamp(value string) (time.Time, error) {
	value = strings.TrimSpace(value)

	layouts := []string{
		"2006-01-02 15:04:05",
		"2006-01-02 15:04:05.000000",
		time.RFC3339,
		time.RFC3339Nano,
	}

	var parseErr error

	for _, layout := range layouts {
		timestamp, err := time.Parse(layout, value)
		if err == nil {
			return timestamp, nil
		}

		parseErr = err
	}

	return time.Time{}, parseErr
}

func isInsideNABWindow(
	timestamp time.Time,
	windows []nabWindow,
) bool {
	for _, window := range windows {
		if !timestamp.Before(window.Start) &&
			!timestamp.After(window.End) {
			return true
		}
	}

	return false
}

func nabPointsToTimeSeries(
	points []nabPoint,
) *qbtypes.TimeSeries {
	values := make(
		[]*qbtypes.TimeSeriesValue,
		0,
		len(points),
	)

	for _, point := range points {
		values = append(values, &qbtypes.TimeSeriesValue{
			Timestamp: point.Timestamp.UnixMilli(),
			Value:     point.Value,
		})
	}

	return &qbtypes.TimeSeries{
		Values: values,
	}
}

func firstAnomalyScoreSeries(
	response *AnomaliesResponse,
) (*qbtypes.TimeSeries, error) {
	if response == nil {
		return nil, errors.New("anomaly response is nil")
	}

	if len(response.Results) == 0 {
		return nil, errors.New("anomaly response contains no results")
	}

	result := response.Results[0]

	if result == nil {
		return nil, errors.New("first anomaly result is nil")
	}

	if len(result.Aggregations) == 0 {
		return nil, errors.New("anomaly result contains no aggregations")
	}

	aggregation := result.Aggregations[0]

	if aggregation == nil {
		return nil, errors.New("first aggregation is nil")
	}

	if len(aggregation.AnomalyScores) == 0 {
		return nil, errors.New("aggregation contains no anomaly scores")
	}

	if aggregation.AnomalyScores[0] == nil {
		return nil, errors.New("first anomaly score series is nil")
	}

	return aggregation.AnomalyScores[0], nil
}
