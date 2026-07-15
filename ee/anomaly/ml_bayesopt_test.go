package anomaly

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"os"
	"runtime"
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

const (
	netdataBayesDefaultSeed       int64 = 17062017
	netdataBayesSearchSpaceV1           = "netdata_bayesopt_v1"
	netdataBayesCandidatePoolSize       = 4096
)

type nabMLRunResult struct {
	Scores             []float64
	ReadyMask          []bool
	ModelsAvailable    []int
	FeatureSizes       []int
	AnomalousFractions []float64
	QuorumRatios       []float64
}

type netdataCommonAlgorithmSpec struct {
	Name      string
	Threshold float64
	Config    *mlConfig
}

type netdataCommonSeriesResult struct {
	Evaluation    nabSeriesEvaluation
	CommonPoints  []nabPoint
	CommonWindows []nabWindow
	Details       map[string]nabDetailedMetrics
	Runs          map[string]nabMLRunResult
}

type netdataCommonBenchmarkResult struct {
	Series           []netdataCommonSeriesResult
	Aggregates       map[string]nabAggregateMetrics
	CommonSeries     int
	CommonPoints     int
	CommonWindows    int
	CommonSeriesDays float64
}

type netdataBayesFoldMetrics struct {
	FoldIndex int
	Candidate nabAggregateMetrics
	Standard  nabAggregateMetrics
	Utility   float64
}

type netdataBayesEvaluation struct {
	Config               netdataTuneConfig
	Objective            float64
	MeanMetrics          nabAggregateMetrics
	MeanStandardMetrics  nabAggregateMetrics
	WorstFoldRecall      float64
	WorstFoldF1          float64
	FoldsBeatingStandard int
	Feasible             bool
	Folds                []netdataBayesFoldMetrics
}

type netdataBayesCheckpoint struct {
	ElapsedDuration time.Duration            `json:"elapsed_duration"`
	Evaluations     []netdataBayesEvaluation `json:"evaluations"`
	SearchSpace     string                   `json:"search_space"`
	Seed            int64                    `json:"seed"`
}

type netdataBayesSearchMode struct {
	Name               string
	InitialSamples     int
	BayesianIterations int
	TotalEvaluations   int
}

type netdataBayesSearchSpace struct {
	DiffN             []int
	SmoothN           []int
	LagN              []int
	TrainingWindow    []time.Duration
	TrainEvery        []time.Duration
	MaximumModels     []int
	MinimumModels     []int
	DistanceQuantile  []float64
	ConsensusFraction []float64
	RecencyHalfLife   []time.Duration
}

type gaussianProcessModel struct {
	Alpha [][]float64
	Chol  [][]float64
	X     [][]float64
	Y     []float64
}

type bayesOptimizerState struct {
	CheckpointPath string
	Mode           netdataBayesSearchMode
	SearchSpace    netdataBayesSearchSpace
	Seed           int64
}

type netdataWindowDiagnostic struct {
	SeriesKey                string
	WindowStart              time.Time
	WindowEnd                time.Time
	MaximumAnomalousFraction float64
	MaximumQuorumRatio       float64
	MaximumStandardAbsScore  float64
	ModelsAvailableAtBest    int
	FirstCandidateScore      float64
	Reason                   string
	StandardOnly             bool
}

