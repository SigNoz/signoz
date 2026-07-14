package anomaly

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"slices"
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

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	provider := NewMLProvider(stub, nil, logger)

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

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	provider := NewMLProvider(stub, nil, logger)

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		&AnomaliesRequest{Params: &qbtypes.QueryRangeRequest{}},
	)
	if !errors.Is(err, expectedErr) {
		t.Fatalf("unexpected error: got %v, want %v", err, expectedErr)
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

	provider := NewMLProvider(stub, nil, slog.Default())

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(context.Background(), orgID, nil)
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

	provider := NewMLProvider(stub, nil, slog.Default())

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
	provider := NewMLProvider(nil, nil, slog.Default())

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		&AnomaliesRequest{Params: &qbtypes.QueryRangeRequest{}},
	)
	if err == nil {
		t.Fatal("expected an error")
	}
}

func TestMLProviderUsesZScoreDuringWarmup(t *testing.T) {
	var baseResponse *AnomaliesResponse

	baseProvider := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		return baseResponse, nil
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	provider := NewMLProvider(baseProvider, nil, logger)

	request := &AnomaliesRequest{
		Params:      &qbtypes.QueryRangeRequest{},
		Seasonality: SeasonalityDaily,
	}

	var orgID valuer.UUID
	const fallbackScore = 1.25
	const warmupPoints = 32

	for index := 0; index < warmupPoints; index++ {
		baseResponse = newSinglePointAnomalyResponse(
			int64(index+1),
			50+float64(index%7)*0.1,
			fallbackScore,
		)

		response, err := provider.GetAnomalies(
			context.Background(),
			orgID,
			request,
		)
		if err != nil {
			t.Fatalf("warmup point %d: %v", index, err)
		}

		scoreSeries, err := firstAnomalyScoreSeries(response)
		if err != nil {
			t.Fatalf("read warmup score %d: %v", index, err)
		}

		if scoreSeries.Values[0].Value != fallbackScore {
			t.Fatalf(
				"warmup point %d: got score %.6f, want fallback %.6f",
				index,
				scoreSeries.Values[0].Value,
				fallbackScore,
			)
		}
	}

	state := onlyMLSeriesState(t, provider)
	if len(state.values) != warmupPoints {
		t.Fatalf(
			"unexpected warmup sample count: got %d, want %d",
			len(state.values),
			warmupPoints,
		)
	}
}

func TestMLProviderSwitchesFromZScoreToKMeans(t *testing.T) {
	var baseResponse *AnomaliesResponse

	baseProvider := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		return baseResponse, nil
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	provider := NewMLProvider(baseProvider, nil, logger)

	request := &AnomaliesRequest{
		Params:      &qbtypes.QueryRangeRequest{},
		Seasonality: SeasonalityDaily,
	}

	var orgID valuer.UUID
	const fallbackScore = 1.25

	for index := 0; index < mlCriticalMass; index++ {
		value := 50 + float64(index%17-8)*0.25
		baseResponse = newSinglePointAnomalyResponse(
			int64(index+1),
			value,
			fallbackScore,
		)

		response, err := provider.GetAnomalies(
			context.Background(),
			orgID,
			request,
		)
		if err != nil {
			t.Fatalf("warmup point %d: %v", index, err)
		}

		scoreSeries, err := firstAnomalyScoreSeries(response)
		if err != nil {
			t.Fatalf("read warmup score %d: %v", index, err)
		}

		if scoreSeries.Values[0].Value != fallbackScore {
			t.Fatalf(
				"warmup point %d: got score %.6f, want fallback %.6f",
				index,
				scoreSeries.Values[0].Value,
				fallbackScore,
			)
		}
	}

	baseResponse = newSinglePointAnomalyResponse(
		int64(mlCriticalMass+1),
		100,
		2,
	)

	response, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		request,
	)
	if err != nil {
		t.Fatalf("get trained ML score: %v", err)
	}

	scoreSeries, err := firstAnomalyScoreSeries(response)
	if err != nil {
		t.Fatalf("read trained ML score: %v", err)
	}

	mlScore := scoreSeries.Values[0].Value

	t.Logf(
		"critical_mass=%d fallback_score=2.000000 ml_score=%.6f",
		mlCriticalMass,
		mlScore,
	)

	if mlScore == 2 {
		t.Fatal("ML provider still returned the fallback Z-score after warmup")
	}

	if mlScore > -3 && mlScore < 3 {
		t.Fatalf("expected value 100 to be anomalous, got ML score %.6f", mlScore)
	}

	state := onlyMLSeriesState(t, provider)
	if len(state.values) != mlCriticalMass {
		t.Fatalf(
			"anomalous value was added to training history: got %d samples, want %d",
			len(state.values),
			mlCriticalMass,
		)
	}
}

func TestNetdataFeaturesDifference(t *testing.T) {
	rawValues := []float64{1, 3, 6, 10}
	differences := calculateTemporalDifferences(rawValues, 1)
	expected := []float64{2, 3, 4}

	if !slices.Equal(differences, expected) {
		t.Fatalf("unexpected differences: got %v want %v", differences, expected)
	}
}

func TestNetdataFeaturesSmoothing(t *testing.T) {
	differences := []float64{1, 2, 3, 4, 5}
	smoothed := calculateTemporalSmoothing(differences, 3)
	expected := []float64{2, 3, 4}

	if !slices.Equal(smoothed, expected) {
		t.Fatalf("unexpected smoothing: got %v want %v", smoothed, expected)
	}
}

func TestNetdataFeaturesLagVector(t *testing.T) {
	smoothed := []float64{10, 20, 30, 40, 50, 60, 70}
	features := buildTemporalLagFeatures(smoothed, 5)
	expected := mlFeatureVector{70, 60, 50, 40, 30, 20}

	if len(features) == 0 {
		t.Fatal("no lag features were built")
	}

	if !slices.Equal(features[len(features)-1], expected) {
		t.Fatalf(
			"unexpected lag vector: got %v want %v",
			features[len(features)-1],
			expected,
		)
	}
}

func TestNetdataFeaturePipeline(t *testing.T) {
	rawValues := []float64{1, 3, 6, 10, 15, 21, 28, 36}
	differences := calculateTemporalDifferences(rawValues, 1)
	smoothed := calculateTemporalSmoothing(differences, 3)
	features := buildTemporalLagFeatures(smoothed, 2)

	expected := mlFeatureVector{7, 6, 5}
	if len(features) == 0 {
		t.Fatal("no temporal features were built")
	}

	if !slices.Equal(features[len(features)-1], expected) {
		t.Fatalf(
			"unexpected feature pipeline output: got %v want %v",
			features[len(features)-1],
			expected,
		)
	}
}

func TestNetdataFeaturePipelineResetsOnGap(t *testing.T) {
	config := mlConfig{
		AlgorithmMode:         mlAlgorithmNetdataTemporal,
		NetdataDiffN:          1,
		NetdataSmoothN:        2,
		NetdataLagN:           2,
		NetdataTrainingWindow: 10 * time.Minute,
		NetdataTrainEvery:     5 * time.Minute,
		NetdataMaximumModels:  3,
	}
	state := &mlSeriesState{expectedInterval: int64((5 * time.Minute).Milliseconds())}

	timestamps := []int64{
		time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 0, 5, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 0, 10, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 0, 15, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 0, 20, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 0, 40, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 0, 45, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 0, 50, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 0, 55, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 1, 0, 0, 0, time.UTC).UnixMilli(),
	}

	readyCount := 0
	for index, timestamp := range timestamps {
		appendTemporalRawValue(state, timestamp, float64(index+1), config)
		_, ready := appendTemporalFeature(state, timestamp, float64(index+1), config)
		if ready {
			readyCount++
		}
	}

	if readyCount != 2 {
		t.Fatalf("unexpected ready feature count across gap: got %d want 2", readyCount)
	}
}

func TestTemporalKMeansDeterministic(t *testing.T) {
	points := []temporalFeaturePoint{
		{Timestamp: 1, Vector: mlFeatureVector{0, 0}, SegmentID: 1},
		{Timestamp: 2, Vector: mlFeatureVector{0, 1}, SegmentID: 1},
		{Timestamp: 3, Vector: mlFeatureVector{10, 10}, SegmentID: 1},
		{Timestamp: 4, Vector: mlFeatureVector{10, 11}, SegmentID: 1},
	}
	config := defaultMLConfig
	config.AlgorithmMode = mlAlgorithmNetdataTemporal

	left, leftOK := fitTemporalKMeansModel(points, config)
	right, rightOK := fitTemporalKMeansModel(points, config)
	if !leftOK || !rightOK {
		t.Fatal("temporal K-Means training failed")
	}

	if !approxFloat64(left.distanceCutoff, right.distanceCutoff) {
		t.Fatalf("unexpected cutoff mismatch: got %v want %v", left.distanceCutoff, right.distanceCutoff)
	}

	if !equalTemporalCenters(left.centers, right.centers) {
		t.Fatalf("unexpected centers mismatch: got %v want %v", left.centers, right.centers)
	}
}

func TestTemporalKMeansDistanceCutoff(t *testing.T) {
	values := []float64{1, 2, 3, 4}
	cutoff := percentileLinearInterpolation(values, 0.75)

	if !approxFloat64(cutoff, 3.25) {
		t.Fatalf("unexpected linear percentile cutoff: got %v want 3.25", cutoff)
	}
}

func TestNetdataConsensusRequiresAllModels(t *testing.T) {
	models := []temporalKMeansModel{
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 1},
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 2},
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 10},
	}

	ratio, unanimous := scoreTemporalConsensus(
		models,
		mlFeatureVector{3},
		defaultMLConfig,
	)

	if unanimous {
		t.Fatal("consensus should be normal when one model disagrees")
	}

	if !approxFloat64(ratio, 0.3) {
		t.Fatalf("unexpected consensus ratio: got %v want 0.3", ratio)
	}
}

func TestNetdataConsensusAnomalousWhenAllAgree(t *testing.T) {
	models := []temporalKMeansModel{
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 1},
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 2},
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 3},
	}

	ratio, unanimous := scoreTemporalConsensus(
		models,
		mlFeatureVector{6},
		defaultMLConfig,
	)

	if !unanimous {
		t.Fatal("expected unanimous anomaly")
	}

	if !approxFloat64(ratio, 2) {
		t.Fatalf("unexpected consensus ratio: got %v want 2", ratio)
	}
}

func TestNetdataScoreUsesMinimumRatio(t *testing.T) {
	models := []temporalKMeansModel{
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 2},
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 1.5},
		{centers: []mlFeatureVector{{0}}, distanceCutoff: 1},
	}

	ratio, _ := scoreTemporalConsensus(
		models,
		mlFeatureVector{3},
		defaultMLConfig,
	)

	if !approxFloat64(ratio, 1.5) {
		t.Fatalf("unexpected minimum ratio: got %v want 1.5", ratio)
	}
}

func TestNetdataProviderUsesStandardDuringWarmup(t *testing.T) {
	config := defaultMLConfig
	config.AlgorithmMode = mlAlgorithmNetdataTemporal
	config.NetdataDiffN = 1
	config.NetdataSmoothN = 1
	config.NetdataLagN = 1
	config.NetdataTrainingWindow = 3 * time.Minute
	config.NetdataTrainEvery = 1 * time.Minute
	config.NetdataMaximumModels = 3
	config.NetdataMinimumModelsForConsensus = 3

	provider := newMLProviderWithConfig(nil, nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config)
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)

	for index := 0; index < 5; index++ {
		score := provider.scoreSinglePointForSeries(
			"series",
			start.Add(time.Duration(index)*time.Minute).UnixMilli(),
			float64(index+1),
			2.5,
		)
		if score != 2.5 {
			t.Fatalf("expected fallback score during warmup, got %v", score)
		}
	}
}

func TestNetdataProviderSwitchesAfterWarmup(t *testing.T) {
	config := defaultMLConfig
	config.AlgorithmMode = mlAlgorithmNetdataTemporal
	config.NetdataDiffN = 1
	config.NetdataSmoothN = 1
	config.NetdataLagN = 1
	config.NetdataTrainingWindow = 3 * time.Minute
	config.NetdataTrainEvery = 1 * time.Minute
	config.NetdataMaximumModels = 3
	config.NetdataMinimumModelsForConsensus = 1

	provider := newMLProviderWithConfig(nil, nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config)
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	values := []float64{10, 10, 10, 10, 10, 10, 50}
	score := 0.0

	for index, value := range values {
		score = provider.scoreSinglePointForSeries(
			"series",
			start.Add(time.Duration(index)*time.Minute).UnixMilli(),
			value,
			1.25,
		)
	}

	if score == 1.25 {
		t.Fatal("expected temporal consensus score after warmup")
	}
}

func TestNetdataModelsRotate(t *testing.T) {
	config := defaultMLConfig
	config.AlgorithmMode = mlAlgorithmNetdataTemporal
	config.NetdataDiffN = 1
	config.NetdataSmoothN = 1
	config.NetdataLagN = 1
	config.NetdataTrainingWindow = 3 * time.Minute
	config.NetdataTrainEvery = 1 * time.Minute
	config.NetdataMaximumModels = 2
	config.NetdataMinimumModelsForConsensus = 1

	provider := newMLProviderWithConfig(nil, nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config)
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)

	for index := 0; index < 10; index++ {
		provider.scoreSinglePointForSeries(
			"series",
			start.Add(time.Duration(index)*time.Minute).UnixMilli(),
			float64(index),
			0,
		)
	}

	state := onlyMLSeriesState(t, provider)
	if len(state.temporalModels) != 2 {
		t.Fatalf("unexpected temporal model count: got %d want 2", len(state.temporalModels))
	}
}

func TestLoadNABEC2CPU(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	seriesKey := "realAWSCloudwatch/ec2_cpu_utilization_5f5533.csv"
	points, windows := loadNABTestData(t, nabRoot, seriesKey)

	if len(points) == 0 {
		t.Fatal("NAB series contains no points")
	}

	if len(windows) == 0 {
		t.Fatal("NAB series contains no anomaly windows")
	}

	for index := 1; index < len(points); index++ {
		if !points[index].Timestamp.After(points[index-1].Timestamp) {
			t.Fatalf("timestamps are not strictly increasing at index %d", index)
		}
	}

	pointsInsideWindows := 0
	for _, point := range points {
		if isInsideNABWindow(point.Timestamp, windows) {
			pointsInsideWindows++
		}
	}

	if pointsInsideWindows == 0 {
		t.Fatal("no points fall inside NAB anomaly windows")
	}

	t.Logf(
		"loaded points=%d windows=%d points_inside_windows=%d",
		len(points),
		len(windows),
		pointsInsideWindows,
	)
}

func TestMLProviderRunsKMeansOnNAB(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	seriesKey := "realAWSCloudwatch/ec2_cpu_utilization_5f5533.csv"
	points, windows := loadNABTestData(t, nabRoot, seriesKey)

	if len(points) <= mlCriticalMass {
		t.Fatalf(
			"not enough NAB points: got %d, need more than %d",
			len(points),
			mlCriticalMass,
		)
	}

	var baseResponse *AnomaliesResponse
	baseProvider := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		return baseResponse, nil
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	provider := NewMLProvider(baseProvider, nil, logger)

	request := &AnomaliesRequest{
		Params:      &qbtypes.QueryRangeRequest{},
		Seasonality: SeasonalityDaily,
	}

	var orgID valuer.UUID

	baseResponse = newNABAnomalyResponse(points[:mlCriticalMass], 0.25)
	_, err := provider.GetAnomalies(context.Background(), orgID, request)
	if err != nil {
		t.Fatalf("warm up ML provider on NAB: %v", err)
	}

	remainingPoints := points[mlCriticalMass:]
	baseResponse = newNABAnomalyResponse(remainingPoints, 0)

	response, err := provider.GetAnomalies(context.Background(), orgID, request)
	if err != nil {
		t.Fatalf("run ML provider on NAB: %v", err)
	}

	scoreSeries, err := firstAnomalyScoreSeries(response)
	if err != nil {
		t.Fatalf("read NAB ML scores: %v", err)
	}

	if len(scoreSeries.Values) != len(remainingPoints) {
		t.Fatalf(
			"unexpected score count: got %d, want %d",
			len(scoreSeries.Values),
			len(remainingPoints),
		)
	}

	nonZeroScores := 0
	detectionsInsideWindows := 0
	detectionsOutsideWindows := 0

	for index, scoreValue := range scoreSeries.Values {
		if scoreValue.Value != 0 {
			nonZeroScores++
		}

		isDetection := scoreValue.Value >= 3 || scoreValue.Value <= -3
		if !isDetection {
			continue
		}

		if isInsideNABWindow(remainingPoints[index].Timestamp, windows) {
			detectionsInsideWindows++
		} else {
			detectionsOutsideWindows++
		}
	}

	if nonZeroScores == 0 {
		t.Fatal("K-Means did not produce any non-zero score on NAB")
	}

	t.Logf(
		"dataset_points=%d warmup_points=%d ml_points=%d non_zero_scores=%d detections_inside_windows=%d detections_outside_windows=%d",
		len(points),
		mlCriticalMass,
		len(remainingPoints),
		nonZeroScores,
		detectionsInsideWindows,
		detectionsOutsideWindows,
	)
}

