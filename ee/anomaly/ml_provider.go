package anomaly

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"slices"
	"sort"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/querier"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	mlCriticalMass       = 256
	mlMaximumSamples     = 2048
	mlKMeansIterations   = 32
	mlLearningScoreLimit = 3.5
	mlMaximumScore       = 100.0
	mlMinimumScale       = 1e-9
)

type mlEnsembleAggregation string

const (
	mlAggregationMedian   mlEnsembleAggregation = "median"
	mlAggregationP75      mlEnsembleAggregation = "p75"
	mlAggregationTop2Mean mlEnsembleAggregation = "top2_mean"
)

type mlAlgorithmMode string

const (
	mlAlgorithmRawEnsemble     mlAlgorithmMode = "raw_ensemble"
	mlAlgorithmNetdataTemporal mlAlgorithmMode = "netdata_temporal"
)

type mlConfig struct {
	AlgorithmMode                    mlAlgorithmMode
	CriticalMass                     int
	MaximumSamples                   int
	KMeansIterations                 int
	LearningScoreLimit               float64
	MaximumScore                     float64
	MinimumScale                     float64
	TrainingWindows                  []int
	ClusterCounts                    []int
	ScaleFloorFactor                 float64
	Aggregation                      mlEnsembleAggregation
	NetdataDiffN                     int
	NetdataSmoothN                   int
	NetdataLagN                      int
	NetdataTrainingWindow            time.Duration
	NetdataTrainEvery                time.Duration
	NetdataMaximumModels             int
	NetdataMinimumModelsForConsensus int
	NetdataDistanceQuantile          float64
}

var defaultMLConfig = mlConfig{
	AlgorithmMode:      mlAlgorithmRawEnsemble,
	CriticalMass:       mlCriticalMass,
	MaximumSamples:     mlMaximumSamples,
	KMeansIterations:   mlKMeansIterations,
	LearningScoreLimit: mlLearningScoreLimit,
	MaximumScore:       mlMaximumScore,
	MinimumScale:       mlMinimumScale,
	TrainingWindows: []int{
		256,
		512,
		1024,
	},
	ClusterCounts: []int{
		2,
		3,
		4,
	},
	ScaleFloorFactor:                 0.05,
	Aggregation:                      mlAggregationMedian,
	NetdataDiffN:                     1,
	NetdataSmoothN:                   3,
	NetdataLagN:                      5,
	NetdataTrainingWindow:            6 * time.Hour,
	NetdataTrainEvery:                3 * time.Hour,
	NetdataMaximumModels:             18,
	NetdataMinimumModelsForConsensus: 1,
	NetdataDistanceQuantile:          0.99,
}

type MLProvider struct {
	baseProvider Provider
	querier      querier.Querier
	logger       *slog.Logger

	mu     sync.Mutex
	series map[string]*mlSeriesState
	config mlConfig
}

type mlSeriesState struct {
	values                 []float64
	lastTimestamp          int64
	temporalRawHistory     []mlTimedValue
	temporalFeatureHistory []temporalFeaturePoint
	temporalModels         []temporalKMeansModel
	lastTrainingTimestamp  int64
	expectedInterval       int64
	featureContext         temporalFeatureContext
	lastConsensusRatio     float64
	lastUnanimous          bool
	lastFeatureSize        int
}

type kMeansModel struct {
	centroids []float64
	scales    []float64
}

type mlTimedValue struct {
	Timestamp int64
	Value     float64
}

type mlFeatureVector []float64

type temporalFeaturePoint struct {
	Timestamp int64
	Vector    mlFeatureVector
	SegmentID int
}

type temporalFeatureContext struct {
	HasLastRawValue bool
	LastRawValue    float64
	RecentRawValues []float64
	RecentDiffs     []float64
	RecentSmooths   []float64
	SegmentID       int
}

type temporalKMeansModel struct {
	centers        []mlFeatureVector
	distanceCutoff float64
	trainedAt      time.Time
	windowStart    time.Time
	windowEnd      time.Time
	segmentID      int
}

var _ Provider = (*MLProvider)(nil)

func NewMLProvider(
	baseProvider Provider,
	querier querier.Querier,
	logger *slog.Logger,
) *MLProvider {
	return newMLProviderWithConfig(
		baseProvider,
		querier,
		logger,
		defaultMLConfig,
	)
}

func newMLProviderWithConfig(
	baseProvider Provider,
	querier querier.Querier,
	logger *slog.Logger,
	config mlConfig,
) *MLProvider {
	if logger == nil {
		logger = slog.Default()
	}

	return &MLProvider{
		baseProvider: baseProvider,
		querier:      querier,
		logger:       logger,
		series:       make(map[string]*mlSeriesState),
		config:       normalizeMLConfig(config),
	}
}

func (provider *MLProvider) GetAnomalies(
	ctx context.Context,
	orgID valuer.UUID,
	request *AnomaliesRequest,
) (*AnomaliesResponse, error) {
	if request == nil {
		return nil, fmt.Errorf("anomalies request is required")
	}

	if request.Params == nil {
		return nil, fmt.Errorf("anomaly query parameters are required")
	}

	if provider.baseProvider == nil {
		return nil, fmt.Errorf("base anomaly provider is required")
	}

	requestCopy := *request

	response, err := provider.baseProvider.GetAnomalies(
		ctx,
		orgID,
		&requestCopy,
	)
	if err != nil {
		return nil, fmt.Errorf("run base anomaly provider: %w", err)
	}

	provider.applyMLScores(ctx, response)

	return response, nil
}