func TestCompareNetdataQuorumOnCommonNABAWS(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	seriesKeys, err := listNABAWSSeriesKeys(nabRoot)
	if err != nil {
		t.Fatal(err)
	}

	evaluations, skipped, err := loadNABAWSSeriesEvaluations(nabRoot, seriesKeys)
	if err != nil {
		t.Fatal(err)
	}

	relaxedConfig := baselineNetdataMLConfig(6)
	relaxedConfig.NetdataMaximumModels = 32
	relaxedConfig.NetdataConsensusFraction = 0.75
	relaxedConfig.NetdataRecencyHalfLife = 24 * time.Hour

	result, err := evaluateNetdataCommonCoverageAcrossSeries(
		evaluations,
		skipped,
		[]netdataCommonAlgorithmSpec{
			{Name: "standard_zscore", Threshold: 6.0, Config: nil},
			{Name: "current_raw_kmeans", Threshold: 4.0, Config: configPtr(defaultMLConfig)},
			{Name: "netdata_unanimous_6", Threshold: 4.0, Config: configPtr(baselineNetdataMLConfig(6))},
			{Name: "netdata_relaxed_baseline", Threshold: 4.0, Config: configPtr(relaxedConfig)},
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf(
		"common_series=%d common_points=%d common_series_days=%.4f common_windows=%d",
		result.CommonSeries,
		result.CommonPoints,
		result.CommonSeriesDays,
		result.CommonWindows,
	)
	for _, series := range result.Series {
		t.Logf(
			"%s | common_points=%d | common_windows=%d | standard_f1=%.4f | raw_f1=%.4f | unanimous_f1=%.4f | relaxed_f1=%.4f",
			series.Evaluation.SeriesKey,
			len(series.CommonPoints),
			len(series.CommonWindows),
			series.Details["standard_zscore"].Summary.F1,
			series.Details["current_raw_kmeans"].Summary.F1,
			series.Details["netdata_unanimous_6"].Summary.F1,
			series.Details["netdata_relaxed_baseline"].Summary.F1,
		)
	}
	for _, name := range []string{
		"standard_zscore",
		"current_raw_kmeans",
		"netdata_unanimous_6",
		"netdata_relaxed_baseline",
	} {
		t.Logf("%s: %s", name, formatNABAggregateMetrics(result.Aggregates[name]))
	}
}

func TestBayesOptimizeNetdataAcrossNABAWS(t *testing.T) {
	nabRoot := os.Getenv("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	startedAt := time.Now()
	seed := resolveNetdataBayesSeed()
	workers := resolveNetdataBayesWorkers()
	mode := resolveNetdataBayesSearchMode()
	checkpointPath := os.Getenv("NAB_BAYESOPT_CHECKPOINT")
	searchSpace := resolveNetdataBayesSearchSpace()

	seriesKeys, err := listNABAWSSeriesKeys(nabRoot)
	if err != nil {
		t.Fatal(err)
	}

	allEvaluations, skipped, err := loadNABAWSSeriesEvaluations(nabRoot, seriesKeys)
	if err != nil {
		t.Fatal(err)
	}

	optimizationKeys, holdoutKeys := splitNABSeriesKeys(seriesKeys)
	if len(optimizationKeys) == 0 || len(holdoutKeys) == 0 {
		t.Fatal("optimization and holdout splits must not be empty")
	}

	evaluationByKey := make(map[string]nabSeriesEvaluation, len(allEvaluations))
	for _, evaluation := range allEvaluations {
		evaluationByKey[evaluation.SeriesKey] = evaluation
	}

	optimizationEvaluations := filterNABSeriesEvaluations(optimizationKeys, evaluationByKey)
	holdoutEvaluations := filterNABSeriesEvaluations(holdoutKeys, evaluationByKey)
	optimizationSkipped := filterNABSeriesSkips(optimizationKeys, skipped)
	holdoutSkipped := filterNABSeriesSkips(holdoutKeys, skipped)

	if len(optimizationEvaluations) == 0 || len(holdoutEvaluations) == 0 {
		t.Fatal("optimization and holdout evaluations must not be empty")
	}

	cvFolds := buildNetdataCVFolds(optimizationEvaluations)
	if len(cvFolds) != 3 {
		t.Fatalf("unexpected CV fold count: got %d want 3", len(cvFolds))
	}

	optimizerState := bayesOptimizerState{
		CheckpointPath: checkpointPath,
		Mode:           mode,
		SearchSpace:    searchSpace,
		Seed:           seed,
	}

	t.Logf(
		"mode=%s seed=%d workers=%d optimization_series=%d holdout_series=%d cv_folds=%d initial_samples=%d bayesian_iterations=%d total_evaluations=%d",
		mode.Name,
		seed,
		workers,
		len(optimizationEvaluations),
		len(holdoutEvaluations),
		len(cvFolds),
		mode.InitialSamples,
		mode.BayesianIterations,
		mode.TotalEvaluations,
	)
	for index, fold := range cvFolds {
		t.Logf("cv_fold_%d=%s", index, strings.Join(fold, ","))
	}

	evaluations, err := runNetdataBayesOptimization(
		t,
		optimizerState,
		cvFolds,
		evaluationByKey,
		optimizationSkipped,
		workers,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(evaluations) == 0 {
		t.Fatal("Bayesian optimization produced no evaluations")
	}

	ranked := rankNetdataBayesEvaluations(evaluations)
	topCount := min(20, len(ranked))
	t.Log("rank | objective | diff | smooth | lag | training_window | train_every | maximum_models | minimum_models | quantile | consensus_fraction | recency_half_life | warmup | models | recall | precision | f1 | fp_per_day | median_delay | p95_delay | worst_fold_recall | folds_beating_standard | feasible")
	for index := 0; index < topCount; index++ {
		t.Log(formatNetdataBayesEvaluation(index+1, ranked[index]))
	}

	best, bestFeasible := selectBestNetdataBayesEvaluation(ranked)
	if bestFeasible {
		t.Log("best_cv_configuration:")
		t.Log(formatNetdataBayesSummary(best))
	} else {
		t.Log("best_cv_configuration: no feasible config found, using diagnostic best")
		t.Log(formatNetdataBayesSummary(best))
	}

	relaxedConfig := baselineNetdataMLConfig(6)
	relaxedConfig.NetdataMaximumModels = 32
	relaxedConfig.NetdataConsensusFraction = 0.75
	relaxedConfig.NetdataRecencyHalfLife = 24 * time.Hour

	holdoutResult, err := evaluateNetdataCommonCoverageAcrossSeries(
		holdoutEvaluations,
		holdoutSkipped,
		[]netdataCommonAlgorithmSpec{
			{Name: "standard_zscore", Threshold: 6.0, Config: nil},
			{Name: "current_raw_kmeans", Threshold: 4.0, Config: configPtr(defaultMLConfig)},
			{Name: "netdata_unanimous_6", Threshold: 4.0, Config: configPtr(baselineNetdataMLConfig(6))},
			{Name: "netdata_relaxed_baseline", Threshold: 4.0, Config: configPtr(relaxedConfig)},
			{Name: "best_bayes_netdata", Threshold: 4.0, Config: configPtr(best.Config.toMLConfig())},
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	t.Log("algorithm | series | points | series_days | windows | detected | missed | fp_events | fp_per_day | precision | recall | f1 | macro_f1 | median_delay | p95_delay | runtime")
	for _, algorithm := range []string{
		"standard_zscore",
		"current_raw_kmeans",
		"netdata_unanimous_6",
		"netdata_relaxed_baseline",
		"best_bayes_netdata",
	} {
		aggregate := holdoutResult.Aggregates[algorithm]
		t.Logf(
			"%s | %d | %d | %.4f | %d | %d | %d | %d | %.4f | %.4f | %.4f | %.4f | %.4f | %.2f | %.2f | %s",
			algorithm,
			aggregate.EvaluatedSeries,
			aggregate.EvaluatedPoints,
			aggregate.TotalSeriesDays,
			aggregate.TotalWindows,
			aggregate.DetectedWindows,
			aggregate.MissedWindows,
			aggregate.FalsePositiveEvents,
			aggregate.FalsePositiveEventsPerSeriesDay,
			aggregate.EventPrecision,
			aggregate.EventRecall,
			aggregate.EventF1,
			aggregate.MacroF1,
			aggregate.MedianDetectionDelayMinutes,
			aggregate.P95DetectionDelayMinutes,
			aggregate.Runtime.Round(time.Millisecond),
		)
	}

	standardHoldout := holdoutResult.Aggregates["standard_zscore"]
	bestHoldout := holdoutResult.Aggregates["best_bayes_netdata"]
	beatsRecall := bestHoldout.EventRecall >= standardHoldout.EventRecall
	beatsF1 := bestHoldout.EventF1 > standardHoldout.EventF1
	beatsFP := bestHoldout.FalsePositiveEventsPerSeriesDay <= standardHoldout.FalsePositiveEventsPerSeriesDay
	beatsAll := beatsRecall && beatsF1 && beatsFP

	t.Logf("beats_standard_recall=%t", beatsRecall)
	t.Logf("beats_standard_f1=%t", beatsF1)
	t.Logf("beats_standard_fp=%t", beatsFP)
	t.Logf("beats_standard_all=%t", beatsAll)

	diagnostics := collectNetdataWindowDiagnostics(
		holdoutResult,
		"standard_zscore",
		"best_bayes_netdata",
		best.Config.toMLConfig(),
	)
	for _, diagnostic := range diagnostics {
		prefix := "candidate_missed_window"
		if diagnostic.StandardOnly {
			prefix = "STANDARD_ONLY_WINDOW"
		}
		t.Logf(
			"%s series=%s window_start=%s window_end=%s maximum_anomalous_fraction=%.4f maximum_quorum_ratio=%.4f maximum_standard_abs_score=%.4f models_available_at_best_point=%d first_candidate_score=%.4f reason=%s",
			prefix,
			diagnostic.SeriesKey,
			diagnostic.WindowStart.Format(time.RFC3339),
			diagnostic.WindowEnd.Format(time.RFC3339),
			diagnostic.MaximumAnomalousFraction,
			diagnostic.MaximumQuorumRatio,
			diagnostic.MaximumStandardAbsScore,
			diagnostic.ModelsAvailableAtBest,
			diagnostic.FirstCandidateScore,
			diagnostic.Reason,
		)
	}

	t.Logf("runtime=%s", time.Since(startedAt).Round(time.Millisecond))
}

func evaluateNetdataCommonCoverageAcrossSeries(
	evaluations []nabSeriesEvaluation,
	skipped []nabSeriesSkip,
	algorithms []netdataCommonAlgorithmSpec,
) (netdataCommonBenchmarkResult, error) {
	result := netdataCommonBenchmarkResult{
		Aggregates: make(map[string]nabAggregateMetrics, len(algorithms)),
		Series:     make([]netdataCommonSeriesResult, 0),
	}

	seriesCount := len(evaluations) + len(skipped)
	evaluationsByAlgorithm := make(map[string][]nabSeriesEvaluation, len(algorithms))
	detailsByAlgorithm := make(map[string][]nabDetailedMetrics, len(algorithms))

	for _, evaluation := range evaluations {
		runs := make(map[string]nabMLRunResult, len(algorithms))
		for _, algorithm := range algorithms {
			if algorithm.Config == nil {
				runs[algorithm.Name] = buildNABStandardRunResult(evaluation)
				continue
			}

			run, err := runNABMLSeriesWithConfig(
				evaluation.SeriesKey,
				evaluation.EvaluatedPoints,
				evaluation.StandardScores,
				*algorithm.Config,
			)
			if err != nil {
				return netdataCommonBenchmarkResult{}, fmt.Errorf("%s on %s: %w", algorithm.Name, evaluation.SeriesKey, err)
			}
			runs[algorithm.Name] = run
		}

		commonMask := buildNetdataCommonReadyMask(evaluation.EvaluatedPoints, runs)
		commonPoints := filterNABPointsByMask(evaluation.EvaluatedPoints, commonMask)
		if len(commonPoints) == 0 {
			continue
		}

		commonWindows := filterNABWindowsForCommonPoints(evaluation.EvaluationWindows, commonPoints)
		details := make(map[string]nabDetailedMetrics, len(algorithms))
		filteredRuns := make(map[string]nabMLRunResult, len(algorithms))
		for _, algorithm := range algorithms {
			filteredScores := filterFloat64sByMask(
				runs[algorithm.Name].Scores,
				commonMask,
			)
			filteredRuns[algorithm.Name] = nabMLRunResult{
				Scores:             filteredScores,
				ReadyMask:          make([]bool, len(filteredScores)),
				ModelsAvailable:    filterIntsByMask(runs[algorithm.Name].ModelsAvailable, commonMask),
				FeatureSizes:       filterIntsByMask(runs[algorithm.Name].FeatureSizes, commonMask),
				AnomalousFractions: filterFloat64sByMask(runs[algorithm.Name].AnomalousFractions, commonMask),
				QuorumRatios:       filterFloat64sByMask(runs[algorithm.Name].QuorumRatios, commonMask),
			}
			for index := range filteredRuns[algorithm.Name].ReadyMask {
				filteredRuns[algorithm.Name].ReadyMask[index] = true
			}
			details[algorithm.Name] = evaluateNABAlgorithmDetailed(
				algorithm.Name,
				algorithm.Threshold,
				commonPoints,
				filteredScores,
				commonWindows,
				evaluation.Interval,
			)
			evaluationsByAlgorithm[algorithm.Name] = append(
				evaluationsByAlgorithm[algorithm.Name],
				nabSeriesEvaluation{
					SeriesKey:         evaluation.SeriesKey,
					TotalPoints:       evaluation.TotalPoints,
					EvaluatedPoints:   commonPoints,
					EvaluationWindows: commonWindows,
					Interval:          evaluation.Interval,
					SeriesDays:        computeNABSeriesDays(commonPoints, evaluation.Interval),
				},
			)
			detailsByAlgorithm[algorithm.Name] = append(
				detailsByAlgorithm[algorithm.Name],
				details[algorithm.Name],
			)
		}

		result.Series = append(result.Series, netdataCommonSeriesResult{
			Evaluation:    evaluation,
			CommonPoints:  commonPoints,
			CommonWindows: commonWindows,
			Details:       details,
			Runs:          filteredRuns,
		})
		result.CommonSeries++
		result.CommonPoints += len(commonPoints)
		result.CommonWindows += len(commonWindows)
		result.CommonSeriesDays += computeNABSeriesDays(commonPoints, evaluation.Interval)
	}

	for _, algorithm := range algorithms {
		aggregate, err := aggregateNABSeriesMetrics(
			algorithm.Name,
			seriesCount,
			evaluationsByAlgorithm[algorithm.Name],
			skipped,
			detailsByAlgorithm[algorithm.Name],
			0,
		)
		if err != nil {
			return netdataCommonBenchmarkResult{}, err
		}
		result.Aggregates[algorithm.Name] = aggregate
	}

	return result, nil
}

func buildNABStandardRunResult(
	evaluation nabSeriesEvaluation,
) nabMLRunResult {
	readyMask := make([]bool, len(evaluation.StandardScores))
	for index := range readyMask {
		readyMask[index] = isFinite(evaluation.StandardScores[index])
	}

	return nabMLRunResult{
		Scores:    slices.Clone(evaluation.StandardScores),
		ReadyMask: readyMask,
	}
}

func runNABMLSeriesWithConfig(
	seriesKey string,
	points []nabPoint,
	fallbackScores []float64,
	config mlConfig,
) (nabMLRunResult, error) {
	if len(points) != len(fallbackScores) {
		return nabMLRunResult{}, fmt.Errorf("point and fallback score length mismatch: got %d points and %d scores", len(points), len(fallbackScores))
	}

	provider := newMLProviderWithConfig(
		nil,
		nil,
		nil,
		config,
	)

	result := nabMLRunResult{
		Scores:             make([]float64, 0, len(points)),
		ReadyMask:          make([]bool, 0, len(points)),
		ModelsAvailable:    make([]int, 0, len(points)),
		FeatureSizes:       make([]int, 0, len(points)),
		AnomalousFractions: make([]float64, 0, len(points)),
		QuorumRatios:       make([]float64, 0, len(points)),
	}

	for index, point := range points {
		fallbackScore := fallbackScores[index]
		preReady := false
		if state := provider.series[seriesKey]; state != nil &&
			config.AlgorithmMode == mlAlgorithmRawEnsemble &&
			len(state.values) >= config.CriticalMass {
			preReady = true
		}

		score := provider.scoreSinglePointForSeries(
			seriesKey,
			point.Timestamp.UnixMilli(),
			point.Value,
			fallbackScore,
		)
		if !isFinite(score) {
			return nabMLRunResult{}, fmt.Errorf("invalid score at index %d: %v", index, score)
		}

		state := provider.series[seriesKey]
		ready := preReady
		modelsAvailable := 0
		featureSize := 0
		anomalousFraction := 0.0
		quorumRatio := 0.0
		if state != nil {
			modelsAvailable = len(state.temporalModels)
			featureSize = state.lastFeatureSize
			anomalousFraction = state.lastAnomalousFraction
			quorumRatio = state.lastQuorumRatio
			if config.AlgorithmMode == mlAlgorithmNetdataTemporal {
				ready = featureSize > 0 &&
					modelsAvailable >= config.NetdataMinimumModelsForConsensus
			}
		}

		result.Scores = append(result.Scores, score)
		result.ReadyMask = append(result.ReadyMask, ready)
		result.ModelsAvailable = append(result.ModelsAvailable, modelsAvailable)
		result.FeatureSizes = append(result.FeatureSizes, featureSize)
		result.AnomalousFractions = append(result.AnomalousFractions, anomalousFraction)
		result.QuorumRatios = append(result.QuorumRatios, quorumRatio)
	}

	return result, nil
}

func buildNetdataCommonReadyMask(
	points []nabPoint,
	runs map[string]nabMLRunResult,
) []bool {
	mask := make([]bool, len(points))
	for index := range points {
		mask[index] = true
		for _, run := range runs {
			if index >= len(run.Scores) ||
				index >= len(run.ReadyMask) ||
				!run.ReadyMask[index] ||
				!isFinite(run.Scores[index]) {
				mask[index] = false
				break
			}
		}
	}

	return mask
}

func filterNABPointsByMask(
	points []nabPoint,
	mask []bool,
) []nabPoint {
	filtered := make([]nabPoint, 0)
	for index, point := range points {
		if index < len(mask) && mask[index] {
			filtered = append(filtered, point)
		}
	}

	return filtered
}

func filterFloat64sByMask(
	values []float64,
	mask []bool,
) []float64 {
	filtered := make([]float64, 0)
	for index, value := range values {
		if index < len(mask) && mask[index] {
			filtered = append(filtered, value)
		}
	}

	return filtered
}

func filterIntsByMask(
	values []int,
	mask []bool,
) []int {
	filtered := make([]int, 0)
	for index, value := range values {
		if index < len(mask) && mask[index] {
			filtered = append(filtered, value)
		}
	}

	return filtered
}

func filterNABWindowsForCommonPoints(
	windows []nabWindow,
	points []nabPoint,
) []nabWindow {
	filtered := make([]nabWindow, 0)
	for _, window := range windows {
		for _, point := range points {
			if point.Timestamp.Before(window.Start) || point.Timestamp.After(window.End) {
				continue
			}
			filtered = append(filtered, window)
			break
		}
	}

	return filtered
}

func computeNABSeriesDays(
	points []nabPoint,
	interval time.Duration,
) float64 {
	if len(points) == 0 {
		return 0
	}

	seriesDays := points[len(points)-1].Timestamp.Sub(points[0].Timestamp).Hours() / 24
	if seriesDays <= 0 {
		seriesDays = float64(len(points)) * interval.Hours() / 24
	}

	return seriesDays
}

func buildNetdataCVFolds(
	evaluations []nabSeriesEvaluation,
) [][]string {
	folds := make([][]string, 3)
	for _, evaluation := range evaluations {
		fold := hashNABSeriesKey(evaluation.SeriesKey+":cv") % 3
		folds[fold] = append(folds[fold], evaluation.SeriesKey)
	}
	for index := range folds {
		slices.Sort(folds[index])
	}

	return folds
}

func runNetdataBayesOptimization(
	t *testing.T,
	state bayesOptimizerState,
	cvFolds [][]string,
	evaluationByKey map[string]nabSeriesEvaluation,
	skipped []nabSeriesSkip,
	workers int,
) ([]netdataBayesEvaluation, error) {
	t.Helper()

	startedAt := time.Now()
	evaluations, err := loadNetdataBayesCheckpoint(state)
	if err != nil {
		return nil, err
	}

	rng := rand.New(rand.NewSource(state.Seed))
	evaluated := make(map[string]struct{}, len(evaluations))
	for _, evaluation := range evaluations {
		evaluated[evaluation.Config.signature()] = struct{}{}
	}

	initialConfigs := generateNetdataBayesInitialConfigs(
		state.SearchSpace,
		state.Mode.InitialSamples,
		rng,
		evaluated,
	)

	for _, config := range initialConfigs {
		evaluation, err := evaluateNetdataBayesConfigCV(
			cvFolds,
			evaluationByKey,
			skipped,
			config,
			workers,
		)
		if err != nil {
			return nil, err
		}
		evaluations = append(evaluations, evaluation)
		evaluated[config.signature()] = struct{}{}
		saveNetdataBayesCheckpoint(state, evaluations, time.Since(startedAt))
		logNetdataBayesProgress(t, len(evaluations), state.Mode.TotalEvaluations, "initial", evaluation, startedAt)
		if len(evaluations)%10 == 0 {
			logNetdataBayesTop5(t, evaluations)
		}
	}

	for len(evaluations) < state.Mode.TotalEvaluations {
		nextConfig, err := selectNextNetdataBayesConfig(
			state.SearchSpace,
			rng,
			evaluations,
			evaluated,
		)
		if err != nil {
			return nil, err
		}

		evaluation, err := evaluateNetdataBayesConfigCV(
			cvFolds,
			evaluationByKey,
			skipped,
			nextConfig,
			workers,
		)
		if err != nil {
			return nil, err
		}
		evaluations = append(evaluations, evaluation)
		evaluated[nextConfig.signature()] = struct{}{}
		saveNetdataBayesCheckpoint(state, evaluations, time.Since(startedAt))
		logNetdataBayesProgress(t, len(evaluations), state.Mode.TotalEvaluations, "bayes", evaluation, startedAt)
		if len(evaluations)%10 == 0 {
			logNetdataBayesTop5(t, evaluations)
		}
	}

	return evaluations, nil
}

func evaluateNetdataBayesConfigCV(
	cvFolds [][]string,
	evaluationByKey map[string]nabSeriesEvaluation,
	skipped []nabSeriesSkip,
	config netdataTuneConfig,
	workers int,
) (netdataBayesEvaluation, error) {
	foldMetrics := make([]netdataBayesFoldMetrics, 0, len(cvFolds))
	for foldIndex, foldKeys := range cvFolds {
		foldEvaluations := filterNABSeriesEvaluations(foldKeys, evaluationByKey)
		foldSkipped := filterNABSeriesSkips(foldKeys, skipped)
		candidateAggregate, standardAggregate, err := evaluateCandidateAgainstStandardCommonCoverage(
			foldEvaluations,
			foldSkipped,
			config.toMLConfig(),
			workers,
		)
		if err != nil {
			return netdataBayesEvaluation{}, err
		}
		foldMetrics = append(foldMetrics, netdataBayesFoldMetrics{
			FoldIndex: foldIndex,
			Candidate: candidateAggregate,
			Standard:  standardAggregate,
			Utility:   computeNetdataBayesFoldUtility(candidateAggregate, standardAggregate),
		})
	}

	meanCandidate := meanNetdataAggregateMetrics(foldMetrics, true)
	meanStandard := meanNetdataAggregateMetrics(foldMetrics, false)
	objective := computeNetdataBayesObjective(foldMetrics)
	worstRecall := math.Inf(1)
	worstF1 := math.Inf(1)
	foldsBeatingStandard := 0
	for _, fold := range foldMetrics {
		if fold.Candidate.EventRecall < worstRecall {
			worstRecall = fold.Candidate.EventRecall
		}
		if fold.Candidate.EventF1 < worstF1 {
			worstF1 = fold.Candidate.EventF1
		}
		if fold.Candidate.EventRecall >= fold.Standard.EventRecall &&
			fold.Candidate.EventF1 > fold.Standard.EventF1 {
			foldsBeatingStandard++
		}
	}
	if !isFinite(worstRecall) {
		worstRecall = 0
	}
	if !isFinite(worstF1) {
		worstF1 = 0
	}

	feasible := meanCandidate.EventRecall >= meanStandard.EventRecall &&
		meanCandidate.EventF1 > meanStandard.EventF1 &&
		meanCandidate.FalsePositiveEventsPerSeriesDay <= meanStandard.FalsePositiveEventsPerSeriesDay &&
		foldsBeatingStandard >= 2

	return netdataBayesEvaluation{
		Config:               config,
		Objective:            objective,
		MeanMetrics:          meanCandidate,
		MeanStandardMetrics:  meanStandard,
		WorstFoldRecall:      worstRecall,
		WorstFoldF1:          worstF1,
		FoldsBeatingStandard: foldsBeatingStandard,
		Feasible:             feasible,
		Folds:                foldMetrics,
	}, nil
}

func evaluateCandidateAgainstStandardCommonCoverage(
	evaluations []nabSeriesEvaluation,
	skipped []nabSeriesSkip,
	config mlConfig,
	workers int,
) (nabAggregateMetrics, nabAggregateMetrics, error) {
	type seriesResult struct {
		Candidate  nabDetailedMetrics
		Standard   nabDetailedMetrics
		Evaluation nabSeriesEvaluation
		Err        error
	}

	jobs := make(chan nabSeriesEvaluation)
	results := make(chan seriesResult)
	workerCount := min(workers, len(evaluations))
	if workerCount < 1 {
		workerCount = 1
	}

	var wg sync.WaitGroup
	for workerIndex := 0; workerIndex < workerCount; workerIndex++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for evaluation := range jobs {
				candidateRun, err := runNABMLSeriesWithConfig(
					evaluation.SeriesKey,
					evaluation.EvaluatedPoints,
					evaluation.StandardScores,
					config,
				)
				if err != nil {
					results <- seriesResult{Err: err}
					continue
				}

				mask := buildNetdataCommonReadyMask(
					evaluation.EvaluatedPoints,
					map[string]nabMLRunResult{
						"standard":  buildNABStandardRunResult(evaluation),
						"candidate": candidateRun,
					},
				)
				commonPoints := filterNABPointsByMask(evaluation.EvaluatedPoints, mask)
				if len(commonPoints) == 0 {
					results <- seriesResult{}
					continue
				}

				commonWindows := filterNABWindowsForCommonPoints(evaluation.EvaluationWindows, commonPoints)
				filteredCandidateScores := filterFloat64sByMask(candidateRun.Scores, mask)
				filteredStandardScores := filterFloat64sByMask(evaluation.StandardScores, mask)
				commonEvaluation := nabSeriesEvaluation{
					SeriesKey:         evaluation.SeriesKey,
					TotalPoints:       evaluation.TotalPoints,
					EvaluatedPoints:   commonPoints,
					EvaluationWindows: commonWindows,
					Interval:          evaluation.Interval,
					SeriesDays:        computeNABSeriesDays(commonPoints, evaluation.Interval),
				}

				results <- seriesResult{
					Evaluation: commonEvaluation,
					Candidate: evaluateNABAlgorithmDetailed(
						"candidate",
						4.0,
						commonPoints,
						filteredCandidateScores,
						commonWindows,
						evaluation.Interval,
					),
					Standard: evaluateNABAlgorithmDetailed(
						"standard",
						6.0,
						commonPoints,
						filteredStandardScores,
						commonWindows,
						evaluation.Interval,
					),
				}
			}
		}()
	}

	go func() {
		for _, evaluation := range evaluations {
			jobs <- evaluation
		}
		close(jobs)
		wg.Wait()
		close(results)
	}()

	candidateEvaluations := make([]nabSeriesEvaluation, 0, len(evaluations))
	candidateMetrics := make([]nabDetailedMetrics, 0, len(evaluations))
	standardEvaluations := make([]nabSeriesEvaluation, 0, len(evaluations))
	standardMetrics := make([]nabDetailedMetrics, 0, len(evaluations))

	for result := range results {
		if result.Err != nil {
			return nabAggregateMetrics{}, nabAggregateMetrics{}, result.Err
		}
		if len(result.Evaluation.EvaluatedPoints) == 0 {
			continue
		}

		candidateEvaluations = append(candidateEvaluations, result.Evaluation)
		candidateMetrics = append(candidateMetrics, result.Candidate)
		standardEvaluations = append(standardEvaluations, result.Evaluation)
		standardMetrics = append(standardMetrics, result.Standard)
	}

	candidateAggregate, err := aggregateNABSeriesMetrics(
		"candidate",
		len(evaluations)+len(skipped),
		candidateEvaluations,
		skipped,
		candidateMetrics,
		0,
	)
	if err != nil {
		return nabAggregateMetrics{}, nabAggregateMetrics{}, err
	}
	standardAggregate, err := aggregateNABSeriesMetrics(
		"standard",
		len(evaluations)+len(skipped),
		standardEvaluations,
		skipped,
		standardMetrics,
		0,
	)
	if err != nil {
		return nabAggregateMetrics{}, nabAggregateMetrics{}, err
	}

	return candidateAggregate, standardAggregate, nil
}

func computeNetdataBayesFoldUtility(
	candidate nabAggregateMetrics,
	standard nabAggregateMetrics,
) float64 {
	recallGain := (candidate.EventRecall - standard.EventRecall) / math.Max(standard.EventRecall, 0.05)
	f1Gain := (candidate.EventF1 - standard.EventF1) / math.Max(standard.EventF1, 0.05)
	fpGain := (standard.FalsePositiveEventsPerSeriesDay - candidate.FalsePositiveEventsPerSeriesDay) / math.Max(standard.FalsePositiveEventsPerSeriesDay, 0.05)
	precisionGain := (candidate.EventPrecision - standard.EventPrecision) / math.Max(standard.EventPrecision, 0.05)
	delayGain := (standard.MedianDetectionDelayMinutes - candidate.MedianDetectionDelayMinutes) / math.Max(standard.MedianDetectionDelayMinutes, 60)

	utility := 4.0*recallGain +
		3.0*f1Gain +
		1.0*fpGain +
		0.5*precisionGain +
		0.25*delayGain

	if candidate.EventRecall < standard.EventRecall {
		utility -= 20 * (standard.EventRecall - candidate.EventRecall)
	}
	if candidate.EventF1 < standard.EventF1 {
		utility -= 15 * (standard.EventF1 - candidate.EventF1)
	}
	if candidate.FalsePositiveEventsPerSeriesDay > standard.FalsePositiveEventsPerSeriesDay {
		utility -= 3 * (candidate.FalsePositiveEventsPerSeriesDay - standard.FalsePositiveEventsPerSeriesDay) / math.Max(standard.FalsePositiveEventsPerSeriesDay, 0.05)
	}

	return utility
}

func computeNetdataBayesObjective(
	folds []netdataBayesFoldMetrics,
) float64 {
	if len(folds) == 0 {
		return math.Inf(-1)
	}

	mean := 0.0
	for _, fold := range folds {
		mean += fold.Utility
	}
	mean /= float64(len(folds))

	variance := 0.0
	for _, fold := range folds {
		delta := fold.Utility - mean
		variance += delta * delta
	}
	variance /= float64(len(folds))

	return mean - 0.5*math.Sqrt(variance)
}

func meanNetdataAggregateMetrics(
	folds []netdataBayesFoldMetrics,
	candidate bool,
) nabAggregateMetrics {
	mean := nabAggregateMetrics{}
	if len(folds) == 0 {
		return mean
	}

	for _, fold := range folds {
		metrics := fold.Standard
		if candidate {
			metrics = fold.Candidate
		}
		mean.EventRecall += metrics.EventRecall
		mean.EventPrecision += metrics.EventPrecision
		mean.EventF1 += metrics.EventF1
		mean.MacroF1 += metrics.MacroF1
		mean.FalsePositiveEventsPerSeriesDay += metrics.FalsePositiveEventsPerSeriesDay
		mean.MedianDetectionDelayMinutes += metrics.MedianDetectionDelayMinutes
		mean.P95DetectionDelayMinutes += metrics.P95DetectionDelayMinutes
	}

	mean.EventRecall /= float64(len(folds))
	mean.EventPrecision /= float64(len(folds))
	mean.EventF1 /= float64(len(folds))
	mean.MacroF1 /= float64(len(folds))
	mean.FalsePositiveEventsPerSeriesDay /= float64(len(folds))
	mean.MedianDetectionDelayMinutes /= float64(len(folds))
	mean.P95DetectionDelayMinutes /= float64(len(folds))

	return mean
}

func rankNetdataBayesEvaluations(
	evaluations []netdataBayesEvaluation,
) []netdataBayesEvaluation {
	ranked := slices.Clone(evaluations)
	slices.SortFunc(ranked, compareNetdataBayesEvaluations)
	return ranked
}

func compareNetdataBayesEvaluations(
	left netdataBayesEvaluation,
	right netdataBayesEvaluation,
) int {
	switch {
	case left.Feasible && !right.Feasible:
		return -1
	case !left.Feasible && right.Feasible:
		return 1
	case left.Feasible && right.Feasible:
		switch {
		case left.MeanMetrics.EventF1 > right.MeanMetrics.EventF1:
			return -1
		case left.MeanMetrics.EventF1 < right.MeanMetrics.EventF1:
			return 1
		case left.MeanMetrics.EventRecall > right.MeanMetrics.EventRecall:
			return -1
		case left.MeanMetrics.EventRecall < right.MeanMetrics.EventRecall:
			return 1
		case left.MeanMetrics.FalsePositiveEventsPerSeriesDay < right.MeanMetrics.FalsePositiveEventsPerSeriesDay:
			return -1
		case left.MeanMetrics.FalsePositiveEventsPerSeriesDay > right.MeanMetrics.FalsePositiveEventsPerSeriesDay:
			return 1
		case left.WorstFoldRecall > right.WorstFoldRecall:
			return -1
		case left.WorstFoldRecall < right.WorstFoldRecall:
			return 1
		case left.MeanMetrics.MedianDetectionDelayMinutes < right.MeanMetrics.MedianDetectionDelayMinutes:
			return -1
		case left.MeanMetrics.MedianDetectionDelayMinutes > right.MeanMetrics.MedianDetectionDelayMinutes:
			return 1
		case left.Config.MaximumModels < right.Config.MaximumModels:
			return -1
		case left.Config.MaximumModels > right.Config.MaximumModels:
			return 1
		case left.Config.warmupDuration() < right.Config.warmupDuration():
			return -1
		case left.Config.warmupDuration() > right.Config.warmupDuration():
			return 1
		default:
			return strings.Compare(left.Config.signature(), right.Config.signature())
		}
	default:
		switch {
		case left.Objective > right.Objective:
			return -1
		case left.Objective < right.Objective:
			return 1
		default:
			return strings.Compare(left.Config.signature(), right.Config.signature())
		}
	}
}

func selectBestNetdataBayesEvaluation(
	ranked []netdataBayesEvaluation,
) (netdataBayesEvaluation, bool) {
	if len(ranked) == 0 {
		return netdataBayesEvaluation{}, false
	}

	return ranked[0], ranked[0].Feasible
}

func formatNetdataBayesEvaluation(
	rank int,
	evaluation netdataBayesEvaluation,
) string {
	return fmt.Sprintf(
		"%d | %.4f | %d | %d | %d | %s | %s | %d | %d | %.4f | %.2f | %s | %s | %d | %.4f | %.4f | %.4f | %.4f | %.2f | %.2f | %.4f | %d | %t",
		rank,
		evaluation.Objective,
		evaluation.Config.DiffN,
		evaluation.Config.SmoothN,
		evaluation.Config.LagN,
		evaluation.Config.TrainingWindow,
		evaluation.Config.TrainEvery,
		evaluation.Config.MaximumModels,
		evaluation.Config.MinimumModelsForConsensus,
		evaluation.Config.DistanceQuantile,
		evaluation.Config.ConsensusFraction,
		evaluation.Config.RecencyHalfLife,
		evaluation.Config.warmupDuration(),
		evaluation.Config.MaximumModels,
		evaluation.MeanMetrics.EventRecall,
		evaluation.MeanMetrics.EventPrecision,
		evaluation.MeanMetrics.EventF1,
		evaluation.MeanMetrics.FalsePositiveEventsPerSeriesDay,
		evaluation.MeanMetrics.MedianDetectionDelayMinutes,
		evaluation.MeanMetrics.P95DetectionDelayMinutes,
		evaluation.WorstFoldRecall,
		evaluation.FoldsBeatingStandard,
		evaluation.Feasible,
	)
}

func formatNetdataBayesSummary(
	evaluation netdataBayesEvaluation,
) string {
	return fmt.Sprintf(
		"objective=%.4f diff=%d smooth=%d lag=%d training_window=%s train_every=%s maximum_models=%d minimum_models=%d quantile=%.4f consensus_fraction=%.2f recency_half_life=%s warmup=%s recall=%.4f precision=%.4f f1=%.4f fp_per_day=%.4f median_delay=%.2f p95_delay=%.2f worst_fold_recall=%.4f folds_beating_standard=%d feasible=%t",
		evaluation.Objective,
		evaluation.Config.DiffN,
		evaluation.Config.SmoothN,
		evaluation.Config.LagN,
		evaluation.Config.TrainingWindow,
		evaluation.Config.TrainEvery,
		evaluation.Config.MaximumModels,
		evaluation.Config.MinimumModelsForConsensus,
		evaluation.Config.DistanceQuantile,
		evaluation.Config.ConsensusFraction,
		evaluation.Config.RecencyHalfLife,
		evaluation.Config.warmupDuration(),
		evaluation.MeanMetrics.EventRecall,
		evaluation.MeanMetrics.EventPrecision,
		evaluation.MeanMetrics.EventF1,
		evaluation.MeanMetrics.FalsePositiveEventsPerSeriesDay,
		evaluation.MeanMetrics.MedianDetectionDelayMinutes,
		evaluation.MeanMetrics.P95DetectionDelayMinutes,
		evaluation.WorstFoldRecall,
		evaluation.FoldsBeatingStandard,
		evaluation.Feasible,
	)
}

func resolveNetdataBayesSearchMode() netdataBayesSearchMode {
	if os.Getenv("NAB_BAYESOPT_FULL") == "1" {
		return netdataBayesSearchMode{
			Name:               "full",
			InitialSamples:     32,
			BayesianIterations: 168,
			TotalEvaluations:   200,
		}
	}

	return netdataBayesSearchMode{
		Name:               "smoke",
		InitialSamples:     20,
		BayesianIterations: 40,
		TotalEvaluations:   60,
	}
}

func resolveNetdataBayesSearchSpace() netdataBayesSearchSpace {
	return netdataBayesSearchSpace{
		DiffN:             []int{1, 2, 3},
		SmoothN:           []int{1, 2, 3, 4, 5, 7, 9},
		LagN:              []int{2, 3, 4, 5, 6, 8, 10, 12},
		TrainingWindow:    []time.Duration{3 * time.Hour, 6 * time.Hour, 9 * time.Hour, 12 * time.Hour, 18 * time.Hour, 24 * time.Hour, 36 * time.Hour, 48 * time.Hour},
		TrainEvery:        []time.Duration{1 * time.Hour, 2 * time.Hour, 3 * time.Hour, 4 * time.Hour, 6 * time.Hour, 8 * time.Hour, 12 * time.Hour},
		MaximumModels:     []int{12, 18, 24, 32, 48, 64},
		MinimumModels:     []int{1, 3, 6, 9, 12, 18, 24},
		DistanceQuantile:  []float64{0.950, 0.960, 0.970, 0.975, 0.980, 0.985, 0.990, 0.9925, 0.995, 0.9975, 0.999},
		ConsensusFraction: []float64{0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00},
		RecencyHalfLife:   []time.Duration{0, 6 * time.Hour, 12 * time.Hour, 24 * time.Hour, 48 * time.Hour, 72 * time.Hour, 96 * time.Hour, 168 * time.Hour},
	}
}

func resolveNetdataBayesSeed() int64 {
	value := os.Getenv("NAB_BAYESOPT_SEED")
	if value == "" {
		return netdataBayesDefaultSeed
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return netdataBayesDefaultSeed
	}

	return parsed
}

func resolveNetdataBayesWorkers() int {
	value := os.Getenv("NAB_BAYESOPT_WORKERS")
	if value != "" {
		parsed, err := strconv.Atoi(value)
		if err == nil && parsed > 0 {
			return parsed
		}
	}

	return min(runtime.NumCPU(), 6)
}

func generateNetdataBayesInitialConfigs(
	space netdataBayesSearchSpace,
	count int,
	rng *rand.Rand,
	seen map[string]struct{},
) []netdataTuneConfig {
	return generateNetdataBayesConfigsFromSamples(
		space,
		generateLatinHypercubeSamples(10, count, rng),
		count,
		seen,
	)
}

func selectNextNetdataBayesConfig(
	space netdataBayesSearchSpace,
	rng *rand.Rand,
	evaluations []netdataBayesEvaluation,
	seen map[string]struct{},
) (netdataTuneConfig, error) {
	candidates := generateNetdataBayesConfigsFromSamples(
		space,
		generateLatinHypercubeSamples(10, netdataBayesCandidatePoolSize, rng),
		netdataBayesCandidatePoolSize,
		seen,
	)
	if len(candidates) == 0 {
		return netdataTuneConfig{}, fmt.Errorf("no BayesOpt candidates available")
	}

	model, err := fitGaussianProcess(evaluations)
	if err != nil {
		return netdataTuneConfig{}, err
	}

	bestObjective := math.Inf(-1)
	for _, evaluation := range evaluations {
		if evaluation.Objective > bestObjective {
			bestObjective = evaluation.Objective
		}
	}

	bestCandidate := candidates[0]
	bestEI := math.Inf(-1)
	for _, candidate := range candidates {
		mean, variance := predictGaussianProcess(model, encodeNetdataTuneConfig(candidate, space))
		ei := expectedImprovement(mean, variance, bestObjective)
		if ei > bestEI {
			bestEI = ei
			bestCandidate = candidate
		}
	}

	return bestCandidate, nil
}

func generateNetdataBayesConfigsFromSamples(
	space netdataBayesSearchSpace,
	samples [][]float64,
	limit int,
	seen map[string]struct{},
) []netdataTuneConfig {
	configs := make([]netdataTuneConfig, 0, limit)
	localSeen := make(map[string]struct{}, len(seen))
	for key := range seen {
		localSeen[key] = struct{}{}
	}

	for _, sample := range samples {
		config, ok := decodeNetdataTuneConfig(sample, space)
		if !ok {
			continue
		}
		signature := config.signature()
		if _, ok := localSeen[signature]; ok {
			continue
		}
		localSeen[signature] = struct{}{}
		configs = append(configs, config)
		if len(configs) >= limit {
			break
		}
	}

	return configs
}

func generateLatinHypercubeSamples(
	dimensions int,
	count int,
	rng *rand.Rand,
) [][]float64 {
	samples := make([][]float64, count)
	for index := range samples {
		samples[index] = make([]float64, dimensions)
	}

	for dimension := 0; dimension < dimensions; dimension++ {
		permutation := rng.Perm(count)
		for sampleIndex := 0; sampleIndex < count; sampleIndex++ {
			samples[sampleIndex][dimension] = (float64(permutation[sampleIndex]) + 0.5) / float64(count)
		}
	}

	return samples
}

func decodeNetdataTuneConfig(
	encoded []float64,
	space netdataBayesSearchSpace,
) (netdataTuneConfig, bool) {
	config := netdataTuneConfig{
		DiffN:                     decodeDiscreteInt(encoded[0], space.DiffN),
		SmoothN:                   decodeDiscreteInt(encoded[1], space.SmoothN),
		LagN:                      decodeDiscreteInt(encoded[2], space.LagN),
		TrainingWindow:            decodeDiscreteDuration(encoded[3], space.TrainingWindow),
		TrainEvery:                decodeDiscreteDuration(encoded[4], space.TrainEvery),
		MaximumModels:             decodeDiscreteInt(encoded[5], space.MaximumModels),
		MinimumModelsForConsensus: decodeDiscreteInt(encoded[6], space.MinimumModels),
		DistanceQuantile:          decodeDiscreteFloat(encoded[7], space.DistanceQuantile),
		ConsensusFraction:         decodeDiscreteFloat(encoded[8], space.ConsensusFraction),
		RecencyHalfLife:           decodeDiscreteDuration(encoded[9], space.RecencyHalfLife),
	}

	if config.MinimumModelsForConsensus > config.MaximumModels {
		return netdataTuneConfig{}, false
	}
	if config.TrainingWindow < config.TrainEvery {
		return netdataTuneConfig{}, false
	}
	if config.warmupDuration() > 7*24*time.Hour {
		return netdataTuneConfig{}, false
	}

	return config, true
}

func encodeNetdataTuneConfig(
	config netdataTuneConfig,
	space netdataBayesSearchSpace,
) []float64 {
	return []float64{
		encodeDiscreteInt(config.DiffN, space.DiffN),
		encodeDiscreteInt(config.SmoothN, space.SmoothN),
		encodeDiscreteInt(config.LagN, space.LagN),
		encodeDiscreteDuration(config.TrainingWindow, space.TrainingWindow),
		encodeDiscreteDuration(config.TrainEvery, space.TrainEvery),
		encodeDiscreteInt(config.MaximumModels, space.MaximumModels),
		encodeDiscreteInt(config.MinimumModelsForConsensus, space.MinimumModels),
		encodeDiscreteFloat(config.DistanceQuantile, space.DistanceQuantile),
		encodeDiscreteFloat(config.ConsensusFraction, space.ConsensusFraction),
		encodeDiscreteDuration(config.RecencyHalfLife, space.RecencyHalfLife),
	}
}

func decodeDiscreteInt(value float64, allowed []int) int {
	index := int(math.Round(value * float64(len(allowed)-1)))
	index = max(0, min(index, len(allowed)-1))
	return allowed[index]
}

func decodeDiscreteFloat(value float64, allowed []float64) float64 {
	index := int(math.Round(value * float64(len(allowed)-1)))
	index = max(0, min(index, len(allowed)-1))
	return allowed[index]
}

func decodeDiscreteDuration(value float64, allowed []time.Duration) time.Duration {
	index := int(math.Round(value * float64(len(allowed)-1)))
	index = max(0, min(index, len(allowed)-1))
	return allowed[index]
}

func encodeDiscreteInt(value int, allowed []int) float64 {
	for index, candidate := range allowed {
		if candidate == value {
			if len(allowed) == 1 {
				return 0
			}
			return float64(index) / float64(len(allowed)-1)
		}
	}
	return 0
}

func encodeDiscreteFloat(value float64, allowed []float64) float64 {
	for index, candidate := range allowed {
		if approxFloat64(candidate, value) {
			if len(allowed) == 1 {
				return 0
			}
			return float64(index) / float64(len(allowed)-1)
		}
	}
	return 0
}

func encodeDiscreteDuration(value time.Duration, allowed []time.Duration) float64 {
	for index, candidate := range allowed {
		if candidate == value {
			if len(allowed) == 1 {
				return 0
			}
			return float64(index) / float64(len(allowed)-1)
		}
	}
	return 0
}

func fitGaussianProcess(
	evaluations []netdataBayesEvaluation,
) (gaussianProcessModel, error) {
	if len(evaluations) == 0 {
		return gaussianProcessModel{}, fmt.Errorf("no evaluations for GP")
	}

	space := resolveNetdataBayesSearchSpace()
	x := make([][]float64, 0, len(evaluations))
	y := make([]float64, 0, len(evaluations))
	for _, evaluation := range evaluations {
		x = append(x, encodeNetdataTuneConfig(evaluation.Config, space))
		y = append(y, evaluation.Objective)
	}

	kernel := make([][]float64, len(x))
	for row := range kernel {
		kernel[row] = make([]float64, len(x))
		for column := range kernel[row] {
			kernel[row][column] = matern52Kernel(x[row], x[column], 0.35)
		}
		kernel[row][row] += 1e-6
	}

	chol, err := choleskyDecomposition(kernel)
	if err != nil {
		return gaussianProcessModel{}, err
	}

	alpha, err := solveSymmetricCholesky(chol, y)
	if err != nil {
		return gaussianProcessModel{}, err
	}

	alphaColumn := make([][]float64, len(alpha))
	for index, value := range alpha {
		alphaColumn[index] = []float64{value}
	}

	return gaussianProcessModel{
		Alpha: alphaColumn,
		Chol:  chol,
		X:     x,
		Y:     y,
	}, nil
}

func predictGaussianProcess(
	model gaussianProcessModel,
	candidate []float64,
) (float64, float64) {
	k := make([]float64, len(model.X))
	for index, observation := range model.X {
		k[index] = matern52Kernel(candidate, observation, 0.35)
	}

	mean := 0.0
	for index := range k {
		mean += k[index] * model.Alpha[index][0]
	}

	v := solveLowerTriangular(model.Chol, k)
	variance := matern52Kernel(candidate, candidate, 0.35)
	for _, value := range v {
		variance -= value * value
	}
	if variance < 1e-9 {
		variance = 1e-9
	}

	return mean, variance
}

func expectedImprovement(
	mean float64,
	variance float64,
	best float64,
) float64 {
	sigma := math.Sqrt(math.Max(variance, 1e-9))
	improvement := mean - best - 0.01
	if sigma <= 1e-9 {
		if improvement > 0 {
			return improvement
		}
		return 0
	}

	z := improvement / sigma
	return improvement*normalCDF(z) + sigma*normalPDF(z)
}

func matern52Kernel(
	left []float64,
	right []float64,
	lengthScale float64,
) float64 {
	distanceSquared := 0.0
	for index := range left {
		delta := (left[index] - right[index]) / lengthScale
		distanceSquared += delta * delta
	}

	distance := math.Sqrt(distanceSquared)
	scaled := math.Sqrt(5) * distance
	return (1 + scaled + 5*distanceSquared/3) * math.Exp(-scaled)
}

func choleskyDecomposition(
	matrix [][]float64,
) ([][]float64, error) {
	n := len(matrix)
	result := make([][]float64, n)
	for row := range result {
		result[row] = make([]float64, n)
	}

	for row := 0; row < n; row++ {
		for column := 0; column <= row; column++ {
			sum := matrix[row][column]
			for inner := 0; inner < column; inner++ {
				sum -= result[row][inner] * result[column][inner]
			}

			if row == column {
				if sum <= 0 {
					return nil, fmt.Errorf("matrix is not positive definite")
				}
				result[row][column] = math.Sqrt(sum)
				continue
			}

			result[row][column] = sum / result[column][column]
		}
	}

	return result, nil
}

func solveSymmetricCholesky(
	chol [][]float64,
	right []float64,
) ([]float64, error) {
	forward := solveLowerTriangular(chol, right)
	return solveUpperTriangular(chol, forward), nil
}

func solveLowerTriangular(
	lower [][]float64,
	right []float64,
) []float64 {
	result := make([]float64, len(right))
	for row := 0; row < len(right); row++ {
		sum := right[row]
		for column := 0; column < row; column++ {
			sum -= lower[row][column] * result[column]
		}
		result[row] = sum / lower[row][row]
	}

	return result
}

func solveUpperTriangular(
	lower [][]float64,
	right []float64,
) []float64 {
	result := make([]float64, len(right))
	for row := len(right) - 1; row >= 0; row-- {
		sum := right[row]
		for column := row + 1; column < len(right); column++ {
			sum -= lower[column][row] * result[column]
		}
		result[row] = sum / lower[row][row]
	}

	return result
}

func normalCDF(value float64) float64 {
	return 0.5 * (1 + math.Erf(value/math.Sqrt2))
}

func normalPDF(value float64) float64 {
	return math.Exp(-0.5*value*value) / math.Sqrt(2*math.Pi)
}

func logNetdataBayesProgress(
	t *testing.T,
	evaluationIndex int,
	total int,
	phase string,
	evaluation netdataBayesEvaluation,
	startedAt time.Time,
) {
	t.Helper()
	elapsed := time.Since(startedAt)
	eta := time.Duration(0)
	if evaluationIndex > 0 {
		eta = time.Duration(float64(elapsed) / float64(evaluationIndex) * float64(total-evaluationIndex))
	}

	t.Logf(
		"evaluation=%d/%d phase=%s objective=%.4f recall=%.4f f1=%.4f fp_per_day=%.4f consensus_fraction=%.2f maximum_models=%d elapsed=%s eta=%s",
		evaluationIndex,
		total,
		phase,
		evaluation.Objective,
		evaluation.MeanMetrics.EventRecall,
		evaluation.MeanMetrics.EventF1,
		evaluation.MeanMetrics.FalsePositiveEventsPerSeriesDay,
		evaluation.Config.ConsensusFraction,
		evaluation.Config.MaximumModels,
		elapsed.Round(time.Millisecond),
		eta.Round(time.Millisecond),
	)
}

func logNetdataBayesTop5(
	t *testing.T,
	evaluations []netdataBayesEvaluation,
) {
	t.Helper()
	ranked := rankNetdataBayesEvaluations(evaluations)
	topCount := min(5, len(ranked))
	for index := 0; index < topCount; index++ {
		t.Logf("top5 %s", formatNetdataBayesEvaluation(index+1, ranked[index]))
	}
}

func loadNetdataBayesCheckpoint(
	state bayesOptimizerState,
) ([]netdataBayesEvaluation, error) {
	if state.CheckpointPath == "" {
		return nil, nil
	}

	payload, err := os.ReadFile(state.CheckpointPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var checkpoint netdataBayesCheckpoint
	if err := json.Unmarshal(payload, &checkpoint); err != nil {
		return nil, err
	}
	if checkpoint.SearchSpace != netdataBayesSearchSpaceV1 {
		return nil, fmt.Errorf("checkpoint search-space mismatch: got %s want %s", checkpoint.SearchSpace, netdataBayesSearchSpaceV1)
	}
	if checkpoint.Seed != state.Seed {
		return nil, fmt.Errorf("checkpoint seed mismatch: got %d want %d", checkpoint.Seed, state.Seed)
	}

	return checkpoint.Evaluations, nil
}

func saveNetdataBayesCheckpoint(
	state bayesOptimizerState,
	evaluations []netdataBayesEvaluation,
	elapsed time.Duration,
) {
	if state.CheckpointPath == "" {
		return
	}

	checkpoint := netdataBayesCheckpoint{
		ElapsedDuration: elapsed,
		Evaluations:     evaluations,
		SearchSpace:     netdataBayesSearchSpaceV1,
		Seed:            state.Seed,
	}

	payload, err := json.MarshalIndent(checkpoint, "", "  ")
	if err != nil {
		return
	}

	_ = os.WriteFile(state.CheckpointPath, payload, 0o600)
}

func collectNetdataWindowDiagnostics(
	result netdataCommonBenchmarkResult,
	standardName string,
	candidateName string,
	config mlConfig,
) []netdataWindowDiagnostic {
	diagnostics := make([]netdataWindowDiagnostic, 0)
	for _, series := range result.Series {
		standardRun := series.Runs[standardName]
		candidateRun := series.Runs[candidateName]
		for _, window := range series.CommonWindows {
			standardDetected := false
			candidateDetected := false
			maxAnomalousFraction := 0.0
			maxQuorumRatio := 0.0
			maxStandardAbsScore := 0.0
			modelsAtBest := 0
			firstCandidateScore := 0.0
			firstCandidateScoreSet := false
			commonPointsInWindow := 0
			anyReady := false
			anyFeature := false
			maxModelsAvailable := 0

			for index, point := range series.CommonPoints {
				if point.Timestamp.Before(window.Start) || point.Timestamp.After(window.End) {
					continue
				}

				commonPointsInWindow++
				standardScore := standardRun.Scores[index]
				candidateScore := candidateRun.Scores[index]
				if !firstCandidateScoreSet {
					firstCandidateScore = candidateScore
					firstCandidateScoreSet = true
				}
				if math.Abs(standardScore) >= 6.0 {
					standardDetected = true
				}
				if math.Abs(candidateScore) >= 4.0 {
					candidateDetected = true
				}
				if candidateRun.ReadyMask[index] {
					anyReady = true
				}
				if candidateRun.FeatureSizes[index] > 0 {
					anyFeature = true
				}
				if candidateRun.ModelsAvailable[index] > maxModelsAvailable {
					maxModelsAvailable = candidateRun.ModelsAvailable[index]
				}
				if candidateRun.AnomalousFractions[index] > maxAnomalousFraction {
					maxAnomalousFraction = candidateRun.AnomalousFractions[index]
				}
				if candidateRun.QuorumRatios[index] > maxQuorumRatio {
					maxQuorumRatio = candidateRun.QuorumRatios[index]
					modelsAtBest = candidateRun.ModelsAvailable[index]
				}
				if math.Abs(standardScore) > maxStandardAbsScore {
					maxStandardAbsScore = math.Abs(standardScore)
				}
			}

			if candidateDetected {
				continue
			}

			reason := "below_model_cutoffs"
			switch {
			case commonPointsInWindow == 0:
				reason = "no_common_coverage"
			case !anyFeature:
				reason = "no_valid_features"
			case maxModelsAvailable < config.NetdataMinimumModelsForConsensus:
				reason = "warmup"
			case !anyReady:
				reason = "timestamp_gap"
			case maxAnomalousFraction < config.NetdataConsensusFraction:
				reason = "insufficient_consensus"
			}

			diagnostic := netdataWindowDiagnostic{
				SeriesKey:                series.Evaluation.SeriesKey,
				WindowStart:              window.Start,
				WindowEnd:                window.End,
				MaximumAnomalousFraction: maxAnomalousFraction,
				MaximumQuorumRatio:       maxQuorumRatio,
				MaximumStandardAbsScore:  maxStandardAbsScore,
				ModelsAvailableAtBest:    modelsAtBest,
				FirstCandidateScore:      firstCandidateScore,
				Reason:                   reason,
				StandardOnly:             standardDetected,
			}
			diagnostics = append(diagnostics, diagnostic)
		}
	}

	return diagnostics
}

func hashNABSeriesKey(value string) uint32 {
	hasher := fnvHash32a()
	hasher.WriteString(value)
	return hasher.Sum32()
}

type fnv32aHasher struct {
	sum uint32
}

func fnvHash32a() *fnv32aHasher {
	return &fnv32aHasher{sum: 2166136261}
}

func (hasher *fnv32aHasher) WriteString(value string) {
	for _, b := range []byte(value) {
		hasher.sum ^= uint32(b)
		hasher.sum *= 16777619
	}
}

func (hasher *fnv32aHasher) Sum32() uint32 {
	return hasher.sum
}

func configPtr(config mlConfig) *mlConfig {
	return &config
}