func TestCompareStandardAndKMeansOnNAB(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	const seriesKey = "realAWSCloudwatch/ec2_cpu_utilization_5f5533.csv"

	points, windows := loadNABTestData(t, nabRoot, seriesKey)
	if len(points) < 2 {
		t.Fatalf("NAB series is too short: got %d points", len(points))
	}

	interval := points[1].Timestamp.Sub(points[0].Timestamp)
	if interval <= 0 {
		t.Fatalf("invalid NAB interval: %s", interval)
	}

	for index := 1; index < len(points); index++ {
		if !points[index].Timestamp.After(points[index-1].Timestamp) {
			t.Fatalf("timestamps are not strictly increasing at index %d", index)
		}

		if index >= 2 {
			currentInterval := points[index].Timestamp.Sub(points[index-1].Timestamp)
			if currentInterval != interval {
				t.Fatalf(
					"inconsistent point interval at index %d: got %s, want %s",
					index,
					currentInterval,
					interval,
				)
			}
		}
	}

	if 24*time.Hour%interval != 0 {
		t.Fatalf("point interval %s does not evenly divide 24h", interval)
	}

	pointsPerDay := int(24 * time.Hour / interval)
	if pointsPerDay <= 0 {
		t.Fatalf("invalid points per day: %d", pointsPerDay)
	}

	if len(points) <= 4*pointsPerDay {
		t.Fatalf(
			"not enough NAB points for four previous days of history: got %d, need more than %d",
			len(points),
			4*pointsPerDay,
		)
	}

	evaluatedPoints, standardScores := computeNABStandardScores(
		t,
		points,
		pointsPerDay,
	)
	if len(evaluatedPoints) == 0 {
		t.Fatal("no standard scores were calculated")
	}

	if len(evaluatedPoints) != len(standardScores) {
		t.Fatalf(
			"standard score length mismatch: got %d points and %d scores",
			len(evaluatedPoints),
			len(standardScores),
		)
	}

	var (
		validPoints          []nabPoint
		validStandardScores  []float64
		droppedInvalidScores int
	)

	for index, score := range standardScores {
		if !isFinite(score) {
			droppedInvalidScores++
			continue
		}

		validPoints = append(validPoints, evaluatedPoints[index])
		validStandardScores = append(validStandardScores, score)
	}

	if len(validPoints) == 0 {
		t.Fatal("all standard scores are invalid")
	}

	mlScores := runNABMLScores(t, validPoints, validStandardScores)
	if len(mlScores) != len(validPoints) {
		t.Fatalf(
			"ML score length mismatch: got %d, want %d",
			len(mlScores),
			len(validPoints),
		)
	}

	evaluationWindows := filterNABWindowsForRange(
		windows,
		validPoints[0].Timestamp,
		validPoints[len(validPoints)-1].Timestamp,
	)
	if len(evaluationWindows) == 0 {
		t.Fatal("no anomaly windows overlap the evaluated range")
	}

	thresholds := []float64{
		1.5,
		2.0,
		2.5,
		3.0,
		3.5,
		4.0,
		5.0,
		6.0,
	}

	results := make([]nabAlgorithmMetrics, 0, len(thresholds)*2)

	t.Log("algorithm | threshold | evaluated | detection_points | detected_windows | total_windows | fp_events | fp_per_day | precision | recall | f1 | avg_delay_minutes | max_delay_minutes")

	for _, threshold := range thresholds {
		standardMetrics := evaluateNABAlgorithm(
			"standard",
			threshold,
			validPoints,
			validStandardScores,
			evaluationWindows,
			interval,
		)
		kmeansMetrics := evaluateNABAlgorithm(
			"kmeans",
			threshold,
			validPoints,
			mlScores,
			evaluationWindows,
			interval,
		)

		results = append(results, standardMetrics, kmeansMetrics)

		t.Log(formatNABMetrics(standardMetrics))
		t.Log(formatNABMetrics(kmeansMetrics))
	}

	bestStandard, err := selectBestNABMetrics(results, "standard")
	if err != nil {
		t.Fatalf("select best standard metrics: %v", err)
	}

	bestKMeans, err := selectBestNABMetrics(results, "kmeans")
	if err != nil {
		t.Fatalf("select best kmeans metrics: %v", err)
	}

	t.Logf("best standard: %s", formatNABBestMetrics(bestStandard))
	t.Logf("best kmeans: %s", formatNABBestMetrics(bestKMeans))
	t.Logf(
		"evaluated_range_start=%s evaluated_range_end=%s interval=%s points_per_day=%d dropped_invalid_standard_scores=%d",
		validPoints[0].Timestamp.Format(time.RFC3339),
		validPoints[len(validPoints)-1].Timestamp.Format(time.RFC3339),
		interval,
		pointsPerDay,
		droppedInvalidScores,
	)
}

func TestTuneKMeansParametersOnNAB(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	sweepStartedAt := time.Now()
	const seriesKey = "realAWSCloudwatch/ec2_cpu_utilization_5f5533.csv"
	sweepMode, modelConfigs := resolveNABTuneMode()

	validPoints, standardScores, evaluationWindows, interval := prepareNABComparisonInputs(
		t,
		nabRoot,
		seriesKey,
	)
	thresholds := []float64{
		1.5,
		2.0,
		2.5,
		3.0,
		3.5,
		4.0,
		4.5,
		5.0,
		6.0,
	}

	results := make([]nabTuneResult, 0, len(modelConfigs)*len(thresholds))

	for _, modelConfig := range modelConfigs {
		mlScores := runNABMLScoresWithConfig(
			t,
			validPoints,
			standardScores,
			modelConfig.toMLConfig(),
		)

		if len(mlScores) != len(validPoints) {
			t.Fatalf(
				"ML score length mismatch for config %s: got %d, want %d",
				modelConfig.signature(),
				len(mlScores),
				len(validPoints),
			)
		}

		for _, threshold := range thresholds {
			metrics := evaluateNABAlgorithm(
				"kmeans",
				threshold,
				validPoints,
				mlScores,
				evaluationWindows,
				interval,
			)

			results = append(results, nabTuneResult{
				Model:   modelConfig,
				Metrics: metrics,
			})
		}
	}

	if len(results) == 0 {
		t.Fatal("no sweep results were produced")
	}

	rankedResults := rankNABTuneResults(results)

	productionResult, err := selectBestNABTuneResult(
		filterNABTuneResultsForProduction(rankedResults),
	)
	if err != nil {
		t.Fatalf("select production config result: %v", err)
	}

	t.Logf(
		"sweep_mode=%s model_configs=%d model_threshold_variants=%d sweep_duration=%s",
		sweepMode,
		len(modelConfigs),
		len(results),
		time.Since(sweepStartedAt).Round(time.Millisecond),
	)
	t.Log("rank | critical_mass | windows | k | scale_floor | aggregation | threshold | recall | fp_per_day | fp_events | precision | f1 | avg_delay | max_delay")

	topCount := min(20, len(rankedResults))
	for index := 0; index < topCount; index++ {
		t.Log(formatNABTuneTopLine(index+1, rankedResults[index]))
	}

	t.Log("best acceptable configuration:")
	t.Log(formatNABTuneSummary(rankedResults[0]))

	t.Log("current production configuration:")
	t.Log(formatNABProductionSummary(productionResult))
}

func TestCompareStandardAndKMeansAcrossNABAWS(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	startedAt := time.Now()
	seriesKeys, err := listNABAWSSeriesKeys(nabRoot)
	if err != nil {
		t.Fatal(err)
	}

	evaluations, skipped, err := loadNABAWSSeriesEvaluations(
		nabRoot,
		seriesKeys,
	)
	if err != nil {
		t.Fatal(err)
	}

	if len(evaluations) == 0 {
		t.Fatal("no AWS series were evaluable")
	}

	currentConfig := defaultMLConfig
	candidateConfig := recommendedCandidateMLConfig()
	const (
		standardThreshold  = 6.0
		currentThreshold   = 4.0
		candidateThreshold = 4.0
	)

	t.Logf("aws_series_found=%d", len(seriesKeys))
	for _, seriesKey := range seriesKeys {
		t.Logf("aws_series=%s", seriesKey)
	}

	t.Log("series | points | evaluated | windows | standard_detected | standard_fp | current_detected | current_fp | candidate_detected | candidate_fp | standard_f1 | current_f1 | candidate_f1")

	standardStart := time.Now()
	standardMetrics := make([]nabDetailedMetrics, 0, len(evaluations))
	for _, evaluation := range evaluations {
		standardMetrics = append(standardMetrics, evaluateNABAlgorithmDetailed(
			"standard",
			standardThreshold,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			evaluation.EvaluationWindows,
			evaluation.Interval,
		))
	}
	standardRuntime := time.Since(standardStart)

	currentStart := time.Now()
	currentMetrics := make([]nabDetailedMetrics, 0, len(evaluations))
	for _, evaluation := range evaluations {
		mlScores, err := calculateNABMLScoresWithConfig(
			evaluation.SeriesKey,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			currentConfig,
		)
		if err != nil {
			t.Fatalf("current config %s: %v", evaluation.SeriesKey, err)
		}

		currentMetrics = append(currentMetrics, evaluateNABAlgorithmDetailed(
			"current_kmeans",
			currentThreshold,
			evaluation.EvaluatedPoints,
			mlScores,
			evaluation.EvaluationWindows,
			evaluation.Interval,
		))
	}
	currentRuntime := time.Since(currentStart)

	candidateStart := time.Now()
	candidateMetrics := make([]nabDetailedMetrics, 0, len(evaluations))
	for _, evaluation := range evaluations {
		mlScores, err := calculateNABMLScoresWithConfig(
			evaluation.SeriesKey,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			candidateConfig,
		)
		if err != nil {
			t.Fatalf("candidate config %s: %v", evaluation.SeriesKey, err)
		}

		candidateMetrics = append(candidateMetrics, evaluateNABAlgorithmDetailed(
			"candidate_kmeans",
			candidateThreshold,
			evaluation.EvaluatedPoints,
			mlScores,
			evaluation.EvaluationWindows,
			evaluation.Interval,
		))
	}
	candidateRuntime := time.Since(candidateStart)

	for index, evaluation := range evaluations {
		t.Logf(
			"%s | %d | %d | %d | %d | %d | %d | %d | %d | %d | %.4f | %.4f | %.4f",
			evaluation.SeriesKey,
			evaluation.TotalPoints,
			len(evaluation.EvaluatedPoints),
			len(evaluation.EvaluationWindows),
			standardMetrics[index].Summary.DetectedWindows,
			standardMetrics[index].Summary.FalsePositiveEvents,
			currentMetrics[index].Summary.DetectedWindows,
			currentMetrics[index].Summary.FalsePositiveEvents,
			candidateMetrics[index].Summary.DetectedWindows,
			candidateMetrics[index].Summary.FalsePositiveEvents,
			standardMetrics[index].Summary.F1,
			currentMetrics[index].Summary.F1,
			candidateMetrics[index].Summary.F1,
		)
	}

	for _, skip := range skipped {
		t.Logf("skipped_series=%s reason=%s", skip.SeriesKey, skip.Reason)
	}

	standardAggregate, err := aggregateNABSeriesMetrics(
		"standard",
		len(seriesKeys),
		evaluations,
		skipped,
		standardMetrics,
		standardRuntime,
	)
	if err != nil {
		t.Fatal(err)
	}

	currentAggregate, err := aggregateNABSeriesMetrics(
		"current_kmeans",
		len(seriesKeys),
		evaluations,
		skipped,
		currentMetrics,
		currentRuntime,
	)
	if err != nil {
		t.Fatal(err)
	}

	candidateAggregate, err := aggregateNABSeriesMetrics(
		"candidate_kmeans",
		len(seriesKeys),
		evaluations,
		skipped,
		candidateMetrics,
		candidateRuntime,
	)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf("aggregate standard: %s", formatNABAggregateMetrics(standardAggregate))
	t.Logf("aggregate current_kmeans: %s", formatNABAggregateMetrics(currentAggregate))
	t.Logf("aggregate candidate_kmeans: %s", formatNABAggregateMetrics(candidateAggregate))
	t.Logf("benchmark_runtime=%s", time.Since(startedAt).Round(time.Millisecond))
}

func TestTuneKMeansAcrossNABAWS(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	startedAt := time.Now()
	seriesKeys, err := listNABAWSSeriesKeys(nabRoot)
	if err != nil {
		t.Fatal(err)
	}

	trainKeys, testKeys := splitNABSeriesKeys(seriesKeys)
	if len(trainKeys) == 0 {
		t.Fatal("train split is empty")
	}

	if len(testKeys) == 0 {
		t.Fatal("test split is empty")
	}

	if err := validateNABSeriesSplit(trainKeys, testKeys); err != nil {
		t.Fatal(err)
	}

	allEvaluations, skipped, err := loadNABAWSSeriesEvaluations(
		nabRoot,
		seriesKeys,
	)
	if err != nil {
		t.Fatal(err)
	}

	evaluationByKey := make(map[string]nabSeriesEvaluation, len(allEvaluations))
	for _, evaluation := range allEvaluations {
		evaluationByKey[evaluation.SeriesKey] = evaluation
	}

	trainEvaluations := filterNABSeriesEvaluations(trainKeys, evaluationByKey)
	testEvaluations := filterNABSeriesEvaluations(testKeys, evaluationByKey)
	trainSkipped := filterNABSeriesSkips(trainKeys, skipped)
	testSkipped := filterNABSeriesSkips(testKeys, skipped)

	if len(trainEvaluations) == 0 {
		t.Fatal("no train series were evaluable")
	}

	if len(testEvaluations) == 0 {
		t.Fatal("no test series were evaluable")
	}

	sweepMode, modelConfigs, thresholds := resolveNABAcrossTuneMode()
	results, sweepDuration, err := runNABAcrossTuneSweep(
		t,
		trainEvaluations,
		trainKeys,
		trainSkipped,
		modelConfigs,
		thresholds,
	)
	if err != nil {
		t.Fatal(err)
	}

	if len(results) == 0 {
		t.Fatal("no tuning results were produced")
	}

	rankedResults := rankNABAcrossTuneResults(results)
	bestTrain := rankedResults[0]
	holdoutBest, err := evaluateNABAcrossConfigForThreshold(
		testEvaluations,
		testKeys,
		testSkipped,
		bestTrain.Model,
		bestTrain.Threshold,
	)
	if err != nil {
		t.Fatal(err)
	}

	holdoutStandard, err := aggregateStandardAcrossNABSeries(
		testKeys,
		testEvaluations,
		testSkipped,
		6.0,
	)
	if err != nil {
		t.Fatal(err)
	}

	holdoutCurrent, err := evaluateNABAcrossConfigForThreshold(
		testEvaluations,
		testKeys,
		testSkipped,
		nabTuneModelConfigFromMLConfig(defaultMLConfig),
		4.0,
	)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf(
		"sweep_mode=%s train_series_count=%d test_series_count=%d model_configs=%d model_threshold_variants=%d sweep_duration=%s",
		sweepMode,
		len(trainKeys),
		len(testKeys),
		len(modelConfigs),
		len(modelConfigs)*len(thresholds),
		sweepDuration.Round(time.Millisecond),
	)
	t.Log("train_series:")
	for _, key := range trainKeys {
		t.Log(key)
	}
	t.Log("test_series:")
	for _, key := range testKeys {
		t.Log(key)
	}

	t.Log("rank | critical_mass | windows | k | scale_floor | aggregation | threshold | models | recall | precision | f1 | fp_per_series_day | fp_events | median_delay | p95_delay")
	topCount := min(20, len(rankedResults))
	for index := 0; index < topCount; index++ {
		t.Log(formatNABAcrossTuneTopLine(index+1, rankedResults[index]))
	}

	t.Log("best train configuration:")
	t.Log(formatNABAcrossTuneSummary(bestTrain))

	t.Log("holdout test result:")
	t.Log(formatNABAcrossTuneSummary(holdoutBest))

	t.Log("algorithm | series | windows | detected | missed | fp_events | fp_per_series_day | precision | recall | f1 | median_delay | p95_delay")
	t.Log(formatNABHoldoutComparisonLine("standard", holdoutStandard))
	t.Log(formatNABHoldoutComparisonLine("current_kmeans", holdoutCurrent.Train))
	t.Log(formatNABHoldoutComparisonLine("best_tuned_kmeans", holdoutBest.Train))
	t.Logf("tuning_runtime=%s", time.Since(startedAt).Round(time.Millisecond))
}