func (provider *MLProvider) applyMLScores(
	ctx context.Context,
	response *AnomaliesResponse,
) {
	if response == nil {
		return
	}

	provider.mu.Lock()
	defer provider.mu.Unlock()

	for _, result := range response.Results {
		if result == nil {
			continue
		}

		for aggregationIndex, aggregation := range result.Aggregations {
			if aggregation == nil {
				continue
			}

			seriesCount := min(
				len(aggregation.Series),
				len(aggregation.AnomalyScores),
			)

			for seriesIndex := 0; seriesIndex < seriesCount; seriesIndex++ {
				metricSeries := aggregation.Series[seriesIndex]
				scoreSeries := aggregation.AnomalyScores[seriesIndex]

				if metricSeries == nil || scoreSeries == nil {
					continue
				}

				key := mlSeriesKey(
					result.QueryName,
					aggregationIndex,
					seriesIndex,
					metricSeries,
				)

				state := provider.series[key]
				if state == nil {
					state = &mlSeriesState{
						values: make(
							[]float64,
							0,
							provider.config.CriticalMass,
						),
					}

					provider.series[key] = state
				}

				samplesBefore := len(state.values)
				mode := "zscore_warmup"
				modelCount := 0

				valueCount := min(
					len(metricSeries.Values),
					len(scoreSeries.Values),
				)

				for valueIndex := 0; valueIndex < valueCount; valueIndex++ {
					metricValue := metricSeries.Values[valueIndex]
					scoreValue := scoreSeries.Values[valueIndex]

					if metricValue == nil || scoreValue == nil {
						continue
					}

					fallbackScore := scoreValue.Value
					finalScore, sampleMode, sampleModels :=
						provider.scoreSinglePointLocked(
							key,
							metricValue.Timestamp,
							metricValue.Value,
							fallbackScore,
						)
					scoreValue.Value = finalScore
					mode = sampleMode
					modelCount = sampleModels
				}

				provider.logger.InfoContext(
					ctx,
					"running ML anomaly provider",
					slog.String(
						"ml.implementation",
						mode,
					),
					slog.Int(
						"ml.samples_before",
						samplesBefore,
					),
					slog.Int(
						"ml.samples_after",
						len(state.values),
					),
					slog.Int(
						"ml.models",
						modelCount,
					),
					slog.String(
						"ml.series",
						key,
					),
					slog.Int(
						"ml.models_available",
						len(state.temporalModels),
					),
					slog.Int(
						"ml.models_required",
						provider.config.NetdataMinimumModelsForConsensus,
					),
					slog.Float64(
						"ml.consensus_ratio",
						state.lastConsensusRatio,
					),
					slog.Bool(
						"ml.unanimous",
						state.lastUnanimous,
					),
					slog.Int(
						"ml.feature_size",
						state.lastFeatureSize,
					),
					slog.Duration(
						"ml.training_window",
						provider.config.NetdataTrainingWindow,
					),
					slog.Duration(
						"ml.train_every",
						provider.config.NetdataTrainEvery,
					),
				)
			}
		}
	}
}

func mlSeriesKey(
	queryName string,
	aggregationIndex int,
	seriesIndex int,
	series *qbtypes.TimeSeries,
) string {
	labelsKey := qbtypes.GetUniqueSeriesKey(
		series.Labels,
	)

	if labelsKey == "" {
		labelsKey = fmt.Sprintf(
			"series_index=%d",
			seriesIndex,
		)
	}

	return fmt.Sprintf(
		"%s|%d|%s",
		queryName,
		aggregationIndex,
		labelsKey,
	)
}

func shouldLearnMLSample(
	value *qbtypes.TimeSeriesValue,
	score float64,
	config mlConfig,
) bool {
	if value == nil ||
		value.Partial ||
		!isFinite(value.Value) {
		return false
	}

	if !isFinite(score) {
		return true
	}

	return math.Abs(score) <
		config.LearningScoreLimit
}

func trimMLHistory(
	state *mlSeriesState,
	config mlConfig,
) {
	if len(state.values) <= config.MaximumSamples {
		return
	}

	start :=
		len(state.values) -
			config.MaximumSamples

	state.values = slices.Clone(
		state.values[start:],
	)
}

func buildKMeansEnsemble(
	values []float64,
	config mlConfig,
) []kMeansModel {
	if len(values) < config.CriticalMass {
		return nil
	}

	models := make(
		[]kMeansModel,
		0,
		len(config.TrainingWindows)*
			len(config.ClusterCounts),
	)

	for _, window := range config.TrainingWindows {
		if len(values) < window {
			continue
		}

		trainingValues :=
			values[len(values)-window:]

		for _, clusterCount := range config.ClusterCounts {
			model, ok := fitKMeans1D(
				trainingValues,
				clusterCount,
				config,
			)

			if ok {
				models = append(
					models,
					model,
				)
			}
		}
	}

	return models
}

func fitKMeans1D(
	values []float64,
	clusterCount int,
	config mlConfig,
) (kMeansModel, bool) {
	if clusterCount < 1 ||
		len(values) < clusterCount {
		return kMeansModel{}, false
	}

	cleanValues := make(
		[]float64,
		0,
		len(values),
	)

	for _, value := range values {
		if isFinite(value) {
			cleanValues = append(
				cleanValues,
				value,
			)
		}
	}

	if len(cleanValues) < clusterCount {
		return kMeansModel{}, false
	}

	sortedValues := slices.Clone(
		cleanValues,
	)

	sort.Float64s(sortedValues)

	centroids := make(
		[]float64,
		clusterCount,
	)

	for clusterIndex := range centroids {
		quantileIndex :=
			(2*clusterIndex + 1) *
				len(sortedValues) /
				(2 * clusterCount)

		if quantileIndex >= len(sortedValues) {
			quantileIndex =
				len(sortedValues) - 1
		}

		centroids[clusterIndex] =
			sortedValues[quantileIndex]
	}

	for iteration := 0; iteration < config.KMeansIterations; iteration++ {
		sums := make(
			[]float64,
			clusterCount,
		)

		counts := make(
			[]int,
			clusterCount,
		)

		for _, value := range cleanValues {
			clusterIndex := nearestCentroid(
				value,
				centroids,
			)

			sums[clusterIndex] += value
			counts[clusterIndex]++
		}

		maxMovement := 0.0

		for clusterIndex := range centroids {
			if counts[clusterIndex] == 0 {
				continue
			}

			updated :=
				sums[clusterIndex] /
					float64(
						counts[clusterIndex],
					)

			movement := math.Abs(
				updated -
					centroids[clusterIndex],
			)

			if movement > maxMovement {
				maxMovement = movement
			}

			centroids[clusterIndex] =
				updated
		}

		if maxMovement < config.MinimumScale {
			break
		}
	}

	globalScale := standardDeviation(
		cleanValues,
	)

	scaleFloor := math.Max(
		globalScale*config.ScaleFloorFactor,
		config.MinimumScale,
	)

	squaredDistances := make(
		[]float64,
		clusterCount,
	)

	counts := make(
		[]int,
		clusterCount,
	)

	for _, value := range cleanValues {
		clusterIndex := nearestCentroid(
			value,
			centroids,
		)

		difference :=
			value -
				centroids[clusterIndex]

		squaredDistances[clusterIndex] +=
			difference * difference

		counts[clusterIndex]++
	}

	scales := make(
		[]float64,
		clusterCount,
	)

	for clusterIndex := range scales {
		if counts[clusterIndex] < 2 {
			scales[clusterIndex] =
				scaleFloor

			continue
		}

		scale := math.Sqrt(
			squaredDistances[clusterIndex] /
				float64(
					counts[clusterIndex],
				),
		)

		scales[clusterIndex] = math.Max(
			scale,
			scaleFloor,
		)
	}

	return kMeansModel{
		centroids: centroids,
		scales:    scales,
	}, true
}

func scoreKMeansEnsemble(
	models []kMeansModel,
	value float64,
	fallbackScore float64,
	config mlConfig,
) float64 {
	if len(models) == 0 ||
		!isFinite(value) {
		return fallbackScore
	}

	signedScores := make(
		[]float64,
		0,
		len(models),
	)

	absoluteScores := make(
		[]float64,
		0,
		len(models),
	)

	for _, model := range models {
		clusterIndex := nearestCentroid(
			value,
			model.centroids,
		)

		scale := model.scales[clusterIndex]

		if scale < config.MinimumScale {
			scale = config.MinimumScale
		}

		score :=
			(value -
				model.centroids[clusterIndex]) /
				scale

		if !isFinite(score) {
			continue
		}

		signedScores = append(
			signedScores,
			score,
		)

		absoluteScores = append(
			absoluteScores,
			math.Abs(score),
		)
	}

	if len(absoluteScores) == 0 {
		return fallbackScore
	}

	magnitude := aggregateMLAbsoluteScores(
		absoluteScores,
		config.Aggregation,
	)

	direction := 1.0

	if isFinite(fallbackScore) &&
		fallbackScore != 0 {
		direction = math.Copysign(
			1,
			fallbackScore,
		)
	} else if aggregateMLSignedScores(
		signedScores,
		config.Aggregation,
	) < 0 {
		direction = -1
	}

	return direction * math.Min(
		magnitude,
		config.MaximumScore,
	)
}