func TestCompareNetdataLikeAcrossNABAWS(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	startedAt := time.Now()
	seriesKeys, err := listNABAWSSeriesKeys(nabRoot)
	if err != nil {
		t.Fatal(err)
	}

	regularEvaluations, regularSkipped, err := loadNABAWSSeriesEvaluations(
		nabRoot,
		seriesKeys,
	)
	if err != nil {
		t.Fatal(err)
	}

	temporalEvaluations, temporalSkipped, err := loadNABAWSTemporalEvaluations(
		nabRoot,
		seriesKeys,
	)
	if err != nil {
		t.Fatal(err)
	}

	if len(temporalEvaluations) == 0 {
		t.Fatal("no temporal AWS series were evaluable")
	}

	regularByKey := make(map[string]nabSeriesEvaluation, len(regularEvaluations))
	for _, evaluation := range regularEvaluations {
		regularByKey[evaluation.SeriesKey] = evaluation
	}

	netdataExactConfig := baselineNetdataMLConfig(1)
	netdataConsensus6Config := baselineNetdataMLConfig(6)

	standardDetails := make(map[string]nabDetailedMetrics)
	rawDetails := make(map[string]nabDetailedMetrics)
	netdataExactDetails := make(map[string]nabDetailedMetrics)
	netdataConsensus6Details := make(map[string]nabDetailedMetrics)

	standardStart := time.Now()
	standardMetrics := make([]nabDetailedMetrics, 0, len(regularEvaluations))
	for _, evaluation := range regularEvaluations {
		detailed := evaluateNABAlgorithmDetailed(
			"standard",
			6.0,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			evaluation.EvaluationWindows,
			evaluation.Interval,
		)
		standardMetrics = append(standardMetrics, detailed)
		standardDetails[evaluation.SeriesKey] = detailed
	}
	standardRuntime := time.Since(standardStart)

	rawStart := time.Now()
	rawMetrics := make([]nabDetailedMetrics, 0, len(regularEvaluations))
	for _, evaluation := range regularEvaluations {
		mlScores, err := calculateNABMLScoresWithConfig(
			evaluation.SeriesKey,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			defaultMLConfig,
		)
		if err != nil {
			t.Fatalf("raw K-Means %s: %v", evaluation.SeriesKey, err)
		}

		detailed := evaluateNABAlgorithmDetailed(
			"current_raw_kmeans",
			4.0,
			evaluation.EvaluatedPoints,
			mlScores,
			evaluation.EvaluationWindows,
			evaluation.Interval,
		)
		rawMetrics = append(rawMetrics, detailed)
		rawDetails[evaluation.SeriesKey] = detailed
	}
	rawRuntime := time.Since(rawStart)

	netdataExactStart := time.Now()
	netdataExactMetrics := make([]nabDetailedMetrics, 0, len(temporalEvaluations))
	for _, evaluation := range temporalEvaluations {
		mlScores, err := calculateNABMLScoresWithConfig(
			evaluation.SeriesKey,
			evaluation.Points,
			evaluation.FallbackScores,
			netdataExactConfig,
		)
		if err != nil {
			t.Fatalf("netdata exact %s: %v", evaluation.SeriesKey, err)
		}

		detailed := evaluateNABAlgorithmDetailed(
			"netdata_exact",
			4.0,
			evaluation.Points,
			mlScores,
			evaluation.Windows,
			evaluation.ExpectedInterval,
		)
		netdataExactMetrics = append(netdataExactMetrics, detailed)
		netdataExactDetails[evaluation.SeriesKey] = detailed
	}
	netdataExactRuntime := time.Since(netdataExactStart)

	netdataConsensus6Start := time.Now()
	netdataConsensus6Metrics := make([]nabDetailedMetrics, 0, len(temporalEvaluations))
	for _, evaluation := range temporalEvaluations {
		mlScores, err := calculateNABMLScoresWithConfig(
			evaluation.SeriesKey,
			evaluation.Points,
			evaluation.FallbackScores,
			netdataConsensus6Config,
		)
		if err != nil {
			t.Fatalf("netdata consensus6 %s: %v", evaluation.SeriesKey, err)
		}

		detailed := evaluateNABAlgorithmDetailed(
			"netdata_consensus_6",
			4.0,
			evaluation.Points,
			mlScores,
			evaluation.Windows,
			evaluation.ExpectedInterval,
		)
		netdataConsensus6Metrics = append(netdataConsensus6Metrics, detailed)
		netdataConsensus6Details[evaluation.SeriesKey] = detailed
	}
	netdataConsensus6Runtime := time.Since(netdataConsensus6Start)

	temporalByKey := make(map[string]nabTemporalSeriesEvaluation, len(temporalEvaluations))
	for _, evaluation := range temporalEvaluations {
		temporalByKey[evaluation.SeriesKey] = evaluation
	}

	t.Log("series | points | segments | gaps | windows | standard_detected/fp | raw_kmeans_detected/fp | netdata_exact_detected/fp | netdata_consensus_6_detected/fp")
	newlyEvaluated := 0
	for _, seriesKey := range seriesKeys {
		temporalEvaluation, ok := temporalByKey[seriesKey]
		if !ok {
			continue
		}

		standardCell := "na"
		if detailed, ok := standardDetails[seriesKey]; ok {
			standardCell = fmt.Sprintf(
				"%d/%d",
				detailed.Summary.DetectedWindows,
				detailed.Summary.FalsePositiveEvents,
			)
		}

		rawCell := "na"
		if detailed, ok := rawDetails[seriesKey]; ok {
			rawCell = fmt.Sprintf(
				"%d/%d",
				detailed.Summary.DetectedWindows,
				detailed.Summary.FalsePositiveEvents,
			)
		}

		if _, ok := regularByKey[seriesKey]; !ok {
			newlyEvaluated++
		}

		t.Logf(
			"%s | %d | %d | %d | %d | %s | %s | %d/%d | %d/%d",
			seriesKey,
			len(temporalEvaluation.Points),
			temporalEvaluation.SegmentCount,
			temporalEvaluation.GapCount,
			len(temporalEvaluation.Windows),
			standardCell,
			rawCell,
			netdataExactDetails[seriesKey].Summary.DetectedWindows,
			netdataExactDetails[seriesKey].Summary.FalsePositiveEvents,
			netdataConsensus6Details[seriesKey].Summary.DetectedWindows,
			netdataConsensus6Details[seriesKey].Summary.FalsePositiveEvents,
		)
	}

	standardAggregate, err := aggregateNABSeriesMetrics(
		"standard",
		len(seriesKeys),
		regularEvaluations,
		regularSkipped,
		standardMetrics,
		standardRuntime,
	)
	if err != nil {
		t.Fatal(err)
	}

	rawAggregate, err := aggregateNABSeriesMetrics(
		"current_raw_kmeans",
		len(seriesKeys),
		regularEvaluations,
		regularSkipped,
		rawMetrics,
		rawRuntime,
	)
	if err != nil {
		t.Fatal(err)
	}

	temporalSeriesEvaluations, _ := temporalEvaluationsToSeriesEvaluations(temporalEvaluations)
	netdataExactAggregate, err := aggregateNABSeriesMetrics(
		"netdata_exact",
		len(seriesKeys),
		temporalSeriesEvaluations,
		temporalSkipped,
		netdataExactMetrics,
		netdataExactRuntime,
	)
	if err != nil {
		t.Fatal(err)
	}

	netdataConsensus6Aggregate, err := aggregateNABSeriesMetrics(
		"netdata_consensus_6",
		len(seriesKeys),
		temporalSeriesEvaluations,
		temporalSkipped,
		netdataConsensus6Metrics,
		netdataConsensus6Runtime,
	)
	if err != nil {
		t.Fatal(err)
	}

	for _, skip := range regularSkipped {
		t.Logf("regular_series_skip=%s reason=%s", skip.SeriesKey, skip.Reason)
	}
	for _, skip := range temporalSkipped {
		t.Logf("temporal_series_skip=%s reason=%s", skip.SeriesKey, skip.Reason)
	}

	t.Logf("previously_skipped_now_temporally_evaluated=%d", newlyEvaluated)
	t.Logf("standard: %s", formatNABAggregateMetrics(standardAggregate))
	t.Logf("raw_kmeans: %s", formatNABAggregateMetrics(rawAggregate))
	t.Logf("netdata_exact: %s", formatNABAggregateMetrics(netdataExactAggregate))
	t.Logf("netdata_consensus_6: %s", formatNABAggregateMetrics(netdataConsensus6Aggregate))
	t.Logf("netdata_compare_runtime=%s", time.Since(startedAt).Round(time.Millisecond))
}

func TestTuneNetdataLikeAcrossNABAWS(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	startedAt := time.Now()
	seriesKeys, err := listNABAWSSeriesKeys(nabRoot)
	if err != nil {
		t.Fatal(err)
	}

	trainKeys, testKeys := splitNABSeriesKeys(seriesKeys)
	if len(trainKeys) == 0 || len(testKeys) == 0 {
		t.Fatal("train/test split must not be empty")
	}

	if err := validateNABSeriesSplit(trainKeys, testKeys); err != nil {
		t.Fatal(err)
	}

	temporalEvaluations, temporalSkipped, err := loadNABAWSTemporalEvaluations(
		nabRoot,
		seriesKeys,
	)
	if err != nil {
		t.Fatal(err)
	}

	temporalByKey := make(map[string]nabTemporalSeriesEvaluation, len(temporalEvaluations))
	for _, evaluation := range temporalEvaluations {
		temporalByKey[evaluation.SeriesKey] = evaluation
	}

	trainTemporal := filterNABTemporalEvaluations(trainKeys, temporalByKey)
	testTemporal := filterNABTemporalEvaluations(testKeys, temporalByKey)
	if len(trainTemporal) == 0 || len(testTemporal) == 0 {
		t.Fatal("temporal train/test evaluations must not be empty")
	}

	trainTemporalSeries, _ := temporalEvaluationsToSeriesEvaluations(trainTemporal)
	testTemporalSeries, _ := temporalEvaluationsToSeriesEvaluations(testTemporal)
	trainTemporalSkips := filterNABSeriesSkips(trainKeys, temporalSkipped)
	testTemporalSkips := filterNABSeriesSkips(testKeys, temporalSkipped)

	trainStandard, err := aggregateNetdataStandardForKeys(
		nabRoot,
		trainKeys,
	)
	if err != nil {
		t.Fatal(err)
	}

	testStandard, err := aggregateNetdataStandardForKeys(
		nabRoot,
		testKeys,
	)
	if err != nil {
		t.Fatal(err)
	}

	sweepMode, configs := buildNetdataTuneConfigs(os.Getenv("NAB_TUNE_FULL") == "1")
	results, sweepDuration, err := runNetdataTuneSweep(
		t,
		trainKeys,
		trainTemporalSeries,
		trainTemporalSkips,
		configs,
	)
	if err != nil {
		t.Fatal(err)
	}

	if len(results) == 0 {
		t.Fatal("no netdata tuning results were produced")
	}

	rankedResults := rankNetdataTuneResults(results, trainStandard)
	bestTrain := rankedResults[0]

	bestHoldout, err := evaluateNetdataTuneConfig(
		testKeys,
		testTemporalSeries,
		testTemporalSkips,
		bestTrain.Config,
	)
	if err != nil {
		t.Fatal(err)
	}

	currentHoldout, err := evaluateNetdataHoldoutAgainstConfig(
		testTemporal,
		defaultMLConfig,
		4.0,
		"current_raw_kmeans",
	)
	if err != nil {
		t.Fatal(err)
	}

	netdataExactHoldout, err := evaluateNetdataTuneConfig(
		testKeys,
		testTemporalSeries,
		testTemporalSkips,
		netdataTuneConfigFromMLConfig(baselineNetdataMLConfig(1)),
	)
	if err != nil {
		t.Fatal(err)
	}

	netdataConsensus6Holdout, err := evaluateNetdataTuneConfig(
		testKeys,
		testTemporalSeries,
		testTemporalSkips,
		netdataTuneConfigFromMLConfig(baselineNetdataMLConfig(6)),
	)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf(
		"sweep_mode=%s train_series_count=%d test_series_count=%d model_configs=%d model_threshold_variants=%d sweep_duration=%s",
		sweepMode,
		len(trainKeys),
		len(testKeys),
		len(configs),
		len(configs),
		sweepDuration.Round(time.Millisecond),
	)
	t.Log("rank | diff | smooth | lag | training_window | train_every | maximum_models | minimum_models | quantile | threshold | warmup | recall | precision | f1 | fp_per_series_day | fp_events | median_delay | p95_delay")
	topCount := min(20, len(rankedResults))
	for index := 0; index < topCount; index++ {
		t.Log(formatNetdataTuneTopLine(index+1, rankedResults[index]))
	}

	if !isAcceptableNetdataTuneResult(bestTrain, trainStandard) {
		t.Log("acceptable_train_configuration=false")
	}

	t.Log("best train configuration:")
	t.Log(formatNetdataTuneSummary(bestTrain))
	t.Log("holdout test result:")
	t.Log(formatNetdataTuneSummary(bestHoldout))
	t.Log("algorithm | series | windows | detected | missed | fp_events | fp_per_series_day | precision | recall | f1 | median_delay | p95_delay")
	t.Log(formatNABHoldoutComparisonLine("standard", testStandard))
	t.Log(formatNABHoldoutComparisonLine("current_raw_kmeans", currentHoldout))
	t.Log(formatNABHoldoutComparisonLine("netdata_exact", netdataExactHoldout.Train))
	t.Log(formatNABHoldoutComparisonLine("netdata_consensus_6", netdataConsensus6Holdout.Train))
	t.Log(formatNABHoldoutComparisonLine("best_train_netdata", bestHoldout.Train))
	t.Logf("netdata_tuning_runtime=%s", time.Since(startedAt).Round(time.Millisecond))
}

type nabPoint struct {
	Timestamp time.Time
	Value     float64
}

type nabWindow struct {
	Start time.Time
	End   time.Time
}

func loadNABTestData(
	t *testing.T,
	nabRoot string,
	seriesKey string,
) ([]nabPoint, []nabWindow) {
	t.Helper()

	points, err := loadNABPoints(filepath.Join(
		nabRoot,
		"data",
		filepath.FromSlash(seriesKey),
	))
	if err != nil {
		t.Fatalf("load NAB points: %v", err)
	}

	windows, err := loadNABWindows(
		filepath.Join(nabRoot, "labels", "combined_windows.json"),
		seriesKey,
	)
	if err != nil {
		t.Fatalf("load NAB windows: %v", err)
	}

	return points, windows
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
		return nil, fmt.Errorf("unexpected NAB header: %v", header)
	}

	header[0] = strings.TrimPrefix(strings.TrimSpace(header[0]), "\uFEFF")
	header[1] = strings.TrimSpace(header[1])

	if header[0] != "timestamp" || header[1] != "value" {
		return nil, fmt.Errorf("unexpected NAB header: %v", header)
	}

	points := make([]nabPoint, 0)

	for {
		record, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read NAB record: %w", err)
		}

		if len(record) != 2 {
			return nil, fmt.Errorf("unexpected NAB record: %v", record)
		}

		timestamp, err := parseNABTimestamp(record[0])
		if err != nil {
			return nil, fmt.Errorf("parse NAB timestamp %q: %w", record[0], err)
		}

		value, err := strconv.ParseFloat(strings.TrimSpace(record[1]), 64)
		if err != nil {
			return nil, fmt.Errorf("parse NAB value %q: %w", record[1], err)
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
		return nil, fmt.Errorf("read NAB windows: %w", err)
	}

	var labels map[string][][]string
	if err := json.Unmarshal(content, &labels); err != nil {
		return nil, fmt.Errorf("decode NAB windows: %w", err)
	}

	normalizedKey := filepath.ToSlash(seriesKey)
	rawWindows, ok := labels[normalizedKey]
	if !ok {
		return nil, fmt.Errorf("NAB windows not found for %q", normalizedKey)
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
			return nil, fmt.Errorf("parse NAB window start %q: %w", rawWindow[0], err)
		}

		end, err := parseNABTimestamp(rawWindow[1])
		if err != nil {
			return nil, fmt.Errorf("parse NAB window end %q: %w", rawWindow[1], err)
		}

		if end.Before(start) {
			return nil, fmt.Errorf(
				"invalid NAB window: end %s is before start %s",
				end,
				start,
			)
		}

		windows = append(windows, nabWindow{Start: start, End: end})
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