func normalizeMLConfig(
	config mlConfig,
) mlConfig {
	normalized := config

	switch normalized.AlgorithmMode {
	case mlAlgorithmRawEnsemble,
		mlAlgorithmNetdataTemporal:
	default:
		normalized.AlgorithmMode = defaultMLConfig.AlgorithmMode
	}

	if normalized.CriticalMass <= 0 {
		normalized.CriticalMass = defaultMLConfig.CriticalMass
	}

	if normalized.MaximumSamples <= 0 {
		normalized.MaximumSamples = defaultMLConfig.MaximumSamples
	}

	if normalized.KMeansIterations <= 0 {
		normalized.KMeansIterations = defaultMLConfig.KMeansIterations
	}

	if normalized.LearningScoreLimit <= 0 {
		normalized.LearningScoreLimit =
			defaultMLConfig.LearningScoreLimit
	}

	if normalized.MaximumScore <= 0 {
		normalized.MaximumScore = defaultMLConfig.MaximumScore
	}

	if normalized.MinimumScale <= 0 {
		normalized.MinimumScale = defaultMLConfig.MinimumScale
	}

	if len(normalized.TrainingWindows) == 0 {
		normalized.TrainingWindows = slices.Clone(
			defaultMLConfig.TrainingWindows,
		)
	} else {
		normalized.TrainingWindows = slices.Clone(
			normalized.TrainingWindows,
		)
	}

	if len(normalized.ClusterCounts) == 0 {
		normalized.ClusterCounts = slices.Clone(
			defaultMLConfig.ClusterCounts,
		)
	} else {
		normalized.ClusterCounts = slices.Clone(
			normalized.ClusterCounts,
		)
	}

	if normalized.ScaleFloorFactor <= 0 {
		normalized.ScaleFloorFactor =
			defaultMLConfig.ScaleFloorFactor
	}

	switch normalized.Aggregation {
	case mlAggregationMedian,
		mlAggregationP75,
		mlAggregationTop2Mean:
	default:
		normalized.Aggregation =
			defaultMLConfig.Aggregation
	}

	if normalized.NetdataDiffN <= 0 {
		normalized.NetdataDiffN = defaultMLConfig.NetdataDiffN
	}

	if normalized.NetdataSmoothN <= 0 {
		normalized.NetdataSmoothN = defaultMLConfig.NetdataSmoothN
	}

	if normalized.NetdataLagN <= 0 {
		normalized.NetdataLagN = defaultMLConfig.NetdataLagN
	}

	if normalized.NetdataTrainingWindow <= 0 {
		normalized.NetdataTrainingWindow =
			defaultMLConfig.NetdataTrainingWindow
	}

	if normalized.NetdataTrainEvery <= 0 {
		normalized.NetdataTrainEvery =
			defaultMLConfig.NetdataTrainEvery
	}

	if normalized.NetdataMaximumModels <= 0 {
		normalized.NetdataMaximumModels =
			defaultMLConfig.NetdataMaximumModels
	}

	if normalized.NetdataMinimumModelsForConsensus <= 0 {
		normalized.NetdataMinimumModelsForConsensus =
			defaultMLConfig.NetdataMinimumModelsForConsensus
	}

	if normalized.NetdataDistanceQuantile <= 0 ||
		normalized.NetdataDistanceQuantile > 1 {
		normalized.NetdataDistanceQuantile =
			defaultMLConfig.NetdataDistanceQuantile
	}

	return normalized
}

func (provider *MLProvider) scoreSinglePointForSeries(
	seriesKey string,
	timestamp int64,
	value float64,
	fallbackScore float64,
) float64 {
	provider.mu.Lock()
	defer provider.mu.Unlock()

	finalScore, _, _ := provider.scoreSinglePointLocked(
		seriesKey,
		timestamp,
		value,
		fallbackScore,
	)

	return finalScore
}

func (provider *MLProvider) scoreSinglePointLocked(
	seriesKey string,
	timestamp int64,
	value float64,
	fallbackScore float64,
) (float64, string, int) {
	switch provider.config.AlgorithmMode {
	case mlAlgorithmNetdataTemporal:
		return provider.scoreTemporalPointLocked(
			seriesKey,
			timestamp,
			value,
			fallbackScore,
		)
	default:
		return provider.scoreRawPointLocked(
			seriesKey,
			timestamp,
			value,
			fallbackScore,
		)
	}
}

func (provider *MLProvider) scoreRawPointLocked(
	seriesKey string,
	timestamp int64,
	value float64,
	fallbackScore float64,
) (float64, string, int) {
	state := provider.series[seriesKey]
	if state == nil {
		state = &mlSeriesState{
			values: make(
				[]float64,
				0,
				provider.config.CriticalMass,
			),
		}

		provider.series[seriesKey] = state
	}

	state.lastConsensusRatio = 0
	state.lastUnanimous = false
	state.lastFeatureSize = 0

	models := buildKMeansEnsemble(
		state.values,
		provider.config,
	)

	finalScore := fallbackScore
	if len(models) > 0 && isFinite(value) {
		finalScore = scoreKMeansEnsemble(
			models,
			value,
			fallbackScore,
			provider.config,
		)
	}

	if timestamp <= state.lastTimestamp {
		mode := "zscore_warmup"
		if len(models) > 0 {
			mode = "kmeans_ensemble"
		}
		return finalScore, mode, len(models)
	}

	state.lastTimestamp = timestamp

	metricValue := &qbtypes.TimeSeriesValue{
		Timestamp: timestamp,
		Value:     value,
	}

	if shouldLearnMLSample(
		metricValue,
		finalScore,
		provider.config,
	) {
		state.values = append(
			state.values,
			value,
		)

		trimMLHistory(
			state,
			provider.config,
		)
	}

	mode := "zscore_warmup"
	if len(models) > 0 {
		mode = "kmeans_ensemble"
	}

	return finalScore, mode, len(models)
}

func (provider *MLProvider) scoreTemporalPointLocked(
	seriesKey string,
	timestamp int64,
	value float64,
	fallbackScore float64,
) (float64, string, int) {
	state := provider.series[seriesKey]
	if state == nil {
		state = &mlSeriesState{}
		provider.series[seriesKey] = state
	}

	if timestamp <= state.lastTimestamp {
		return fallbackScore, "netdata_temporal_kmeans", len(state.temporalModels)
	}

	state.lastTimestamp = timestamp
	appendTemporalRawValue(
		state,
		timestamp,
		value,
		provider.config,
	)

	feature, featureReady := appendTemporalFeature(
		state,
		timestamp,
		value,
		provider.config,
	)

	state.lastFeatureSize = 0
	state.lastConsensusRatio = 0
	state.lastUnanimous = false
	if featureReady {
		state.lastFeatureSize = len(feature.Vector)
	}

	provider.maybeTrainTemporalModel(
		state,
		timestamp,
	)

	if !featureReady ||
		len(state.temporalModels) <
			provider.config.NetdataMinimumModelsForConsensus {
		return fallbackScore,
			"netdata_temporal_kmeans",
			len(state.temporalModels)
	}

	consensusRatio, unanimous := scoreTemporalConsensus(
		state.temporalModels,
		feature.Vector,
		provider.config,
	)

	state.lastConsensusRatio = consensusRatio
	state.lastUnanimous = unanimous

	if !unanimous || consensusRatio <= 1 {
		return 0, "netdata_temporal_kmeans", len(state.temporalModels)
	}

	direction := 1.0
	if isFinite(fallbackScore) && fallbackScore != 0 {
		direction = math.Copysign(1, fallbackScore)
	} else if len(state.temporalRawHistory) >= 2 {
		previousValue :=
			state.temporalRawHistory[len(state.temporalRawHistory)-2].Value
		if value < previousValue {
			direction = -1
		}
	}

	score := direction *
		math.Min(
			4.0*consensusRatio,
			provider.config.MaximumScore,
		)

	return score, "netdata_temporal_kmeans", len(state.temporalModels)
}

func appendTemporalRawValue(
	state *mlSeriesState,
	timestamp int64,
	value float64,
	config mlConfig,
) {
	state.temporalRawHistory = append(
		state.temporalRawHistory,
		mlTimedValue{
			Timestamp: timestamp,
			Value:     value,
		},
	)

	cutoffTimestamp :=
		timestamp -
			int64(
				(config.NetdataTrainingWindow +
					time.Duration(config.NetdataMaximumModels+2)*
						config.NetdataTrainEvery).Milliseconds(),
			)

	trimIndex := 0
	for trimIndex < len(state.temporalRawHistory) &&
		state.temporalRawHistory[trimIndex].Timestamp < cutoffTimestamp {
		trimIndex++
	}

	if trimIndex > 0 {
		state.temporalRawHistory = slices.Clone(
			state.temporalRawHistory[trimIndex:],
		)
	}
}

func appendTemporalFeature(
	state *mlSeriesState,
	timestamp int64,
	value float64,
	config mlConfig,
) (temporalFeaturePoint, bool) {
	if state.expectedInterval == 0 &&
		len(state.temporalRawHistory) >= 2 {
		state.expectedInterval =
			state.temporalRawHistory[len(state.temporalRawHistory)-1].Timestamp -
				state.temporalRawHistory[len(state.temporalRawHistory)-2].Timestamp
	}

	if state.featureContext.HasLastRawValue &&
		state.expectedInterval > 0 {
		gap := timestamp -
			state.temporalRawHistory[len(state.temporalRawHistory)-2].Timestamp
		if gap*2 > state.expectedInterval*3 {
			resetTemporalFeatureContext(state)
		}
	}

	if !state.featureContext.HasLastRawValue {
		state.featureContext.HasLastRawValue = true
		state.featureContext.LastRawValue = value
		state.featureContext.RecentRawValues = append(
			state.featureContext.RecentRawValues,
			value,
		)
		return temporalFeaturePoint{}, false
	}

	state.featureContext.LastRawValue = value
	state.featureContext.RecentRawValues = append(
		state.featureContext.RecentRawValues,
		value,
	)
	requiredRawValues := config.NetdataDiffN + 1
	if len(state.featureContext.RecentRawValues) > requiredRawValues {
		state.featureContext.RecentRawValues =
			state.featureContext.RecentRawValues[len(state.featureContext.RecentRawValues)-requiredRawValues:]
	}

	if len(state.featureContext.RecentRawValues) < requiredRawValues {
		return temporalFeaturePoint{}, false
	}

	diff := value -
		state.featureContext.RecentRawValues[len(state.featureContext.RecentRawValues)-1-config.NetdataDiffN]
	state.featureContext.RecentDiffs = append(
		state.featureContext.RecentDiffs,
		diff,
	)
	if len(state.featureContext.RecentDiffs) > config.NetdataSmoothN {
		state.featureContext.RecentDiffs =
			state.featureContext.RecentDiffs[len(state.featureContext.RecentDiffs)-config.NetdataSmoothN:]
	}

	if len(state.featureContext.RecentDiffs) < config.NetdataSmoothN {
		return temporalFeaturePoint{}, false
	}

	smoothed := meanFloat64s(
		state.featureContext.RecentDiffs,
	)
	state.featureContext.RecentSmooths = append(
		state.featureContext.RecentSmooths,
		smoothed,
	)

	requiredSmooths := config.NetdataLagN + 1
	if len(state.featureContext.RecentSmooths) > requiredSmooths {
		state.featureContext.RecentSmooths =
			state.featureContext.RecentSmooths[len(state.featureContext.RecentSmooths)-requiredSmooths:]
	}

	if len(state.featureContext.RecentSmooths) < requiredSmooths {
		return temporalFeaturePoint{}, false
	}

	vector := make(
		mlFeatureVector,
		0,
		requiredSmooths,
	)

	for index := len(state.featureContext.RecentSmooths) - 1; index >= 0; index-- {
		value := state.featureContext.RecentSmooths[index]
		if !isFinite(value) {
			return temporalFeaturePoint{}, false
		}

		vector = append(vector, value)
	}

	feature := temporalFeaturePoint{
		Timestamp: timestamp,
		Vector:    vector,
		SegmentID: state.featureContext.SegmentID,
	}

	state.temporalFeatureHistory = append(
		state.temporalFeatureHistory,
		feature,
	)

	cutoffTimestamp :=
		timestamp -
			int64(
				(config.NetdataTrainingWindow +
					time.Duration(config.NetdataMaximumModels+2)*
						config.NetdataTrainEvery).Milliseconds(),
			)
	trimIndex := 0
	for trimIndex < len(state.temporalFeatureHistory) &&
		state.temporalFeatureHistory[trimIndex].Timestamp < cutoffTimestamp {
		trimIndex++
	}

	if trimIndex > 0 {
		state.temporalFeatureHistory =
			state.temporalFeatureHistory[trimIndex:]
	}

	return feature, true
}