func loadNABWindowMap(path string) (map[string][]nabWindow, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read NAB windows: %w", err)
	}

	var labels map[string][][]string
	if err := json.Unmarshal(content, &labels); err != nil {
		return nil, fmt.Errorf("decode NAB windows: %w", err)
	}

	windowMap := make(map[string][]nabWindow, len(labels))
	for seriesKey, rawWindows := range labels {
		windows := make([]nabWindow, 0, len(rawWindows))
		for _, rawWindow := range rawWindows {
			if len(rawWindow) != 2 {
				return nil, fmt.Errorf(
					"invalid NAB window for %q: %v",
					seriesKey,
					rawWindow,
				)
			}

			start, err := parseNABTimestamp(rawWindow[0])
			if err != nil {
				return nil, fmt.Errorf("parse NAB window start %q: %w", rawWindow[0], err)
			}

			end, err := parseNABTimestamp(rawWindow[1])
			if err != nil {
				return nil, fmt.Errorf("parse NAB window end %q: %w", rawWindow[1], err)
			}

			if end.Before(start) {
				return nil, fmt.Errorf(
					"invalid NAB window for %q: end %s is before start %s",
					seriesKey,
					end,
					start,
				)
			}

			windows = append(windows, nabWindow{Start: start, End: end})
		}

		windowMap[filepath.ToSlash(seriesKey)] = windows
	}

	return windowMap, nil
}

func listNABAWSSeriesKeys(nabRoot string) ([]string, error) {
	pattern := filepath.Join(
		nabRoot,
		"data",
		"realAWSCloudwatch",
		"*.csv",
	)

	paths, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("glob AWS series: %w", err)
	}

	if len(paths) == 0 {
		return nil, errors.New("no AWS NAB series found")
	}

	slices.Sort(paths)

	dataRoot := filepath.Join(nabRoot, "data")
	seriesKeys := make([]string, 0, len(paths))
	for _, path := range paths {
		relativePath, err := filepath.Rel(dataRoot, path)
		if err != nil {
			return nil, fmt.Errorf("build series key for %q: %w", path, err)
		}

		seriesKeys = append(seriesKeys, filepath.ToSlash(relativePath))
	}

	return seriesKeys, nil
}

func isInsideNABWindow(
	timestamp time.Time,
	windows []nabWindow,
) bool {
	for _, window := range windows {
		if !timestamp.Before(window.Start) && !timestamp.After(window.End) {
			return true
		}
	}

	return false
}

func firstAnomalyScoreSeries(
	response *AnomaliesResponse,
) (*qbtypes.TimeSeries, error) {
	if response == nil {
		return nil, errors.New("anomaly response is nil")
	}

	if len(response.Results) == 0 || response.Results[0] == nil {
		return nil, errors.New("anomaly response contains no result")
	}

	result := response.Results[0]
	if len(result.Aggregations) == 0 || result.Aggregations[0] == nil {
		return nil, errors.New("anomaly result contains no aggregation")
	}

	aggregation := result.Aggregations[0]
	if len(aggregation.AnomalyScores) == 0 || aggregation.AnomalyScores[0] == nil {
		return nil, errors.New("aggregation contains no anomaly score series")
	}

	return aggregation.AnomalyScores[0], nil
}

func onlyMLSeriesState(
	t *testing.T,
	provider *MLProvider,
) *mlSeriesState {
	t.Helper()

	if len(provider.series) != 1 {
		t.Fatalf("unexpected ML state count: got %d, want 1", len(provider.series))
	}

	for _, state := range provider.series {
		return state
	}

	t.Fatal("ML state was not found")
	return nil
}

func newSinglePointAnomalyResponse(
	timestamp int64,
	value float64,
	score float64,
) *AnomaliesResponse {
	return &AnomaliesResponse{
		Results: []*qbtypes.TimeSeriesData{
			{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Series: []*qbtypes.TimeSeries{
							{
								Values: []*qbtypes.TimeSeriesValue{
									{
										Timestamp: timestamp,
										Value:     value,
									},
								},
							},
						},
						AnomalyScores: []*qbtypes.TimeSeries{
							{
								Values: []*qbtypes.TimeSeriesValue{
									{
										Timestamp: timestamp,
										Value:     score,
									},
								},
							},
						},
					},
				},
			},
		},
	}
}

func newNABAnomalyResponse(
	points []nabPoint,
	fallbackScore float64,
) *AnomaliesResponse {
	metricValues := make([]*qbtypes.TimeSeriesValue, 0, len(points))
	scoreValues := make([]*qbtypes.TimeSeriesValue, 0, len(points))

	for _, point := range points {
		timestamp := point.Timestamp.UnixMilli()
		metricValues = append(metricValues, &qbtypes.TimeSeriesValue{
			Timestamp: timestamp,
			Value:     point.Value,
		})
		scoreValues = append(scoreValues, &qbtypes.TimeSeriesValue{
			Timestamp: timestamp,
			Value:     fallbackScore,
		})
	}

	return &AnomaliesResponse{
		Results: []*qbtypes.TimeSeriesData{
			{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Series: []*qbtypes.TimeSeries{
							{Values: metricValues},
						},
						AnomalyScores: []*qbtypes.TimeSeries{
							{Values: scoreValues},
						},
					},
				},
			},
		},
	}
}

type nabAlgorithmMetrics struct {
	Algorithm                 string
	Threshold                 float64
	EvaluatedPoints           int
	DetectionPoints           int
	DetectedWindows           int
	TotalWindows              int
	FalsePositiveEvents       int
	FalsePositiveEventsPerDay float64
	Precision                 float64
	Recall                    float64
	F1                        float64
	AverageDetectionDelayMins float64
	MaximumDetectionDelayMins float64
}

type nabTuneModelConfig struct {
	CriticalMass     int
	TrainingWindows  []int
	ClusterCounts    []int
	ScaleFloorFactor float64
	Aggregation      mlEnsembleAggregation
}

type nabTuneResult struct {
	Model   nabTuneModelConfig
	Metrics nabAlgorithmMetrics
}

type nabSeriesEvaluation struct {
	SeriesKey         string
	TotalPoints       int
	EvaluatedPoints   []nabPoint
	StandardScores    []float64
	EvaluationWindows []nabWindow
	Interval          time.Duration
	SeriesDays        float64
}

type nabSeriesSkip struct {
	SeriesKey string
	Reason    string
}

type nabDetailedMetrics struct {
	Summary      nabAlgorithmMetrics
	DelayMinutes []float64
}

type nabAggregateMetrics struct {
	Algorithm                          string
	SeriesCount                        int
	EvaluatedSeries                    int
	SkippedSeries                      int
	ZeroWindowSeries                   int
	ZeroWindowSeriesWithFalsePositives int
	TotalPoints                        int
	EvaluatedPoints                    int
	TotalSeriesDays                    float64
	TotalWindows                       int
	DetectedWindows                    int
	MissedWindows                      int
	FalsePositiveEvents                int
	FalsePositiveEventsPerSeriesDay    float64
	EventPrecision                     float64
	EventRecall                        float64
	EventF1                            float64
	MacroF1                            float64
	MedianDetectionDelayMinutes        float64
	P95DetectionDelayMinutes           float64
	MaximumDetectionDelayMinutes       float64
	TotalDetectionPoints               int
	Runtime                            time.Duration
}

type nabAcrossTuneResult struct {
	Model      nabTuneModelConfig
	Threshold  float64
	ModelCount int
	Train      nabAggregateMetrics
}

type nabTemporalSeriesEvaluation struct {
	SeriesKey        string
	Points           []nabPoint
	FallbackScores   []float64
	Windows          []nabWindow
	ExpectedInterval time.Duration
	GapCount         int
	SegmentCount     int
	SeriesDays       float64
}

type netdataTuneConfig struct {
	DiffN                     int
	SmoothN                   int
	LagN                      int
	TrainingWindow            time.Duration
	TrainEvery                time.Duration
	MaximumModels             int
	MinimumModelsForConsensus int
	DistanceQuantile          float64
}

type netdataTuneResult struct {
	Config    netdataTuneConfig
	Threshold float64
	Train     nabAggregateMetrics
}

func computeNABStandardScores(
	t *testing.T,
	points []nabPoint,
	pointsPerDay int,
) ([]nabPoint, []float64) {
	t.Helper()

	evaluatedPoints, standardScores, err := calculateNABStandardScores(
		points,
		pointsPerDay,
	)
	if err != nil {
		t.Fatalf("calculate standard scores: %v", err)
	}

	return evaluatedPoints, standardScores
}

func calculateNABStandardScores(
	points []nabPoint,
	pointsPerDay int,
) ([]nabPoint, []float64, error) {
	if pointsPerDay <= 0 {
		return nil, nil, fmt.Errorf("pointsPerDay must be positive: got %d", pointsPerDay)
	}

	indexByTimestamp := make(map[int64]int, len(points))
	for index, point := range points {
		indexByTimestamp[point.Timestamp.UnixMilli()] = index
	}

	baseProvider := &BaseSeasonalProvider{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	evaluatedPoints := make([]nabPoint, 0, len(points)-4*pointsPerDay)
	standardScores := make([]float64, 0, len(points)-4*pointsPerDay)

	for currentStart := 4 * pointsPerDay; currentStart < len(points); currentStart += pointsPerDay {
		currentEnd := min(currentStart+pointsPerDay, len(points))
		currentPoints := points[currentStart:currentEnd]
		if len(currentPoints) == 0 {
			continue
		}

		currentStartTime := currentPoints[0].Timestamp
		currentEndTime := currentPoints[len(currentPoints)-1].Timestamp

		prevSeries, err := buildNABSeriesByOffsetNoTest(
			points,
			indexByTimestamp,
			currentStartTime,
			currentEndTime,
			-24*time.Hour,
		)
		if err != nil {
			return nil, nil, err
		}

		currentSeasonSeries, err := buildNABSeriesByOffsetNoTest(
			points,
			indexByTimestamp,
			currentStartTime,
			currentEndTime,
			-24*time.Hour,
		)
		if err != nil {
			return nil, nil, err
		}

		pastSeasonSeries, err := buildNABSeriesByOffsetNoTest(
			points,
			indexByTimestamp,
			currentStartTime,
			currentEndTime,
			-48*time.Hour,
		)
		if err != nil {
			return nil, nil, err
		}

		past2SeasonSeries, err := buildNABSeriesByOffsetNoTest(
			points,
			indexByTimestamp,
			currentStartTime,
			currentEndTime,
			-72*time.Hour,
		)
		if err != nil {
			return nil, nil, err
		}

		past3SeasonSeries, err := buildNABSeriesByOffsetNoTest(
			points,
			indexByTimestamp,
			currentStartTime,
			currentEndTime,
			-96*time.Hour,
		)
		if err != nil {
			return nil, nil, err
		}

		currentSeries := newNABTimeSeries(currentPoints)
		scoreSeries := baseProvider.getAnomalyScores(
			currentSeries,
			prevSeries,
			currentSeasonSeries,
			pastSeasonSeries,
			past2SeasonSeries,
			past3SeasonSeries,
		)

		if scoreSeries == nil {
			return nil, nil, fmt.Errorf("standard score series is nil for block starting at %s", currentStartTime)
		}

		if len(scoreSeries.Values) != len(currentPoints) {
			return nil, nil, fmt.Errorf(
				"unexpected standard score count for block starting at %s: got %d, want %d",
				currentStartTime,
				len(scoreSeries.Values),
				len(currentPoints),
			)
		}

		evaluatedPoints = append(evaluatedPoints, currentPoints...)

		for valueIndex, scoreValue := range scoreSeries.Values {
			if scoreValue == nil {
				return nil, nil, fmt.Errorf(
					"standard score point is nil for block starting at %s index %d",
					currentStartTime,
					valueIndex,
				)
			}

			if scoreValue.Timestamp != currentPoints[valueIndex].Timestamp.UnixMilli() {
				return nil, nil, fmt.Errorf(
					"standard score timestamp mismatch for block starting at %s index %d: got %d, want %d",
					currentStartTime,
					valueIndex,
					scoreValue.Timestamp,
					currentPoints[valueIndex].Timestamp.UnixMilli(),
				)
			}

			standardScores = append(standardScores, scoreValue.Value)
		}
	}

	return evaluatedPoints, standardScores, nil
}

func buildNABSeriesByOffsetNoTest(
	points []nabPoint,
	indexByTimestamp map[int64]int,
	startTime time.Time,
	endTime time.Time,
	offset time.Duration,
) (*qbtypes.TimeSeries, error) {
	startIndex, ok := indexByTimestamp[startTime.Add(offset).UnixMilli()]
	if !ok {
		return nil, fmt.Errorf(
			"offset start timestamp %s not found for current start %s",
			startTime.Add(offset).Format(time.RFC3339),
			startTime.Format(time.RFC3339),
		)
	}

	endIndex, ok := indexByTimestamp[endTime.Add(offset).UnixMilli()]
	if !ok {
		return nil, fmt.Errorf(
			"offset end timestamp %s not found for current end %s",
			endTime.Add(offset).Format(time.RFC3339),
			endTime.Format(time.RFC3339),
		)
	}

	if endIndex < startIndex {
		return nil, fmt.Errorf(
			"invalid offset slice for range %s..%s with offset %s",
			startTime.Format(time.RFC3339),
			endTime.Format(time.RFC3339),
			offset,
		)
	}

	return newNABTimeSeries(points[startIndex : endIndex+1]), nil
}

func buildNABSeriesByOffset(
	t *testing.T,
	points []nabPoint,
	indexByTimestamp map[int64]int,
	startTime time.Time,
	endTime time.Time,
	offset time.Duration,
) *qbtypes.TimeSeries {
	t.Helper()

	series, err := buildNABSeriesByOffsetNoTest(
		points,
		indexByTimestamp,
		startTime,
		endTime,
		offset,
	)
	if err != nil {
		t.Fatal(err)
	}

	return series
}

func newNABTimeSeries(points []nabPoint) *qbtypes.TimeSeries {
	values := make([]*qbtypes.TimeSeriesValue, 0, len(points))

	for _, point := range points {
		values = append(values, &qbtypes.TimeSeriesValue{
			Timestamp: point.Timestamp.UnixMilli(),
			Value:     point.Value,
		})
	}

	return &qbtypes.TimeSeries{Values: values}
}

func prepareNABComparisonInputs(
	t *testing.T,
	nabRoot string,
	seriesKey string,
) ([]nabPoint, []float64, []nabWindow, time.Duration) {
	t.Helper()

	points, windows := loadNABTestData(t, nabRoot, seriesKey)
	if len(points) < 2 {
		t.Fatalf("NAB series is too short: got %d points", len(points))
	}

	interval := points[1].Timestamp.Sub(points[0].Timestamp)
	if interval <= 0 {
		t.Fatalf("invalid NAB interval: %s", interval)
	}

	for index := 1; index < len(points); index++ {
		if !points[index].Timestamp.After(points[index-1].Timestamp) {
			t.Fatalf("timestamps are not strictly increasing at index %d", index)
		}

		if index >= 2 {
			currentInterval := points[index].Timestamp.Sub(points[index-1].Timestamp)
			if currentInterval != interval {
				t.Fatalf(
					"inconsistent point interval at index %d: got %s, want %s",
					index,
					currentInterval,
					interval,
				)
			}
		}
	}

	if 24*time.Hour%interval != 0 {
		t.Fatalf("point interval %s does not evenly divide 24h", interval)
	}

	pointsPerDay := int(24 * time.Hour / interval)
	if pointsPerDay <= 0 {
		t.Fatalf("invalid points per day: %d", pointsPerDay)
	}

	if len(points) <= 4*pointsPerDay {
		t.Fatalf(
			"not enough NAB points for four previous days of history: got %d, need more than %d",
			len(points),
			4*pointsPerDay,
		)
	}

	evaluatedPoints, standardScores := computeNABStandardScores(
		t,
		points,
		pointsPerDay,
	)
	if len(evaluatedPoints) == 0 {
		t.Fatal("no standard scores were calculated")
	}

	if len(evaluatedPoints) != len(standardScores) {
		t.Fatalf(
			"standard score length mismatch: got %d points and %d scores",
			len(evaluatedPoints),
			len(standardScores),
		)
	}

	validPoints := make([]nabPoint, 0, len(evaluatedPoints))
	validStandardScores := make([]float64, 0, len(standardScores))

	for index, score := range standardScores {
		if !isFinite(score) {
			continue
		}

		validPoints = append(validPoints, evaluatedPoints[index])
		validStandardScores = append(validStandardScores, score)
	}

	if len(validPoints) == 0 {
		t.Fatal("all standard scores are invalid")
	}

	evaluationWindows := filterNABWindowsForRange(
		windows,
		validPoints[0].Timestamp,
		validPoints[len(validPoints)-1].Timestamp,
	)
	if len(evaluationWindows) == 0 {
		t.Fatal("no anomaly windows overlap the evaluated range")
	}

	return validPoints, validStandardScores, evaluationWindows, interval
}

func loadNABAWSSeriesEvaluations(
	nabRoot string,
	seriesKeys []string,
) ([]nabSeriesEvaluation, []nabSeriesSkip, error) {
	windowMap, err := loadNABWindowMap(
		filepath.Join(nabRoot, "labels", "combined_windows.json"),
	)
	if err != nil {
		return nil, nil, err
	}

	evaluations := make([]nabSeriesEvaluation, 0, len(seriesKeys))
	skipped := make([]nabSeriesSkip, 0)

	for _, seriesKey := range seriesKeys {
		points, err := loadNABPoints(filepath.Join(
			nabRoot,
			"data",
			filepath.FromSlash(seriesKey),
		))
		if err != nil {
			return nil, nil, fmt.Errorf("load %s: %w", seriesKey, err)
		}

		evaluation, skipReason, err := prepareNABSeriesEvaluation(
			seriesKey,
			points,
			windowMap[seriesKey],
		)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare %s: %w", seriesKey, err)
		}

		if skipReason != "" {
			skipped = append(skipped, nabSeriesSkip{
				SeriesKey: seriesKey,
				Reason:    skipReason,
			})
			continue
		}

		evaluations = append(evaluations, evaluation)
	}

	return evaluations, skipped, nil
}

func prepareNABSeriesEvaluation(
	seriesKey string,
	points []nabPoint,
	windows []nabWindow,
) (nabSeriesEvaluation, string, error) {
	evaluation := nabSeriesEvaluation{
		SeriesKey:   seriesKey,
		TotalPoints: len(points),
	}

	if len(points) < 2 {
		return evaluation, "not enough points", nil
	}

	interval := points[1].Timestamp.Sub(points[0].Timestamp)
	if interval <= 0 {
		return evaluation, "invalid first interval", nil
	}

	for index := 1; index < len(points); index++ {
		if !points[index].Timestamp.After(points[index-1].Timestamp) {
			return evaluation, fmt.Sprintf("timestamps are not strictly increasing at index %d", index), nil
		}

		if index >= 2 {
			currentInterval := points[index].Timestamp.Sub(points[index-1].Timestamp)
			if currentInterval != interval {
				return evaluation, fmt.Sprintf("irregular interval at index %d: got %s want %s", index, currentInterval, interval), nil
			}
		}
	}

	if 24*time.Hour%interval != 0 {
		return evaluation, fmt.Sprintf("interval %s does not divide 24h", interval), nil
	}

	pointsPerDay := int(24 * time.Hour / interval)
	if len(points) <= 4*pointsPerDay {
		return evaluation, fmt.Sprintf("insufficient history: %d points need more than %d", len(points), 4*pointsPerDay), nil
	}

	evaluatedPoints, standardScores, err := calculateNABStandardScores(
		points,
		pointsPerDay,
	)
	if err != nil {
		return evaluation, "", err
	}

	if len(evaluatedPoints) != len(standardScores) {
		return evaluation, "", fmt.Errorf(
			"standard score length mismatch: got %d points and %d scores",
			len(evaluatedPoints),
			len(standardScores),
		)
	}

	validPoints := make([]nabPoint, 0, len(evaluatedPoints))
	validStandardScores := make([]float64, 0, len(standardScores))
	for index, score := range standardScores {
		if !isFinite(score) {
			continue
		}

		validPoints = append(validPoints, evaluatedPoints[index])
		validStandardScores = append(validStandardScores, score)
	}

	if len(validPoints) == 0 {
		return evaluation, "", errors.New("all standard scores are invalid")
	}

	evaluation.SeriesKey = seriesKey
	evaluation.EvaluatedPoints = validPoints
	evaluation.StandardScores = validStandardScores
	evaluation.EvaluationWindows = filterNABWindowsForRange(
		windows,
		validPoints[0].Timestamp,
		validPoints[len(validPoints)-1].Timestamp,
	)
	evaluation.Interval = interval
	evaluation.SeriesDays = validPoints[len(validPoints)-1].Timestamp.Sub(
		validPoints[0].Timestamp,
	).Hours() / 24
	if evaluation.SeriesDays <= 0 {
		evaluation.SeriesDays =
			float64(len(validPoints)) * interval.Hours() / 24
	}

	return evaluation, "", nil
}

func runNABMLScores(
	t *testing.T,
	points []nabPoint,
	fallbackScores []float64,
) []float64 {
	return runNABMLScoresWithConfig(
		t,
		points,
		fallbackScores,
		defaultMLConfig,
	)
}

func runNABMLScoresWithConfig(
	t *testing.T,
	points []nabPoint,
	fallbackScores []float64,
	config mlConfig,
) []float64 {
	t.Helper()

	mlScores, err := calculateNABMLScoresWithConfig(
		"nab_tuning_series",
		points,
		fallbackScores,
		config,
	)
	if err != nil {
		t.Fatal(err)
	}

	return mlScores
}

func calculateNABMLScoresWithConfig(
	seriesKey string,
	points []nabPoint,
	fallbackScores []float64,
	config mlConfig,
) ([]float64, error) {
	if len(points) != len(fallbackScores) {
		return nil, fmt.Errorf(
			"point and fallback score length mismatch: got %d points and %d scores",
			len(points),
			len(fallbackScores),
		)
	}

	provider := newMLProviderWithConfig(
		nil,
		nil,
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		config,
	)

	mlScores := make([]float64, 0, len(points))
	for index, point := range points {
		fallbackScore := fallbackScores[index]
		if !isFinite(fallbackScore) {
			return nil, fmt.Errorf("invalid fallback score at index %d: %v", index, fallbackScore)
		}

		score := provider.scoreSinglePointForSeries(
			seriesKey,
			point.Timestamp.UnixMilli(),
			point.Value,
			fallbackScore,
		)

		if !isFinite(score) {
			return nil, fmt.Errorf("ML provider returned invalid score at index %d: %v", index, score)
		}

		mlScores = append(mlScores, score)
	}

	return mlScores, nil
}

func filterNABWindowsForRange(
	windows []nabWindow,
	start time.Time,
	end time.Time,
) []nabWindow {
	filtered := make([]nabWindow, 0, len(windows))

	for _, window := range windows {
		if window.End.Before(start) || window.Start.After(end) {
			continue
		}

		filtered = append(filtered, window)
	}

	return filtered
}

func evaluateNABAlgorithm(
	algorithm string,
	threshold float64,
	points []nabPoint,
	scores []float64,
	windows []nabWindow,
	interval time.Duration,
) nabAlgorithmMetrics {
	return evaluateNABAlgorithmDetailed(
		algorithm,
		threshold,
		points,
		scores,
		windows,
		interval,
	).Summary
}

func evaluateNABAlgorithmDetailed(
	algorithm string,
	threshold float64,
	points []nabPoint,
	scores []float64,
	windows []nabWindow,
	interval time.Duration,
) nabDetailedMetrics {
	detectionIndexes := make([]int, 0)
	detectionPoints := 0

	for index, score := range scores {
		if math.Abs(score) < threshold {
			continue
		}

		detectionIndexes = append(detectionIndexes, index)
		detectionPoints++
	}

	detectedWindows := 0
	delayMinutes := make([]float64, 0, len(windows))

	for _, window := range windows {
		firstDetection := -1

		for _, detectionIndex := range detectionIndexes {
			timestamp := points[detectionIndex].Timestamp
			if timestamp.Before(window.Start) || timestamp.After(window.End) {
				continue
			}

			firstDetection = detectionIndex
			break
		}

		if firstDetection == -1 {
			continue
		}

		detectedWindows++
		delayMinutes = append(
			delayMinutes,
			points[firstDetection].Timestamp.Sub(window.Start).Minutes(),
		)
	}

	falsePositiveEvents := countNABFalsePositiveEvents(
		points,
		detectionIndexes,
		windows,
		interval,
	)

	evaluationDurationDays := points[len(points)-1].Timestamp.Sub(points[0].Timestamp).Hours() / 24
	if evaluationDurationDays <= 0 {
		evaluationDurationDays = float64(len(points)) * interval.Hours() / 24
	}

	precision := 0.0
	if detectedWindows+falsePositiveEvents > 0 {
		precision = float64(detectedWindows) / float64(detectedWindows+falsePositiveEvents)
	}

	recall := 0.0
	if len(windows) > 0 {
		recall = float64(detectedWindows) / float64(len(windows))
	}

	f1 := 0.0
	if precision+recall > 0 {
		f1 = 2 * precision * recall / (precision + recall)
	}

	avgDelay := 0.0
	maxDelay := 0.0
	if len(delayMinutes) > 0 {
		for _, delay := range delayMinutes {
			avgDelay += delay
			if delay > maxDelay {
				maxDelay = delay
			}
		}

		avgDelay /= float64(len(delayMinutes))
	}

	return nabDetailedMetrics{
		Summary: nabAlgorithmMetrics{
			Algorithm:                 algorithm,
			Threshold:                 threshold,
			EvaluatedPoints:           len(points),
			DetectionPoints:           detectionPoints,
			DetectedWindows:           detectedWindows,
			TotalWindows:              len(windows),
			FalsePositiveEvents:       falsePositiveEvents,
			FalsePositiveEventsPerDay: float64(falsePositiveEvents) / evaluationDurationDays,
			Precision:                 precision,
			Recall:                    recall,
			F1:                        f1,
			AverageDetectionDelayMins: avgDelay,
			MaximumDetectionDelayMins: maxDelay,
		},
		DelayMinutes: delayMinutes,
	}
}

func countNABFalsePositiveEvents(
	points []nabPoint,
	detectionIndexes []int,
	windows []nabWindow,
	interval time.Duration,
) int {
	events := 0
	inEvent := false
	var previousTimestamp time.Time

	for _, detectionIndex := range detectionIndexes {
		timestamp := points[detectionIndex].Timestamp
		if isInsideNABWindow(timestamp, windows) {
			inEvent = false
			continue
		}

		if !inEvent || timestamp.Sub(previousTimestamp) > interval {
			events++
			inEvent = true
		}

		previousTimestamp = timestamp
	}

	return events
}

func aggregateNABSeriesMetrics(
	algorithm string,
	seriesCount int,
	evaluations []nabSeriesEvaluation,
	skipped []nabSeriesSkip,
	detailedMetrics []nabDetailedMetrics,
	runtime time.Duration,
) (nabAggregateMetrics, error) {
	if len(evaluations) != len(detailedMetrics) {
		return nabAggregateMetrics{}, fmt.Errorf(
			"evaluation and metrics length mismatch: got %d evaluations and %d metrics",
			len(evaluations),
			len(detailedMetrics),
		)
	}

	aggregate := nabAggregateMetrics{
		Algorithm:       algorithm,
		SeriesCount:     seriesCount,
		EvaluatedSeries: len(evaluations),
		SkippedSeries:   len(skipped),
		Runtime:         runtime,
	}

	delayMinutes := make([]float64, 0)
	macroF1Sum := 0.0
	macroF1Count := 0

	for index, evaluation := range evaluations {
		metrics := detailedMetrics[index]

		aggregate.TotalPoints += evaluation.TotalPoints
		aggregate.EvaluatedPoints += len(evaluation.EvaluatedPoints)
		aggregate.TotalSeriesDays += evaluation.SeriesDays
		aggregate.TotalWindows += metrics.Summary.TotalWindows
		aggregate.DetectedWindows += metrics.Summary.DetectedWindows
		aggregate.FalsePositiveEvents += metrics.Summary.FalsePositiveEvents
		aggregate.TotalDetectionPoints += metrics.Summary.DetectionPoints

		if metrics.Summary.TotalWindows == 0 {
			aggregate.ZeroWindowSeries++
			if metrics.Summary.FalsePositiveEvents > 0 {
				aggregate.ZeroWindowSeriesWithFalsePositives++
			}
		} else {
			macroF1Sum += metrics.Summary.F1
			macroF1Count++
		}

		delayMinutes = append(delayMinutes, metrics.DelayMinutes...)
	}

	aggregate.MissedWindows =
		aggregate.TotalWindows -
			aggregate.DetectedWindows

	if aggregate.TotalSeriesDays > 0 {
		aggregate.FalsePositiveEventsPerSeriesDay =
			float64(aggregate.FalsePositiveEvents) /
				aggregate.TotalSeriesDays
	}

	if aggregate.DetectedWindows+aggregate.FalsePositiveEvents > 0 {
		aggregate.EventPrecision =
			float64(aggregate.DetectedWindows) /
				float64(
					aggregate.DetectedWindows+
						aggregate.FalsePositiveEvents,
				)
	}

	if aggregate.TotalWindows > 0 {
		aggregate.EventRecall =
			float64(aggregate.DetectedWindows) /
				float64(aggregate.TotalWindows)
	}

	if aggregate.EventPrecision+
		aggregate.EventRecall > 0 {
		aggregate.EventF1 = 2 *
			aggregate.EventPrecision *
			aggregate.EventRecall /
			(aggregate.EventPrecision +
				aggregate.EventRecall)
	}

	if macroF1Count > 0 {
		aggregate.MacroF1 =
			macroF1Sum /
				float64(macroF1Count)
	}

	if len(delayMinutes) > 0 {
		aggregate.MedianDetectionDelayMinutes =
			percentileNearestRank(
				delayMinutes,
				0.50,
			)
		aggregate.P95DetectionDelayMinutes =
			percentileNearestRank(
				delayMinutes,
				0.95,
			)
		aggregate.MaximumDetectionDelayMinutes =
			maxInFloatSlice(delayMinutes)
	}

	return aggregate, nil
}

func maxInFloatSlice(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}

	maximum := values[0]
	for _, value := range values[1:] {
		if value > maximum {
			maximum = value
		}
	}

	return maximum
}

func formatNABMetrics(metrics nabAlgorithmMetrics) string {
	return fmt.Sprintf(
		"%s | %.2f | %d | %d | %d | %d | %d | %.4f | %.4f | %.4f | %.4f | %.2f | %.2f",
		metrics.Algorithm,
		metrics.Threshold,
		metrics.EvaluatedPoints,
		metrics.DetectionPoints,
		metrics.DetectedWindows,
		metrics.TotalWindows,
		metrics.FalsePositiveEvents,
		metrics.FalsePositiveEventsPerDay,
		metrics.Precision,
		metrics.Recall,
		metrics.F1,
		metrics.AverageDetectionDelayMins,
		metrics.MaximumDetectionDelayMins,
	)
}

func formatNABBestMetrics(metrics nabAlgorithmMetrics) string {
	return fmt.Sprintf(
		"threshold=%.2f f1=%.4f recall=%.4f fp_events=%d precision=%.4f detected_windows=%d/%d avg_delay_minutes=%.2f max_delay_minutes=%.2f",
		metrics.Threshold,
		metrics.F1,
		metrics.Recall,
		metrics.FalsePositiveEvents,
		metrics.Precision,
		metrics.DetectedWindows,
		metrics.TotalWindows,
		metrics.AverageDetectionDelayMins,
		metrics.MaximumDetectionDelayMins,
	)
}

func selectBestNABMetrics(
	results []nabAlgorithmMetrics,
	algorithm string,
) (nabAlgorithmMetrics, error) {
	filtered := make([]nabAlgorithmMetrics, 0)

	for _, result := range results {
		if result.Algorithm == algorithm {
			filtered = append(filtered, result)
		}
	}

	if len(filtered) == 0 {
		return nabAlgorithmMetrics{}, fmt.Errorf("no metrics found for algorithm %q", algorithm)
	}

	slices.SortFunc(filtered, func(left, right nabAlgorithmMetrics) int {
		switch {
		case left.F1 > right.F1:
			return -1
		case left.F1 < right.F1:
			return 1
		case left.Recall > right.Recall:
			return -1
		case left.Recall < right.Recall:
			return 1
		case left.FalsePositiveEvents < right.FalsePositiveEvents:
			return -1
		case left.FalsePositiveEvents > right.FalsePositiveEvents:
			return 1
		case left.Threshold > right.Threshold:
			return -1
		case left.Threshold < right.Threshold:
			return 1
		default:
			return 0
		}
	})

	return filtered[0], nil
}

func resolveNABTuneMode() (string, []nabTuneModelConfig) {
	if os.Getenv("NAB_TUNE_FULL") == "1" {
		return "full", buildNABTuneModelConfigs()
	}

	return "smoke", buildNABTuneSmokeModelConfigs()
}

func buildNABTuneModelConfigs() []nabTuneModelConfig {
	criticalMasses := []int{
		64,
		128,
		256,
		512,
	}

	windowSets := [][]int{
		{64, 128, 256},
		{128, 256, 512},
		{256, 512, 1024},
	}

	clusterSets := [][]int{
		{2},
		{2, 3},
		{2, 3, 4},
		{3, 4, 5},
	}

	scaleFloorFactors := []float64{
		0.05,
		0.10,
		0.20,
		0.30,
	}

	aggregations := []mlEnsembleAggregation{
		mlAggregationMedian,
		mlAggregationP75,
		mlAggregationTop2Mean,
	}

	configs := make([]nabTuneModelConfig, 0)
	for _, criticalMass := range criticalMasses {
		for _, windows := range windowSets {
			for _, clusterCounts := range clusterSets {
				for _, scaleFloorFactor := range scaleFloorFactors {
					for _, aggregation := range aggregations {
						configs = append(configs, nabTuneModelConfig{
							CriticalMass:     criticalMass,
							TrainingWindows:  slices.Clone(windows),
							ClusterCounts:    slices.Clone(clusterCounts),
							ScaleFloorFactor: scaleFloorFactor,
							Aggregation:      aggregation,
						})
					}
				}
			}
		}
	}

	return configs
}