func resetTemporalFeatureContext(
	state *mlSeriesState,
) {
	state.featureContext = temporalFeatureContext{
		SegmentID: state.featureContext.SegmentID + 1,
	}
}

func meanFloat64s(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}

	total := 0.0
	for _, value := range values {
		total += value
	}

	return total / float64(len(values))
}

func calculateTemporalDifferences(
	rawValues []float64,
	diffN int,
) []float64 {
	if diffN <= 0 || len(rawValues) <= diffN {
		return nil
	}

	differences := make([]float64, 0, len(rawValues)-diffN)
	for index := diffN; index < len(rawValues); index++ {
		differences = append(
			differences,
			rawValues[index]-rawValues[index-diffN],
		)
	}

	return differences
}

func calculateTemporalSmoothing(
	differences []float64,
	smoothN int,
) []float64 {
	if smoothN <= 0 || len(differences) < smoothN {
		return nil
	}

	smoothed := make([]float64, 0, len(differences)-smoothN+1)
	for end := smoothN; end <= len(differences); end++ {
		smoothed = append(
			smoothed,
			meanFloat64s(differences[end-smoothN:end]),
		)
	}

	return smoothed
}

func buildTemporalLagFeatures(
	smoothed []float64,
	lagN int,
) []mlFeatureVector {
	required := lagN + 1
	if lagN < 0 || len(smoothed) < required {
		return nil
	}

	features := make([]mlFeatureVector, 0, len(smoothed)-required+1)
	for end := required; end <= len(smoothed); end++ {
		vector := make(mlFeatureVector, 0, required)
		for index := end - 1; index >= end-required; index-- {
			vector = append(vector, smoothed[index])
		}
		features = append(features, vector)
	}

	return features
}

func (provider *MLProvider) maybeTrainTemporalModel(
	state *mlSeriesState,
	timestamp int64,
) {
	if len(state.temporalFeatureHistory) == 0 {
		return
	}

	if state.lastTrainingTimestamp > 0 &&
		timestamp-state.lastTrainingTimestamp <
			provider.config.NetdataTrainEvery.Milliseconds() {
		return
	}

	latestFeature :=
		state.temporalFeatureHistory[len(state.temporalFeatureHistory)-1]

	windowStartTimestamp :=
		timestamp -
			provider.config.NetdataTrainingWindow.Milliseconds()

	trainingPoints := make(
		[]temporalFeaturePoint,
		0,
		len(state.temporalFeatureHistory),
	)

	for _, feature := range state.temporalFeatureHistory {
		if feature.SegmentID != latestFeature.SegmentID {
			continue
		}

		if feature.Timestamp < windowStartTimestamp ||
			feature.Timestamp > timestamp {
			continue
		}

		trainingPoints = append(
			trainingPoints,
			feature,
		)
	}

	if len(trainingPoints) < 2 {
		return
	}

	model, ok := fitTemporalKMeansModel(
		trainingPoints,
		provider.config,
	)
	if !ok {
		return
	}

	state.temporalModels = append(
		state.temporalModels,
		model,
	)
	if len(state.temporalModels) >
		provider.config.NetdataMaximumModels {
		state.temporalModels =
			state.temporalModels[len(state.temporalModels)-provider.config.NetdataMaximumModels:]
	}

	state.lastTrainingTimestamp = timestamp
}