func buildNABTuneSmokeModelConfigs() []nabTuneModelConfig {
	criticalMasses := []int{
		128,
		256,
	}

	windowSets := [][]int{
		{128, 256, 512},
		{256, 512, 1024},
	}

	clusterSets := [][]int{
		{2, 3},
		{2, 3, 4},
	}

	scaleFloorFactors := []float64{
		0.05,
		0.10,
		0.20,
	}

	aggregations := []mlEnsembleAggregation{
		mlAggregationMedian,
		mlAggregationP75,
		mlAggregationTop2Mean,
	}

	configs := make([]nabTuneModelConfig, 0)
	for _, criticalMass := range criticalMasses {
		for _, windows := range windowSets {
			for _, clusterCounts := range clusterSets {
				for _, scaleFloorFactor := range scaleFloorFactors {
					for _, aggregation := range aggregations {
						configs = append(configs, nabTuneModelConfig{
							CriticalMass:     criticalMass,
							TrainingWindows:  slices.Clone(windows),
							ClusterCounts:    slices.Clone(clusterCounts),
							ScaleFloorFactor: scaleFloorFactor,
							Aggregation:      aggregation,
						})
					}
				}
			}
		}
	}

	return configs
}

func (config nabTuneModelConfig) toMLConfig() mlConfig {
	return mlConfig{
		CriticalMass:       config.CriticalMass,
		MaximumSamples:     defaultMLConfig.MaximumSamples,
		KMeansIterations:   defaultMLConfig.KMeansIterations,
		LearningScoreLimit: defaultMLConfig.LearningScoreLimit,
		MaximumScore:       defaultMLConfig.MaximumScore,
		MinimumScale:       defaultMLConfig.MinimumScale,
		TrainingWindows:    slices.Clone(config.TrainingWindows),
		ClusterCounts:      slices.Clone(config.ClusterCounts),
		ScaleFloorFactor:   config.ScaleFloorFactor,
		Aggregation:        config.Aggregation,
	}
}

func (config nabTuneModelConfig) signature() string {
	return fmt.Sprintf(
		"critical_mass=%d windows=%s cluster_counts=%s scale_floor=%.2f aggregation=%s",
		config.CriticalMass,
		formatNABIntList(config.TrainingWindows),
		formatNABIntList(config.ClusterCounts),
		config.ScaleFloorFactor,
		config.Aggregation,
	)
}

func (config nabTuneModelConfig) matchesDefaultConfig() bool {
	return config.CriticalMass == defaultMLConfig.CriticalMass &&
		slices.Equal(config.TrainingWindows, defaultMLConfig.TrainingWindows) &&
		slices.Equal(config.ClusterCounts, defaultMLConfig.ClusterCounts) &&
		config.ScaleFloorFactor == defaultMLConfig.ScaleFloorFactor &&
		config.Aggregation == defaultMLConfig.Aggregation
}

func rankNABTuneResults(
	results []nabTuneResult,
) []nabTuneResult {
	ranked := slices.Clone(results)
	hasAcceptable := false

	for _, result := range ranked {
		if isAcceptableNABTuneResult(result) {
			hasAcceptable = true
			break
		}
	}

	slices.SortFunc(ranked, func(left, right nabTuneResult) int {
		if hasAcceptable {
			return compareAcceptableNABTuneResults(left, right)
		}

		return compareFallbackNABTuneResults(left, right)
	})

	return ranked
}

func selectBestNABTuneResult(
	results []nabTuneResult,
) (nabTuneResult, error) {
	if len(results) == 0 {
		return nabTuneResult{}, errors.New("no tuning results to select from")
	}

	return rankNABTuneResults(results)[0], nil
}

func filterNABTuneResultsForProduction(
	results []nabTuneResult,
) []nabTuneResult {
	filtered := make([]nabTuneResult, 0)

	for _, result := range results {
		if result.Model.matchesDefaultConfig() {
			filtered = append(filtered, result)
		}
	}

	return filtered
}

func isAcceptableNABTuneResult(
	result nabTuneResult,
) bool {
	return result.Metrics.Recall == 1.0 &&
		result.Metrics.FalsePositiveEventsPerDay <= 0.5
}

func compareAcceptableNABTuneResults(
	left nabTuneResult,
	right nabTuneResult,
) int {
	leftAcceptable := isAcceptableNABTuneResult(left)
	rightAcceptable := isAcceptableNABTuneResult(right)

	switch {
	case leftAcceptable && !rightAcceptable:
		return -1
	case !leftAcceptable && rightAcceptable:
		return 1
	case left.Metrics.AverageDetectionDelayMins < right.Metrics.AverageDetectionDelayMins:
		return -1
	case left.Metrics.AverageDetectionDelayMins > right.Metrics.AverageDetectionDelayMins:
		return 1
	case left.Metrics.F1 > right.Metrics.F1:
		return -1
	case left.Metrics.F1 < right.Metrics.F1:
		return 1
	case left.Metrics.FalsePositiveEvents < right.Metrics.FalsePositiveEvents:
		return -1
	case left.Metrics.FalsePositiveEvents > right.Metrics.FalsePositiveEvents:
		return 1
	case left.Metrics.Precision > right.Metrics.Precision:
		return -1
	case left.Metrics.Precision < right.Metrics.Precision:
		return 1
	case left.Metrics.Threshold > right.Metrics.Threshold:
		return -1
	case left.Metrics.Threshold < right.Metrics.Threshold:
		return 1
	case left.Model.CriticalMass < right.Model.CriticalMass:
		return -1
	case left.Model.CriticalMass > right.Model.CriticalMass:
		return 1
	default:
		return strings.Compare(left.signature(), right.signature())
	}
}

func compareFallbackNABTuneResults(
	left nabTuneResult,
	right nabTuneResult,
) int {
	switch {
	case left.Metrics.F1 > right.Metrics.F1:
		return -1
	case left.Metrics.F1 < right.Metrics.F1:
		return 1
	case left.Metrics.Recall > right.Metrics.Recall:
		return -1
	case left.Metrics.Recall < right.Metrics.Recall:
		return 1
	case left.Metrics.FalsePositiveEventsPerDay < right.Metrics.FalsePositiveEventsPerDay:
		return -1
	case left.Metrics.FalsePositiveEventsPerDay > right.Metrics.FalsePositiveEventsPerDay:
		return 1
	case left.Metrics.AverageDetectionDelayMins < right.Metrics.AverageDetectionDelayMins:
		return -1
	case left.Metrics.AverageDetectionDelayMins > right.Metrics.AverageDetectionDelayMins:
		return 1
	case left.Metrics.FalsePositiveEvents < right.Metrics.FalsePositiveEvents:
		return -1
	case left.Metrics.FalsePositiveEvents > right.Metrics.FalsePositiveEvents:
		return 1
	case left.Metrics.Threshold > right.Metrics.Threshold:
		return -1
	case left.Metrics.Threshold < right.Metrics.Threshold:
		return 1
	default:
		return strings.Compare(left.signature(), right.signature())
	}
}

func (result nabTuneResult) signature() string {
	return fmt.Sprintf(
		"%s threshold=%.2f",
		result.Model.signature(),
		result.Metrics.Threshold,
	)
}

func formatNABTuneTopLine(
	rank int,
	result nabTuneResult,
) string {
	return fmt.Sprintf(
		"%d | %d | %s | %s | %.2f | %s | %.2f | %.4f | %.4f | %d | %.4f | %.4f | %.2f | %.2f",
		rank,
		result.Model.CriticalMass,
		formatNABIntList(result.Model.TrainingWindows),
		formatNABIntList(result.Model.ClusterCounts),
		result.Model.ScaleFloorFactor,
		result.Model.Aggregation,
		result.Metrics.Threshold,
		result.Metrics.Recall,
		result.Metrics.FalsePositiveEventsPerDay,
		result.Metrics.FalsePositiveEvents,
		result.Metrics.Precision,
		result.Metrics.F1,
		result.Metrics.AverageDetectionDelayMins,
		result.Metrics.MaximumDetectionDelayMins,
	)
}

func formatNABTuneSummary(
	result nabTuneResult,
) string {
	return fmt.Sprintf(
		"critical_mass=%d windows=%s cluster_counts=%s scale_floor=%.2f aggregation=%s threshold=%.2f recall=%.4f precision=%.4f f1=%.4f fp_events=%d fp_per_day=%.4f avg_delay_minutes=%.2f max_delay_minutes=%.2f",
		result.Model.CriticalMass,
		formatNABIntList(result.Model.TrainingWindows),
		formatNABIntList(result.Model.ClusterCounts),
		result.Model.ScaleFloorFactor,
		result.Model.Aggregation,
		result.Metrics.Threshold,
		result.Metrics.Recall,
		result.Metrics.Precision,
		result.Metrics.F1,
		result.Metrics.FalsePositiveEvents,
		result.Metrics.FalsePositiveEventsPerDay,
		result.Metrics.AverageDetectionDelayMins,
		result.Metrics.MaximumDetectionDelayMins,
	)
}

func formatNABProductionSummary(
	result nabTuneResult,
) string {
	return fmt.Sprintf(
		"critical_mass=256 windows=256,512,1024 cluster_counts=2,3,4 scale_floor=0.05 aggregation=median best_threshold=%.2f recall=%.4f precision=%.4f f1=%.4f fp_events=%d fp_per_day=%.4f avg_delay_minutes=%.2f",
		result.Metrics.Threshold,
		result.Metrics.Recall,
		result.Metrics.Precision,
		result.Metrics.F1,
		result.Metrics.FalsePositiveEvents,
		result.Metrics.FalsePositiveEventsPerDay,
		result.Metrics.AverageDetectionDelayMins,
	)
}

func formatNABIntList(values []int) string {
	parts := make([]string, 0, len(values))

	for _, value := range values {
		parts = append(parts, strconv.Itoa(value))
	}

	return strings.Join(parts, ",")
}

func approxFloat64(
	left float64,
	right float64,
) bool {
	return math.Abs(left-right) < 1e-9
}

func equalTemporalCenters(
	left []mlFeatureVector,
	right []mlFeatureVector,
) bool {
	if len(left) != len(right) {
		return false
	}

	for index := range left {
		if len(left[index]) != len(right[index]) {
			return false
		}

		for dimensionIndex := range left[index] {
			if !approxFloat64(
				left[index][dimensionIndex],
				right[index][dimensionIndex],
			) {
				return false
			}
		}
	}

	return true
}

func recommendedCandidateMLConfig() mlConfig {
	return mlConfig{
		CriticalMass:       128,
		MaximumSamples:     defaultMLConfig.MaximumSamples,
		KMeansIterations:   defaultMLConfig.KMeansIterations,
		LearningScoreLimit: defaultMLConfig.LearningScoreLimit,
		MaximumScore:       defaultMLConfig.MaximumScore,
		MinimumScale:       defaultMLConfig.MinimumScale,
		TrainingWindows:    []int{256, 512, 1024},
		ClusterCounts:      []int{2, 3},
		ScaleFloorFactor:   0.05,
		Aggregation:        mlAggregationMedian,
	}
}

func formatNABAggregateMetrics(metrics nabAggregateMetrics) string {
	return fmt.Sprintf(
		"series_count=%d evaluated_series=%d skipped_series=%d total_points=%d evaluated_points=%d total_series_days=%.4f total_windows=%d detected_windows=%d missed_windows=%d false_positive_events=%d false_positive_events_per_series_day=%.4f event_precision=%.4f event_recall=%.4f event_f1=%.4f macro_f1=%.4f median_detection_delay_minutes=%.2f p95_detection_delay_minutes=%.2f maximum_detection_delay_minutes=%.2f total_detection_points=%d zero_window_series=%d zero_window_series_with_false_positives=%d runtime=%s",
		metrics.SeriesCount,
		metrics.EvaluatedSeries,
		metrics.SkippedSeries,
		metrics.TotalPoints,
		metrics.EvaluatedPoints,
		metrics.TotalSeriesDays,
		metrics.TotalWindows,
		metrics.DetectedWindows,
		metrics.MissedWindows,
		metrics.FalsePositiveEvents,
		metrics.FalsePositiveEventsPerSeriesDay,
		metrics.EventPrecision,
		metrics.EventRecall,
		metrics.EventF1,
		metrics.MacroF1,
		metrics.MedianDetectionDelayMinutes,
		metrics.P95DetectionDelayMinutes,
		metrics.MaximumDetectionDelayMinutes,
		metrics.TotalDetectionPoints,
		metrics.ZeroWindowSeries,
		metrics.ZeroWindowSeriesWithFalsePositives,
		metrics.Runtime.Round(time.Millisecond),
	)
}

func splitNABSeriesKeys(seriesKeys []string) ([]string, []string) {
	train := make([]string, 0)
	test := make([]string, 0)

	for _, seriesKey := range seriesKeys {
		hasher := fnv.New32a()
		_, _ = hasher.Write([]byte(seriesKey))
		if hasher.Sum32()%4 == 0 {
			test = append(test, seriesKey)
		} else {
			train = append(train, seriesKey)
		}
	}

	return train, test
}

func validateNABSeriesSplit(
	train []string,
	test []string,
) error {
	trainSet := make(map[string]struct{}, len(train))
	for _, key := range train {
		trainSet[key] = struct{}{}
	}

	for _, key := range test {
		if _, ok := trainSet[key]; ok {
			return fmt.Errorf("series %q appears in both train and test", key)
		}
	}

	return nil
}

func filterNABSeriesEvaluations(
	seriesKeys []string,
	evaluationByKey map[string]nabSeriesEvaluation,
) []nabSeriesEvaluation {
	filtered := make([]nabSeriesEvaluation, 0)
	for _, seriesKey := range seriesKeys {
		evaluation, ok := evaluationByKey[seriesKey]
		if ok {
			filtered = append(filtered, evaluation)
		}
	}

	return filtered
}

func filterNABSeriesSkips(
	seriesKeys []string,
	skipped []nabSeriesSkip,
) []nabSeriesSkip {
	allowed := make(map[string]struct{}, len(seriesKeys))
	for _, seriesKey := range seriesKeys {
		allowed[seriesKey] = struct{}{}
	}

	filtered := make([]nabSeriesSkip, 0)
	for _, skip := range skipped {
		if _, ok := allowed[skip.SeriesKey]; ok {
			filtered = append(filtered, skip)
		}
	}

	return filtered
}

func resolveNABAcrossTuneMode() (string, []nabTuneModelConfig, []float64) {
	if os.Getenv("NAB_TUNE_FULL") == "1" {
		return "full", buildNABAcrossFullModelConfigs(), []float64{
			1.5,
			2.0,
			2.5,
			3.0,
			3.5,
			4.0,
			4.5,
			5.0,
			6.0,
		}
	}

	return "smoke", buildNABAcrossSmokeModelConfigs(), []float64{
		2.5,
		3.0,
		3.5,
		4.0,
		4.5,
		5.0,
	}
}

func buildNABAcrossSmokeModelConfigs() []nabTuneModelConfig {
	return buildNABTuneConfigsFromGrid(
		[]int{64, 128, 256},
		[][]int{
			{128, 256, 512},
			{256, 512, 1024},
		},
		[][]int{
			{2},
			{2, 3},
			{2, 3, 4},
		},
		[]float64{0.05, 0.10, 0.20},
		[]mlEnsembleAggregation{
			mlAggregationMedian,
			mlAggregationP75,
		},
	)
}

func buildNABAcrossFullModelConfigs() []nabTuneModelConfig {
	return buildNABTuneConfigsFromGrid(
		[]int{64, 128, 256, 512},
		[][]int{
			{64, 128, 256},
			{128, 256, 512},
			{256, 512, 1024},
		},
		[][]int{
			{2},
			{2, 3},
			{2, 3, 4},
			{3, 4, 5},
		},
		[]float64{0.05, 0.10, 0.20, 0.30},
		[]mlEnsembleAggregation{
			mlAggregationMedian,
			mlAggregationP75,
			mlAggregationTop2Mean,
		},
	)
}

func buildNABTuneConfigsFromGrid(
	criticalMasses []int,
	windowSets [][]int,
	clusterSets [][]int,
	scaleFloorFactors []float64,
	aggregations []mlEnsembleAggregation,
) []nabTuneModelConfig {
	configs := make([]nabTuneModelConfig, 0)
	for _, criticalMass := range criticalMasses {
		for _, windows := range windowSets {
			for _, clusterCounts := range clusterSets {
				for _, scaleFloorFactor := range scaleFloorFactors {
					for _, aggregation := range aggregations {
						configs = append(configs, nabTuneModelConfig{
							CriticalMass:     criticalMass,
							TrainingWindows:  slices.Clone(windows),
							ClusterCounts:    slices.Clone(clusterCounts),
							ScaleFloorFactor: scaleFloorFactor,
							Aggregation:      aggregation,
						})
					}
				}
			}
		}
	}

	return configs
}

func runNABAcrossTuneSweep(
	t *testing.T,
	trainEvaluations []nabSeriesEvaluation,
	trainSeriesKeys []string,
	trainSkipped []nabSeriesSkip,
	modelConfigs []nabTuneModelConfig,
	thresholds []float64,
) ([]nabAcrossTuneResult, time.Duration, error) {
	t.Helper()

	startedAt := time.Now()
	type configJob struct {
		Index  int
		Config nabTuneModelConfig
	}
	type configResult struct {
		Index   int
		Results []nabAcrossTuneResult
		Err     error
	}

	jobs := make(chan configJob)
	resultsCh := make(chan configResult)

	workerCount := min(runtime.NumCPU(), len(modelConfigs))
	if workerCount < 1 {
		workerCount = 1
	}

	for workerIndex := 0; workerIndex < workerCount; workerIndex++ {
		go func() {
			for job := range jobs {
				results, err := evaluateNABAcrossConfigOnSeriesSet(
					trainEvaluations,
					len(trainSeriesKeys),
					trainSkipped,
					job.Config,
					thresholds,
				)
				resultsCh <- configResult{
					Index:   job.Index,
					Results: results,
					Err:     err,
				}
			}
		}()
	}

	go func() {
		for index, modelConfig := range modelConfigs {
			jobs <- configJob{
				Index:  index,
				Config: modelConfig,
			}
		}
		close(jobs)
	}()

	allResults := make([]nabAcrossTuneResult, 0, len(modelConfigs)*len(thresholds))
	for completed := 1; completed <= len(modelConfigs); completed++ {
		result := <-resultsCh
		if result.Err != nil {
			return nil, 0, result.Err
		}

		allResults = append(allResults, result.Results...)
		if completed%10 == 0 || completed == len(modelConfigs) {
			t.Logf(
				"completed_configs=%d/%d elapsed=%s",
				completed,
				len(modelConfigs),
				time.Since(startedAt).Round(time.Millisecond),
			)
		}
	}

	return allResults, time.Since(startedAt), nil
}

func evaluateNABAcrossConfigOnSeriesSet(
	evaluations []nabSeriesEvaluation,
	seriesCount int,
	skipped []nabSeriesSkip,
	modelConfig nabTuneModelConfig,
	thresholds []float64,
) ([]nabAcrossTuneResult, error) {
	thresholdMetrics := make(map[float64][]nabDetailedMetrics, len(thresholds))
	for _, threshold := range thresholds {
		thresholdMetrics[threshold] = make([]nabDetailedMetrics, 0, len(evaluations))
	}

	startedAt := time.Now()
	for _, evaluation := range evaluations {
		mlScores, err := calculateNABMLScoresWithConfig(
			evaluation.SeriesKey,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			modelConfig.toMLConfig(),
		)
		if err != nil {
			return nil, fmt.Errorf("config %s series %s: %w", modelConfig.signature(), evaluation.SeriesKey, err)
		}

		for _, threshold := range thresholds {
			thresholdMetrics[threshold] = append(
				thresholdMetrics[threshold],
				evaluateNABAlgorithmDetailed(
					"tuned_kmeans",
					threshold,
					evaluation.EvaluatedPoints,
					mlScores,
					evaluation.EvaluationWindows,
					evaluation.Interval,
				),
			)
		}
	}

	results := make([]nabAcrossTuneResult, 0, len(thresholds))
	elapsed := time.Since(startedAt)
	for _, threshold := range thresholds {
		aggregate, err := aggregateNABSeriesMetrics(
			"tuned_kmeans",
			seriesCount,
			evaluations,
			skipped,
			thresholdMetrics[threshold],
			elapsed,
		)
		if err != nil {
			return nil, err
		}

		results = append(results, nabAcrossTuneResult{
			Model:      modelConfig,
			Threshold:  threshold,
			ModelCount: modelConfig.modelCount(),
			Train:      aggregate,
		})
	}

	return results, nil
}

func aggregateStandardAcrossNABSeries(
	seriesKeys []string,
	evaluations []nabSeriesEvaluation,
	skipped []nabSeriesSkip,
	threshold float64,
) (nabAggregateMetrics, error) {
	startedAt := time.Now()
	detailedMetrics := make([]nabDetailedMetrics, 0, len(evaluations))
	for _, evaluation := range evaluations {
		detailedMetrics = append(detailedMetrics, evaluateNABAlgorithmDetailed(
			"standard",
			threshold,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			evaluation.EvaluationWindows,
			evaluation.Interval,
		))
	}

	return aggregateNABSeriesMetrics(
		"standard",
		len(seriesKeys),
		evaluations,
		skipped,
		detailedMetrics,
		time.Since(startedAt),
	)
}

func evaluateNABAcrossConfigForThreshold(
	evaluations []nabSeriesEvaluation,
	seriesKeys []string,
	skipped []nabSeriesSkip,
	modelConfig nabTuneModelConfig,
	threshold float64,
) (nabAcrossTuneResult, error) {
	results, err := evaluateNABAcrossConfigOnSeriesSet(
		evaluations,
		len(seriesKeys),
		skipped,
		modelConfig,
		[]float64{threshold},
	)
	if err != nil {
		return nabAcrossTuneResult{}, err
	}

	return results[0], nil
}

func rankNABAcrossTuneResults(
	results []nabAcrossTuneResult,
) []nabAcrossTuneResult {
	ranked := slices.Clone(results)
	hasAcceptable := false
	for _, result := range ranked {
		if isAcceptableNABAcrossTuneResult(result) {
			hasAcceptable = true
			break
		}
	}

	slices.SortFunc(ranked, func(left, right nabAcrossTuneResult) int {
		if hasAcceptable {
			return compareAcceptableNABAcrossTuneResults(left, right)
		}

		return compareFallbackNABAcrossTuneResults(left, right)
	})

	return ranked
}

func isAcceptableNABAcrossTuneResult(
	result nabAcrossTuneResult,
) bool {
	return result.Train.EventRecall >= 0.90 &&
		result.Train.FalsePositiveEventsPerSeriesDay <= 0.5
}

func compareAcceptableNABAcrossTuneResults(
	left nabAcrossTuneResult,
	right nabAcrossTuneResult,
) int {
	leftAcceptable := isAcceptableNABAcrossTuneResult(left)
	rightAcceptable := isAcceptableNABAcrossTuneResult(right)

	switch {
	case leftAcceptable && !rightAcceptable:
		return -1
	case !leftAcceptable && rightAcceptable:
		return 1
	case left.Train.EventF1 > right.Train.EventF1:
		return -1
	case left.Train.EventF1 < right.Train.EventF1:
		return 1
	case left.Train.EventRecall > right.Train.EventRecall:
		return -1
	case left.Train.EventRecall < right.Train.EventRecall:
		return 1
	case left.Train.FalsePositiveEventsPerSeriesDay < right.Train.FalsePositiveEventsPerSeriesDay:
		return -1
	case left.Train.FalsePositiveEventsPerSeriesDay > right.Train.FalsePositiveEventsPerSeriesDay:
		return 1
	case left.Train.MedianDetectionDelayMinutes < right.Train.MedianDetectionDelayMinutes:
		return -1
	case left.Train.MedianDetectionDelayMinutes > right.Train.MedianDetectionDelayMinutes:
		return 1
	case left.Train.P95DetectionDelayMinutes < right.Train.P95DetectionDelayMinutes:
		return -1
	case left.Train.P95DetectionDelayMinutes > right.Train.P95DetectionDelayMinutes:
		return 1
	case left.ModelCount < right.ModelCount:
		return -1
	case left.ModelCount > right.ModelCount:
		return 1
	case left.Model.CriticalMass < right.Model.CriticalMass:
		return -1
	case left.Model.CriticalMass > right.Model.CriticalMass:
		return 1
	case left.Threshold > right.Threshold:
		return -1
	case left.Threshold < right.Threshold:
		return 1
	default:
		return strings.Compare(left.signature(), right.signature())
	}
}

func compareFallbackNABAcrossTuneResults(
	left nabAcrossTuneResult,
	right nabAcrossTuneResult,
) int {
	switch {
	case left.Train.EventF1 > right.Train.EventF1:
		return -1
	case left.Train.EventF1 < right.Train.EventF1:
		return 1
	case left.Train.EventRecall > right.Train.EventRecall:
		return -1
	case left.Train.EventRecall < right.Train.EventRecall:
		return 1
	case left.Train.FalsePositiveEventsPerSeriesDay < right.Train.FalsePositiveEventsPerSeriesDay:
		return -1
	case left.Train.FalsePositiveEventsPerSeriesDay > right.Train.FalsePositiveEventsPerSeriesDay:
		return 1
	case left.Train.P95DetectionDelayMinutes < right.Train.P95DetectionDelayMinutes:
		return -1
	case left.Train.P95DetectionDelayMinutes > right.Train.P95DetectionDelayMinutes:
		return 1
	default:
		return strings.Compare(left.signature(), right.signature())
	}
}

func (config nabTuneModelConfig) modelCount() int {
	return len(config.TrainingWindows) * len(config.ClusterCounts)
}

func (result nabAcrossTuneResult) signature() string {
	return fmt.Sprintf(
		"%s threshold=%.2f",
		result.Model.signature(),
		result.Threshold,
	)
}

func formatNABAcrossTuneTopLine(
	rank int,
	result nabAcrossTuneResult,
) string {
	return fmt.Sprintf(
		"%d | %d | %s | %s | %.2f | %s | %.2f | %d | %.4f | %.4f | %.4f | %.4f | %d | %.2f | %.2f",
		rank,
		result.Model.CriticalMass,
		formatNABIntList(result.Model.TrainingWindows),
		formatNABIntList(result.Model.ClusterCounts),
		result.Model.ScaleFloorFactor,
		result.Model.Aggregation,
		result.Threshold,
		result.ModelCount,
		result.Train.EventRecall,
		result.Train.EventPrecision,
		result.Train.EventF1,
		result.Train.FalsePositiveEventsPerSeriesDay,
		result.Train.FalsePositiveEvents,
		result.Train.MedianDetectionDelayMinutes,
		result.Train.P95DetectionDelayMinutes,
	)
}

func formatNABAcrossTuneSummary(
	result nabAcrossTuneResult,
) string {
	return fmt.Sprintf(
		"critical_mass=%d windows=%s cluster_counts=%s scale_floor=%.2f aggregation=%s threshold=%.2f models=%d series=%d windows=%d detected=%d missed=%d recall=%.4f precision=%.4f f1=%.4f fp_events=%d fp_per_series_day=%.4f median_delay=%.2f p95_delay=%.2f runtime=%s",
		result.Model.CriticalMass,
		formatNABIntList(result.Model.TrainingWindows),
		formatNABIntList(result.Model.ClusterCounts),
		result.Model.ScaleFloorFactor,
		result.Model.Aggregation,
		result.Threshold,
		result.ModelCount,
		result.Train.EvaluatedSeries,
		result.Train.TotalWindows,
		result.Train.DetectedWindows,
		result.Train.MissedWindows,
		result.Train.EventRecall,
		result.Train.EventPrecision,
		result.Train.EventF1,
		result.Train.FalsePositiveEvents,
		result.Train.FalsePositiveEventsPerSeriesDay,
		result.Train.MedianDetectionDelayMinutes,
		result.Train.P95DetectionDelayMinutes,
		result.Train.Runtime.Round(time.Millisecond),
	)
}

func formatNABHoldoutComparisonLine(
	algorithm string,
	metrics nabAggregateMetrics,
) string {
	return fmt.Sprintf(
		"%s | %d | %d | %d | %d | %d | %.4f | %.4f | %.4f | %.4f | %.2f | %.2f",
		algorithm,
		metrics.EvaluatedSeries,
		metrics.TotalWindows,
		metrics.DetectedWindows,
		metrics.MissedWindows,
		metrics.FalsePositiveEvents,
		metrics.FalsePositiveEventsPerSeriesDay,
		metrics.EventPrecision,
		metrics.EventRecall,
		metrics.EventF1,
		metrics.MedianDetectionDelayMinutes,
		metrics.P95DetectionDelayMinutes,
	)
}

func nabTuneModelConfigFromMLConfig(config mlConfig) nabTuneModelConfig {
	return nabTuneModelConfig{
		CriticalMass:     config.CriticalMass,
		TrainingWindows:  slices.Clone(config.TrainingWindows),
		ClusterCounts:    slices.Clone(config.ClusterCounts),
		ScaleFloorFactor: config.ScaleFloorFactor,
		Aggregation:      config.Aggregation,
	}
}

func baselineNetdataMLConfig(
	minimumModelsForConsensus int,
) mlConfig {
	config := defaultMLConfig
	config.AlgorithmMode = mlAlgorithmNetdataTemporal
	config.NetdataDiffN = 1
	config.NetdataSmoothN = 3
	config.NetdataLagN = 5
	config.NetdataTrainingWindow = 6 * time.Hour
	config.NetdataTrainEvery = 3 * time.Hour
	config.NetdataMaximumModels = 18
	config.NetdataMinimumModelsForConsensus = minimumModelsForConsensus
	config.NetdataDistanceQuantile = 0.99
	return config
}

func loadNABAWSTemporalEvaluations(
	nabRoot string,
	seriesKeys []string,
) ([]nabTemporalSeriesEvaluation, []nabSeriesSkip, error) {
	windowMap, err := loadNABWindowMap(
		filepath.Join(nabRoot, "labels", "combined_windows.json"),
	)
	if err != nil {
		return nil, nil, err
	}

	regularEvaluations, _, err := loadNABAWSSeriesEvaluations(
		nabRoot,
		seriesKeys,
	)
	if err != nil {
		return nil, nil, err
	}

	standardScoreMaps := make(map[string]map[int64]float64, len(regularEvaluations))
	for _, evaluation := range regularEvaluations {
		scoreMap := make(map[int64]float64, len(evaluation.EvaluatedPoints))
		for index, point := range evaluation.EvaluatedPoints {
			scoreMap[point.Timestamp.UnixMilli()] = evaluation.StandardScores[index]
		}
		standardScoreMaps[evaluation.SeriesKey] = scoreMap
	}

	evaluations := make([]nabTemporalSeriesEvaluation, 0, len(seriesKeys))
	skipped := make([]nabSeriesSkip, 0)
	for _, seriesKey := range seriesKeys {
		points, err := loadNABPoints(filepath.Join(
			nabRoot,
			"data",
			filepath.FromSlash(seriesKey),
		))
		if err != nil {
			return nil, nil, fmt.Errorf("load %s: %w", seriesKey, err)
		}

		if len(points) < 2 {
			skipped = append(skipped, nabSeriesSkip{
				SeriesKey: seriesKey,
				Reason:    "not enough points",
			})
			continue
		}

		expectedInterval, gapCount, segmentCount, err := inferTemporalSeriesShape(points)
		if err != nil {
			skipped = append(skipped, nabSeriesSkip{
				SeriesKey: seriesKey,
				Reason:    err.Error(),
			})
			continue
		}

		fallbackScores := make([]float64, len(points))
		scoreMap := standardScoreMaps[seriesKey]
		for index, point := range points {
			if scoreMap != nil {
				if score, ok := scoreMap[point.Timestamp.UnixMilli()]; ok && isFinite(score) {
					fallbackScores[index] = score
				}
			}
		}

		seriesDays := points[len(points)-1].Timestamp.Sub(points[0].Timestamp).Hours() / 24
		if seriesDays <= 0 {
			seriesDays = float64(len(points)) * expectedInterval.Hours() / 24
		}

		evaluations = append(evaluations, nabTemporalSeriesEvaluation{
			SeriesKey:        seriesKey,
			Points:           points,
			FallbackScores:   fallbackScores,
			Windows:          windowMap[seriesKey],
			ExpectedInterval: expectedInterval,
			GapCount:         gapCount,
			SegmentCount:     segmentCount,
			SeriesDays:       seriesDays,
		})
	}

	return evaluations, skipped, nil
}

func inferTemporalSeriesShape(
	points []nabPoint,
) (time.Duration, int, int, error) {
	if len(points) < 2 {
		return 0, 0, 0, errors.New("not enough points")
	}

	intervalCounts := make(map[int64]int)
	intervalOrder := make([]int64, 0)
	for index := 1; index < len(points); index++ {
		if !points[index].Timestamp.After(points[index-1].Timestamp) {
			return 0, 0, 0, fmt.Errorf("timestamps are not strictly increasing at index %d", index)
		}

		interval := points[index].Timestamp.Sub(points[index-1].Timestamp)
		intervalMillis := interval.Milliseconds()
		if intervalMillis <= 0 {
			continue
		}

		if _, ok := intervalCounts[intervalMillis]; !ok {
			intervalOrder = append(intervalOrder, intervalMillis)
		}
		intervalCounts[intervalMillis]++
	}

	bestIntervalMillis := int64(0)
	bestCount := -1
	for _, intervalMillis := range intervalOrder {
		count := intervalCounts[intervalMillis]
		if count > bestCount || (count == bestCount && intervalMillis < bestIntervalMillis) {
			bestIntervalMillis = intervalMillis
			bestCount = count
		}
	}

	if bestIntervalMillis <= 0 {
		return 0, 0, 0, errors.New("expected interval is not positive")
	}

	expectedInterval := time.Duration(bestIntervalMillis) * time.Millisecond
	gapCount := 0
	segmentCount := 1
	for index := 1; index < len(points); index++ {
		gap := points[index].Timestamp.Sub(points[index-1].Timestamp)
		if gap > expectedInterval*3/2 {
			gapCount++
			segmentCount++
		}
	}

	return expectedInterval, gapCount, segmentCount, nil
}