func fitTemporalKMeansModel(
	trainingPoints []temporalFeaturePoint,
	config mlConfig,
) (temporalKMeansModel, bool) {
	vectors := make(
		[]mlFeatureVector,
		0,
		len(trainingPoints),
	)

	for _, point := range trainingPoints {
		if !isFiniteFeatureVector(point.Vector) {
			continue
		}

		vectors = append(
			vectors,
			point.Vector,
		)
	}

	centers, ok := fitKMeansND(
		vectors,
		2,
		config.KMeansIterations,
		config.MinimumScale,
	)
	if !ok {
		return temporalKMeansModel{}, false
	}

	distances := make(
		[]float64,
		0,
		len(vectors),
	)
	for _, vector := range vectors {
		distances = append(
			distances,
			nearestCenterDistance(
				vector,
				centers,
			),
		)
	}

	if len(distances) == 0 {
		return temporalKMeansModel{}, false
	}

	cutoff := percentileLinearInterpolation(
		distances,
		config.NetdataDistanceQuantile,
	)
	if cutoff < config.MinimumScale {
		cutoff = config.MinimumScale
	}

	return temporalKMeansModel{
		centers:        centers,
		distanceCutoff: cutoff,
		trainedAt: time.UnixMilli(
			trainingPoints[len(trainingPoints)-1].Timestamp,
		),
		windowStart: time.UnixMilli(
			trainingPoints[0].Timestamp,
		),
		windowEnd: time.UnixMilli(
			trainingPoints[len(trainingPoints)-1].Timestamp,
		),
		segmentID: trainingPoints[len(trainingPoints)-1].SegmentID,
	}, true
}

func fitKMeansND(
	vectors []mlFeatureVector,
	clusterCount int,
	iterations int,
	minimumScale float64,
) ([]mlFeatureVector, bool) {
	if clusterCount < 1 || len(vectors) < clusterCount {
		return nil, false
	}

	dimension := len(vectors[0])
	if dimension == 0 {
		return nil, false
	}

	sortedVectors := slices.Clone(vectors)
	sort.Slice(sortedVectors, func(left, right int) bool {
		return compareFeatureVectorsLexicographically(
			sortedVectors[left],
			sortedVectors[right],
		) < 0
	})

	centers := make([]mlFeatureVector, clusterCount)
	for clusterIndex := range centers {
		quantileIndex :=
			(2*clusterIndex + 1) *
				len(sortedVectors) /
				(2 * clusterCount)
		if quantileIndex >= len(sortedVectors) {
			quantileIndex = len(sortedVectors) - 1
		}

		centers[clusterIndex] = slices.Clone(
			sortedVectors[quantileIndex],
		)
	}

	for iteration := 0; iteration < iterations; iteration++ {
		sums := make([][]float64, clusterCount)
		counts := make([]int, clusterCount)
		for clusterIndex := range sums {
			sums[clusterIndex] = make([]float64, dimension)
		}

		for _, vector := range vectors {
			clusterIndex := nearestCenterIndex(
				vector,
				centers,
			)
			for dimensionIndex, value := range vector {
				sums[clusterIndex][dimensionIndex] += value
			}
			counts[clusterIndex]++
		}

		maxMovement := 0.0
		for clusterIndex := range centers {
			if counts[clusterIndex] == 0 {
				continue
			}

			updated := make(mlFeatureVector, dimension)
			for dimensionIndex := range updated {
				updated[dimensionIndex] =
					sums[clusterIndex][dimensionIndex] /
						float64(counts[clusterIndex])
			}

			movement := euclideanDistance(
				updated,
				centers[clusterIndex],
			)
			if movement > maxMovement {
				maxMovement = movement
			}
			centers[clusterIndex] = updated
		}

		if maxMovement < minimumScale {
			break
		}
	}

	return centers, true
}

func scoreTemporalConsensus(
	models []temporalKMeansModel,
	vector mlFeatureVector,
	config mlConfig,
) (float64, bool) {
	if len(models) == 0 {
		return 0, false
	}

	consensusRatio := math.Inf(1)
	unanimous := true
	for _, model := range models {
		ratio := temporalModelRatio(
			model,
			vector,
			config.MinimumScale,
		)
		if ratio < consensusRatio {
			consensusRatio = ratio
		}
		if ratio <= 1 {
			unanimous = false
		}
	}

	if !isFinite(consensusRatio) {
		return 0, false
	}

	return consensusRatio, unanimous
}

func temporalModelRatio(
	model temporalKMeansModel,
	vector mlFeatureVector,
	minimumScale float64,
) float64 {
	distance := nearestCenterDistance(
		vector,
		model.centers,
	)
	cutoff := model.distanceCutoff
	if cutoff <= minimumScale {
		cutoff = minimumScale
	}

	return distance / cutoff
}

func nearestCenterDistance(
	vector mlFeatureVector,
	centers []mlFeatureVector,
) float64 {
	if len(centers) == 0 {
		return 0
	}

	return euclideanDistance(
		vector,
		centers[nearestCenterIndex(vector, centers)],
	)
}

func nearestCenterIndex(
	vector mlFeatureVector,
	centers []mlFeatureVector,
) int {
	nearestIndex := 0
	nearestDistance := math.Inf(1)
	for centerIndex, center := range centers {
		distance := euclideanDistance(
			vector,
			center,
		)
		if distance < nearestDistance {
			nearestDistance = distance
			nearestIndex = centerIndex
		}
	}

	return nearestIndex
}

func euclideanDistance(
	left []float64,
	right []float64,
) float64 {
	limit := min(len(left), len(right))
	sum := 0.0
	for index := 0; index < limit; index++ {
		difference := left[index] - right[index]
		sum += difference * difference
	}

	return math.Sqrt(sum)
}

func isFiniteFeatureVector(
	vector mlFeatureVector,
) bool {
	if len(vector) == 0 {
		return false
	}

	for _, value := range vector {
		if !isFinite(value) {
			return false
		}
	}

	return true
}

func compareFeatureVectorsLexicographically(
	left []float64,
	right []float64,
) int {
	limit := min(len(left), len(right))
	for index := 0; index < limit; index++ {
		switch {
		case left[index] < right[index]:
			return -1
		case left[index] > right[index]:
			return 1
		}
	}

	switch {
	case len(left) < len(right):
		return -1
	case len(left) > len(right):
		return 1
	default:
		return 0
	}
}

func percentileLinearInterpolation(
	values []float64,
	percentile float64,
) float64 {
	if len(values) == 0 {
		return 0
	}

	if len(values) == 1 {
		return values[0]
	}

	sortedValues := slices.Clone(values)
	sort.Float64s(sortedValues)

	position := percentile * float64(len(sortedValues)-1)
	leftIndex := int(math.Floor(position))
	rightIndex := int(math.Ceil(position))
	if leftIndex == rightIndex {
		return sortedValues[leftIndex]
	}

	fraction := position - float64(leftIndex)
	return sortedValues[leftIndex] +
		fraction*
			(sortedValues[rightIndex]-sortedValues[leftIndex])
}

func aggregateMLAbsoluteScores(
	absoluteScores []float64,
	aggregation mlEnsembleAggregation,
) float64 {
	switch aggregation {
	case mlAggregationP75:
		return percentileNearestRank(
			absoluteScores,
			0.75,
		)
	case mlAggregationTop2Mean:
		return topNMean(
			absoluteScores,
			2,
		)
	default:
		return median(absoluteScores)
	}
}

func aggregateMLSignedScores(
	signedScores []float64,
	aggregation mlEnsembleAggregation,
) float64 {
	switch aggregation {
	case mlAggregationP75:
		return percentileNearestRank(
			signedScores,
			0.75,
		)
	case mlAggregationTop2Mean:
		return topNMeanByMagnitude(
			signedScores,
			2,
		)
	default:
		return median(signedScores)
	}
}

func percentileNearestRank(
	values []float64,
	percentile float64,
) float64 {
	if len(values) == 0 {
		return 0
	}

	sortedValues := slices.Clone(values)
	sort.Float64s(sortedValues)

	rank := int(math.Ceil(percentile * float64(len(sortedValues))))
	if rank < 1 {
		rank = 1
	}

	if rank > len(sortedValues) {
		rank = len(sortedValues)
	}

	return sortedValues[rank-1]
}

func topNMean(
	values []float64,
	count int,
) float64 {
	if len(values) == 0 {
		return 0
	}

	sortedValues := slices.Clone(values)
	sort.Float64s(sortedValues)

	if count > len(sortedValues) {
		count = len(sortedValues)
	}

	total := 0.0
	for index := len(sortedValues) - count; index < len(sortedValues); index++ {
		total += sortedValues[index]
	}

	return total / float64(count)
}

func topNMeanByMagnitude(
	values []float64,
	count int,
) float64 {
	if len(values) == 0 {
		return 0
	}

	sortedValues := slices.Clone(values)
	sort.Slice(sortedValues, func(
		left int,
		right int,
	) bool {
		return math.Abs(sortedValues[left]) <
			math.Abs(sortedValues[right])
	})

	if count > len(sortedValues) {
		count = len(sortedValues)
	}

	total := 0.0
	for index := len(sortedValues) - count; index < len(sortedValues); index++ {
		total += sortedValues[index]
	}

	return total / float64(count)
}

func nearestCentroid(
	value float64,
	centroids []float64,
) int {
	nearestIndex := 0
	nearestDistance := math.Inf(1)

	for centroidIndex, centroid := range centroids {
		distance := math.Abs(
			value - centroid,
		)

		if distance < nearestDistance {
			nearestDistance = distance
			nearestIndex = centroidIndex
		}
	}

	return nearestIndex
}

func standardDeviation(
	values []float64,
) float64 {
	if len(values) == 0 {
		return 0
	}

	mean := 0.0

	for _, value := range values {
		mean += value
	}

	mean /= float64(len(values))

	variance := 0.0

	for _, value := range values {
		difference :=
			value - mean

		variance +=
			difference * difference
	}

	variance /=
		float64(len(values))

	return math.Sqrt(variance)
}

func median(
	values []float64,
) float64 {
	if len(values) == 0 {
		return 0
	}

	sortedValues := slices.Clone(
		values,
	)

	sort.Float64s(sortedValues)

	middle :=
		len(sortedValues) / 2

	if len(sortedValues)%2 == 1 {
		return sortedValues[middle]
	}

	return (sortedValues[middle-1] +
		sortedValues[middle]) / 2
}

func isFinite(
	value float64,
) bool {
	return !math.IsNaN(value) &&
		!math.IsInf(value, 0)
}