func temporalEvaluationsToSeriesEvaluations(
	temporalEvaluations []nabTemporalSeriesEvaluation,
) ([]nabSeriesEvaluation, []nabSeriesSkip) {
	evaluations := make([]nabSeriesEvaluation, 0, len(temporalEvaluations))
	for _, evaluation := range temporalEvaluations {
		evaluations = append(evaluations, nabSeriesEvaluation{
			SeriesKey:         evaluation.SeriesKey,
			TotalPoints:       len(evaluation.Points),
			EvaluatedPoints:   evaluation.Points,
			StandardScores:    evaluation.FallbackScores,
			EvaluationWindows: evaluation.Windows,
			Interval:          evaluation.ExpectedInterval,
			SeriesDays:        evaluation.SeriesDays,
		})
	}

	return evaluations, nil
}

func filterNABTemporalEvaluations(
	seriesKeys []string,
	temporalByKey map[string]nabTemporalSeriesEvaluation,
) []nabTemporalSeriesEvaluation {
	filtered := make([]nabTemporalSeriesEvaluation, 0)
	for _, seriesKey := range seriesKeys {
		if evaluation, ok := temporalByKey[seriesKey]; ok {
			filtered = append(filtered, evaluation)
		}
	}

	return filtered
}

func aggregateNetdataStandardForKeys(
	nabRoot string,
	seriesKeys []string,
) (nabAggregateMetrics, error) {
	evaluations, skipped, err := loadNABAWSSeriesEvaluations(
		nabRoot,
		seriesKeys,
	)
	if err != nil {
		return nabAggregateMetrics{}, err
	}

	return aggregateStandardAcrossNABSeries(
		seriesKeys,
		evaluations,
		skipped,
		6.0,
	)
}

func buildNetdataTuneConfigs(
	full bool,
) (string, []netdataTuneConfig) {
	if full {
		return "full", buildNetdataTuneConfigsFromGrid(
			[]int{1},
			[]int{1, 3, 5},
			[]int{3, 5, 8},
			[]time.Duration{3 * time.Hour, 6 * time.Hour, 12 * time.Hour},
			[]time.Duration{1 * time.Hour, 3 * time.Hour, 6 * time.Hour},
			[]int{6, 12, 18},
			[]int{1, 3, 6},
			[]float64{0.95, 0.975, 0.99, 0.995},
		)
	}

	return "smoke", buildNetdataTuneConfigsFromGrid(
		[]int{1},
		[]int{1, 3, 5},
		[]int{3, 5, 8},
		[]time.Duration{3 * time.Hour, 6 * time.Hour, 12 * time.Hour},
		[]time.Duration{1 * time.Hour, 3 * time.Hour, 6 * time.Hour},
		[]int{6, 12, 18},
		[]int{1, 3, 6},
		[]float64{0.95, 0.975, 0.99, 0.995},
	)
}

func buildNetdataTuneConfigsFromGrid(
	diffs []int,
	smooths []int,
	lags []int,
	trainingWindows []time.Duration,
	trainEvery []time.Duration,
	maximumModels []int,
	minimumModels []int,
	quantiles []float64,
) []netdataTuneConfig {
	configs := make([]netdataTuneConfig, 0)
	for _, diff := range diffs {
		for _, smooth := range smooths {
			for _, lag := range lags {
				for _, trainingWindow := range trainingWindows {
					for _, every := range trainEvery {
						for _, maximumModel := range maximumModels {
							for _, minimumModel := range minimumModels {
								for _, quantile := range quantiles {
									configs = append(configs, netdataTuneConfig{
										DiffN:                     diff,
										SmoothN:                   smooth,
										LagN:                      lag,
										TrainingWindow:            trainingWindow,
										TrainEvery:                every,
										MaximumModels:             maximumModel,
										MinimumModelsForConsensus: minimumModel,
										DistanceQuantile:          quantile,
									})
								}
							}
						}
					}
				}
			}
		}
	}

	return configs
}

func (config netdataTuneConfig) toMLConfig() mlConfig {
	result := baselineNetdataMLConfig(config.MinimumModelsForConsensus)
	result.NetdataDiffN = config.DiffN
	result.NetdataSmoothN = config.SmoothN
	result.NetdataLagN = config.LagN
	result.NetdataTrainingWindow = config.TrainingWindow
	result.NetdataTrainEvery = config.TrainEvery
	result.NetdataMaximumModels = config.MaximumModels
	result.NetdataDistanceQuantile = config.DistanceQuantile
	return result
}

func netdataTuneConfigFromMLConfig(config mlConfig) netdataTuneConfig {
	return netdataTuneConfig{
		DiffN:                     config.NetdataDiffN,
		SmoothN:                   config.NetdataSmoothN,
		LagN:                      config.NetdataLagN,
		TrainingWindow:            config.NetdataTrainingWindow,
		TrainEvery:                config.NetdataTrainEvery,
		MaximumModels:             config.NetdataMaximumModels,
		MinimumModelsForConsensus: config.NetdataMinimumModelsForConsensus,
		DistanceQuantile:          config.NetdataDistanceQuantile,
	}
}

func (config netdataTuneConfig) warmupDuration() time.Duration {
	return config.TrainingWindow +
		time.Duration(config.MinimumModelsForConsensus-1)*
			config.TrainEvery
}

func (config netdataTuneConfig) signature() string {
	return fmt.Sprintf(
		"diff=%d smooth=%d lag=%d training_window=%s train_every=%s maximum_models=%d minimum_models=%d quantile=%.3f",
		config.DiffN,
		config.SmoothN,
		config.LagN,
		config.TrainingWindow,
		config.TrainEvery,
		config.MaximumModels,
		config.MinimumModelsForConsensus,
		config.DistanceQuantile,
	)
}

func runNetdataTuneSweep(
	t *testing.T,
	trainKeys []string,
	trainTemporalSeries []nabSeriesEvaluation,
	trainTemporalSkips []nabSeriesSkip,
	configs []netdataTuneConfig,
) ([]netdataTuneResult, time.Duration, error) {
	t.Helper()

	startedAt := time.Now()
	type configJob struct {
		Index  int
		Config netdataTuneConfig
	}
	type configResult struct {
		Result netdataTuneResult
		Err    error
	}

	jobs := make(chan configJob)
	resultsCh := make(chan configResult)
	workerCount := min(runtime.NumCPU(), len(configs))
	if workerCount < 1 {
		workerCount = 1
	}

	for workerIndex := 0; workerIndex < workerCount; workerIndex++ {
		go func() {
			for job := range jobs {
				result, err := evaluateNetdataTuneConfig(
					trainKeys,
					trainTemporalSeries,
					trainTemporalSkips,
					job.Config,
				)
				resultsCh <- configResult{
					Result: result,
					Err:    err,
				}
			}
		}()
	}

	go func() {
		for index, config := range configs {
			jobs <- configJob{Index: index, Config: config}
		}
		close(jobs)
	}()

	results := make([]netdataTuneResult, 0, len(configs))
	for completed := 1; completed <= len(configs); completed++ {
		result := <-resultsCh
		if result.Err != nil {
			return nil, 0, result.Err
		}

		results = append(results, result.Result)
		if completed%10 == 0 || completed == len(configs) {
			t.Logf(
				"completed_configs=%d/%d elapsed=%s",
				completed,
				len(configs),
				time.Since(startedAt).Round(time.Millisecond),
			)
		}
	}

	return results, time.Since(startedAt), nil
}

func evaluateNetdataTuneConfig(
	seriesKeys []string,
	evaluations []nabSeriesEvaluation,
	skipped []nabSeriesSkip,
	config netdataTuneConfig,
) (netdataTuneResult, error) {
	startedAt := time.Now()
	detailedMetrics := make([]nabDetailedMetrics, 0, len(evaluations))
	mlConfig := config.toMLConfig()
	for _, evaluation := range evaluations {
		mlScores, err := calculateNABMLScoresWithConfig(
			evaluation.SeriesKey,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			mlConfig,
		)
		if err != nil {
			return netdataTuneResult{}, fmt.Errorf("config %s series %s: %w", config.signature(), evaluation.SeriesKey, err)
		}

		detailedMetrics = append(detailedMetrics, evaluateNABAlgorithmDetailed(
			"netdata_tuned",
			4.0,
			evaluation.EvaluatedPoints,
			mlScores,
			evaluation.EvaluationWindows,
			evaluation.Interval,
		))
	}

	aggregate, err := aggregateNABSeriesMetrics(
		"netdata_tuned",
		len(seriesKeys),
		evaluations,
		skipped,
		detailedMetrics,
		time.Since(startedAt),
	)
	if err != nil {
		return netdataTuneResult{}, err
	}

	return netdataTuneResult{
		Config:    config,
		Threshold: 4.0,
		Train:     aggregate,
	}, nil
}

func evaluateNetdataHoldoutAgainstConfig(
	evaluations []nabTemporalSeriesEvaluation,
	config mlConfig,
	threshold float64,
	algorithm string,
) (nabAggregateMetrics, error) {
	seriesKeys := make([]string, 0, len(evaluations))
	seriesEvaluations, skipped := temporalEvaluationsToSeriesEvaluations(evaluations)
	detailedMetrics := make([]nabDetailedMetrics, 0, len(evaluations))
	startedAt := time.Now()
	for _, evaluation := range evaluations {
		seriesKeys = append(seriesKeys, evaluation.SeriesKey)
		mlScores, err := calculateNABMLScoresWithConfig(
			evaluation.SeriesKey,
			evaluation.Points,
			evaluation.FallbackScores,
			config,
		)
		if err != nil {
			return nabAggregateMetrics{}, err
		}

		detailedMetrics = append(detailedMetrics, evaluateNABAlgorithmDetailed(
			algorithm,
			threshold,
			evaluation.Points,
			mlScores,
			evaluation.Windows,
			evaluation.ExpectedInterval,
		))
	}

	return aggregateNABSeriesMetrics(
		algorithm,
		len(seriesKeys),
		seriesEvaluations,
		skipped,
		detailedMetrics,
		time.Since(startedAt),
	)
}

func rankNetdataTuneResults(
	results []netdataTuneResult,
	standard nabAggregateMetrics,
) []netdataTuneResult {
	ranked := slices.Clone(results)
	hasAcceptable := false
	for _, result := range ranked {
		if isAcceptableNetdataTuneResult(result, standard) {
			hasAcceptable = true
			break
		}
	}

	slices.SortFunc(ranked, func(left, right netdataTuneResult) int {
		if hasAcceptable {
			return compareAcceptableNetdataTuneResults(left, right, standard)
		}

		return compareFallbackNetdataTuneResults(left, right)
	})

	return ranked
}

func isAcceptableNetdataTuneResult(
	result netdataTuneResult,
	standard nabAggregateMetrics,
) bool {
	return result.Train.EventRecall >= 0.75 &&
		result.Train.FalsePositiveEventsPerSeriesDay <= standard.FalsePositiveEventsPerSeriesDay &&
		result.Train.EventF1 >= standard.EventF1
}

func compareAcceptableNetdataTuneResults(
	left netdataTuneResult,
	right netdataTuneResult,
	standard nabAggregateMetrics,
) int {
	leftAcceptable := isAcceptableNetdataTuneResult(left, standard)
	rightAcceptable := isAcceptableNetdataTuneResult(right, standard)
	switch {
	case leftAcceptable && !rightAcceptable:
		return -1
	case !leftAcceptable && rightAcceptable:
		return 1
	case left.Train.EventF1 > right.Train.EventF1:
		return -1
	case left.Train.EventF1 < right.Train.EventF1:
		return 1
	case left.Train.FalsePositiveEventsPerSeriesDay < right.Train.FalsePositiveEventsPerSeriesDay:
		return -1
	case left.Train.FalsePositiveEventsPerSeriesDay > right.Train.FalsePositiveEventsPerSeriesDay:
		return 1
	case left.Train.EventRecall > right.Train.EventRecall:
		return -1
	case left.Train.EventRecall < right.Train.EventRecall:
		return 1
	case left.Train.MedianDetectionDelayMinutes < right.Train.MedianDetectionDelayMinutes:
		return -1
	case left.Train.MedianDetectionDelayMinutes > right.Train.MedianDetectionDelayMinutes:
		return 1
	case left.Train.P95DetectionDelayMinutes < right.Train.P95DetectionDelayMinutes:
		return -1
	case left.Train.P95DetectionDelayMinutes > right.Train.P95DetectionDelayMinutes:
		return 1
	case left.Config.MaximumModels < right.Config.MaximumModels:
		return -1
	case left.Config.MaximumModels > right.Config.MaximumModels:
		return 1
	case left.Config.MinimumModelsForConsensus > right.Config.MinimumModelsForConsensus:
		return -1
	case left.Config.MinimumModelsForConsensus < right.Config.MinimumModelsForConsensus:
		return 1
	case left.Config.LagN < right.Config.LagN:
		return -1
	case left.Config.LagN > right.Config.LagN:
		return 1
	case left.Config.TrainingWindow < right.Config.TrainingWindow:
		return -1
	case left.Config.TrainingWindow > right.Config.TrainingWindow:
		return 1
	default:
		return strings.Compare(left.Config.signature(), right.Config.signature())
	}
}

func compareFallbackNetdataTuneResults(
	left netdataTuneResult,
	right netdataTuneResult,
) int {
	switch {
	case left.Train.EventF1 > right.Train.EventF1:
		return -1
	case left.Train.EventF1 < right.Train.EventF1:
		return 1
	case left.Train.FalsePositiveEventsPerSeriesDay < right.Train.FalsePositiveEventsPerSeriesDay:
		return -1
	case left.Train.FalsePositiveEventsPerSeriesDay > right.Train.FalsePositiveEventsPerSeriesDay:
		return 1
	case left.Train.EventRecall > right.Train.EventRecall:
		return -1
	case left.Train.EventRecall < right.Train.EventRecall:
		return 1
	default:
		return strings.Compare(left.Config.signature(), right.Config.signature())
	}
}

func formatNetdataTuneTopLine(
	rank int,
	result netdataTuneResult,
) string {
	return fmt.Sprintf(
		"%d | %d | %d | %d | %s | %s | %d | %d | %.3f | %.1f | %s | %.4f | %.4f | %.4f | %.4f | %d | %.2f | %.2f",
		rank,
		result.Config.DiffN,
		result.Config.SmoothN,
		result.Config.LagN,
		result.Config.TrainingWindow,
		result.Config.TrainEvery,
		result.Config.MaximumModels,
		result.Config.MinimumModelsForConsensus,
		result.Config.DistanceQuantile,
		result.Threshold,
		result.Config.warmupDuration(),
		result.Train.EventRecall,
		result.Train.EventPrecision,
		result.Train.EventF1,
		result.Train.FalsePositiveEventsPerSeriesDay,
		result.Train.FalsePositiveEvents,
		result.Train.MedianDetectionDelayMinutes,
		result.Train.P95DetectionDelayMinutes,
	)
}

func formatNetdataTuneSummary(
	result netdataTuneResult,
) string {
	return fmt.Sprintf(
		"diff=%d smooth=%d lag=%d training_window=%s train_every=%s maximum_models=%d minimum_models=%d quantile=%.3f threshold=%.1f warmup=%s series=%d windows=%d detected=%d missed=%d recall=%.4f precision=%.4f f1=%.4f fp_events=%d fp_per_series_day=%.4f median_delay=%.2f p95_delay=%.2f runtime=%s",
		result.Config.DiffN,
		result.Config.SmoothN,
		result.Config.LagN,
		result.Config.TrainingWindow,
		result.Config.TrainEvery,
		result.Config.MaximumModels,
		result.Config.MinimumModelsForConsensus,
		result.Config.DistanceQuantile,
		result.Threshold,
		result.Config.warmupDuration(),
		result.Train.EvaluatedSeries,
		result.Train.TotalWindows,
		result.Train.DetectedWindows,
		result.Train.MissedWindows,
		result.Train.EventRecall,
		result.Train.EventPrecision,
		result.Train.EventF1,
		result.Train.FalsePositiveEvents,
		result.Train.FalsePositiveEventsPerSeriesDay,
		result.Train.MedianDetectionDelayMinutes,
		result.Train.P95DetectionDelayMinutes,
		result.Train.Runtime.Round(time.Millisecond),
	)
}
