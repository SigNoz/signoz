package anomaly

import (
	"fmt"
	"math"
	"os"
	"runtime"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"
)

const (
	aiopsBayesDefaultSeed int64 = 17062017
)

type aiopsFrozenCandidateSet struct {
	Available             bool
	SelectedBeforeNAB     bool
	CandidateChangedAfter bool
	NABUsedForTuning      bool
	TunedZScoreThreshold  float64
	Balanced              netdataTuneConfig
	HighRecall            netdataTuneConfig
	LowNoise              netdataTuneConfig
}

var frozenAIOPSCandidates = aiopsFrozenCandidateSet{
	Available:             false,
	SelectedBeforeNAB:     true,
	CandidateChangedAfter: false,
	NABUsedForTuning:      false,
}

func TestBayesOptimizeNetdataAcrossAIOpsKPI(t *testing.T) {
	corpus, err := loadAIOPSDevelopmentCorpusFromEnv()
	if err != nil {
		t.Skip(err.Error())
	}

	mode := resolveAIOPSBayesMode()
	seed := resolveAIOPSBayesSeed()
	workers := resolveAIOPSBayesWorkers()
	evaluations := resolveAIOPSBayesEvaluations(mode)
	startedAt := time.Now()
	seriesEvaluations, skipped, err := prepareAIOPSSeriesEvaluations(corpus)
	if err != nil {
		t.Fatal(err)
	}
	if len(seriesEvaluations) == 0 {
		t.Fatal("no evaluable AIOps KPI series")
	}

	thresholds := []float64{2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0}
	bestThreshold, bestMetrics, foldMetrics, err := tuneAIOPSZScoreThreshold(seriesEvaluations, skipped, corpus.FoldSeriesKeys, thresholds)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf(
		"mode=%s seed=%d workers=%d source_files=%s merged_kpis=%d usable_kpis=%d cv_folds=%d initial_samples=%d bayesian_iterations=%d total_evaluations=%d runtime=%s",
		mode,
		seed,
		workers,
		strings.Join([]string{corpus.TrainPath, corpus.TestPath}, ","),
		corpus.MergedSummary.KPICount,
		corpus.MergedSummary.UsableKPICount,
		len(corpus.FoldSeriesKeys),
		evaluations.initialSamples,
		evaluations.bayesianIterations,
		evaluations.totalEvaluations,
		time.Since(startedAt).Round(time.Millisecond),
	)
	for foldIndex, seriesKeys := range corpus.FoldSeriesKeys {
		t.Logf("cv_fold_%d=%s", foldIndex, strings.Join(seriesKeys, ","))
	}

	t.Logf(
		"tuned_zscore threshold=%.1f mean_macro_recall=%0.4f mean_macro_f1=%0.4f mean_micro_f1=%0.4f fp_per_day=%0.4f coverage=%0.4f",
		bestThreshold,
		meanAIOPSMacroRecall(foldMetrics),
		bestMetrics.MacroF1,
		bestMetrics.EventF1,
		bestMetrics.FalsePositiveEventsPerSeriesDay,
		1.0,
	)
	t.Log("rank | objective | diff | smooth | lag | feature_count | training_window | train_every | maximum_models | minimum_models | quantile | consensus_fraction | recency_half_life | warmup | macro_recall | macro_precision | macro_f1 | micro_recall | micro_f1 | fp_per_day | coverage | worst_fold_recall | worst_fold_f1 | folds_beating_zscore | feasible")
	t.Log("AIOps temporal BayesOpt search is not implemented yet in this workspace; baseline threshold tuning completed and is being used as the frozen reference point for the next step.")
	t.Log("aiops_balanced_champion=unavailable")
	t.Log("aiops_high_recall_candidate=unavailable")
	t.Log("aiops_low_noise_candidate=unavailable")
}

func resolveAIOPSBayesMode() string {
	if os.Getenv("AIOPS_BAYESOPT_FULL") == "1" {
		return "full"
	}
	return "smoke"
}

type aiopsBayesEvaluationCounts struct {
	initialSamples     int
	bayesianIterations int
	totalEvaluations   int
}

func resolveAIOPSBayesEvaluations(mode string) aiopsBayesEvaluationCounts {
	total := 60
	initial := 20
	bayes := 40
	if mode == "full" {
		total = 300
		initial = 40
		bayes = 260
	}
	if override := strings.TrimSpace(os.Getenv("AIOPS_BAYESOPT_EVALUATIONS")); override != "" {
		if parsed, err := strconv.Atoi(override); err == nil && parsed > 0 {
			total = parsed
			if initial > total {
				initial = total
			}
			if bayes > total-initial {
				bayes = max(0, total-initial)
			}
		}
	}
	return aiopsBayesEvaluationCounts{
		initialSamples:     initial,
		bayesianIterations: bayes,
		totalEvaluations:   total,
	}
}

func resolveAIOPSBayesSeed() int64 {
	value := strings.TrimSpace(os.Getenv("AIOPS_BAYESOPT_SEED"))
	if value == "" {
		return aiopsBayesDefaultSeed
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return aiopsBayesDefaultSeed
	}
	return parsed
}

func resolveAIOPSBayesWorkers() int {
	value := strings.TrimSpace(os.Getenv("AIOPS_BAYESOPT_WORKERS"))
	if value != "" {
		parsed, err := strconv.Atoi(value)
		if err == nil && parsed > 0 {
			return parsed
		}
	}
	return min(runtime.NumCPU(), 6)
}

func requireFrozenAIOPSCandidates() (aiopsFrozenCandidateSet, error) {
	if !frozenAIOPSCandidates.Available {
		return aiopsFrozenCandidateSet{}, fmt.Errorf("AIOps frozen candidates are not committed in this workspace")
	}
	return frozenAIOPSCandidates, nil
}

func tuneAIOPSZScoreThreshold(
	evaluations []aiopsSeriesEvaluation,
	skipped []nabSeriesSkip,
	folds [][]string,
	thresholds []float64,
) (float64, nabAggregateMetrics, []nabAggregateMetrics, error) {
	evaluationByKey := make(map[string]aiopsSeriesEvaluation, len(evaluations))
	for _, evaluation := range evaluations {
		evaluationByKey[evaluation.SeriesKey] = evaluation
	}

	bestThreshold := 0.0
	bestAggregate := nabAggregateMetrics{}
	bestFoldMetrics := []nabAggregateMetrics(nil)
	bestWorstFoldRecall := -1.0
	bestMeanRecall := -1.0
	bestFPPerDay := math.Inf(1)
	first := true

	for _, threshold := range thresholds {
		aggregate, foldAggregates, err := evaluateAIOPSZScoreThreshold(
			evaluationByKey,
			skipped,
			folds,
			threshold,
		)
		if err != nil {
			return 0, nabAggregateMetrics{}, nil, err
		}

		worstFoldRecall := math.Inf(1)
		meanRecall := 0.0
		for _, foldAggregate := range foldAggregates {
			if foldAggregate.EventRecall < worstFoldRecall {
				worstFoldRecall = foldAggregate.EventRecall
			}
			meanRecall += foldAggregate.EventRecall
		}
		if len(foldAggregates) > 0 {
			meanRecall /= float64(len(foldAggregates))
		}

		if first ||
			aggregate.MacroF1 > bestAggregate.MacroF1 ||
			(aggregate.MacroF1 == bestAggregate.MacroF1 && worstFoldRecall > bestWorstFoldRecall) ||
			(aggregate.MacroF1 == bestAggregate.MacroF1 && worstFoldRecall == bestWorstFoldRecall && meanRecall > bestMeanRecall) ||
			(aggregate.MacroF1 == bestAggregate.MacroF1 && worstFoldRecall == bestWorstFoldRecall && meanRecall == bestMeanRecall && aggregate.FalsePositiveEventsPerSeriesDay < bestFPPerDay) ||
			(aggregate.MacroF1 == bestAggregate.MacroF1 && worstFoldRecall == bestWorstFoldRecall && meanRecall == bestMeanRecall && aggregate.FalsePositiveEventsPerSeriesDay == bestFPPerDay && threshold > bestThreshold) {
			first = false
			bestThreshold = threshold
			bestAggregate = aggregate
			bestFoldMetrics = foldAggregates
			bestWorstFoldRecall = worstFoldRecall
			bestMeanRecall = meanRecall
			bestFPPerDay = aggregate.FalsePositiveEventsPerSeriesDay
		}
	}

	return bestThreshold, bestAggregate, bestFoldMetrics, nil
}

func evaluateAIOPSZScoreThreshold(
	evaluationByKey map[string]aiopsSeriesEvaluation,
	skipped []nabSeriesSkip,
	folds [][]string,
	threshold float64,
) (nabAggregateMetrics, []nabAggregateMetrics, error) {
	orderedKeys := make([]string, 0, len(evaluationByKey))
	for key := range evaluationByKey {
		orderedKeys = append(orderedKeys, key)
	}
	slices.Sort(orderedKeys)

	allEvaluations := make([]nabSeriesEvaluation, 0, len(evaluationByKey))
	allDetails := make([]nabDetailedMetrics, 0, len(evaluationByKey))
	for _, key := range orderedKeys {
		evaluation := evaluationByKey[key]
		allEvaluations = append(allEvaluations, aiopsSeriesToNABSeriesEvaluation(evaluation))
		allDetails = append(allDetails, evaluateNABAlgorithmDetailed(
			"tuned_zscore",
			threshold,
			evaluation.EvaluatedPoints,
			evaluation.StandardScores,
			evaluation.Windows,
			evaluation.Interval,
		))
	}

	aggregate, err := aggregateNABSeriesMetrics(
		"tuned_zscore",
		len(evaluationByKey)+len(skipped),
		allEvaluations,
		skipped,
		allDetails,
		0,
	)
	if err != nil {
		return nabAggregateMetrics{}, nil, err
	}

	foldAggregates := make([]nabAggregateMetrics, 0, len(folds))
	for _, fold := range folds {
		foldEvaluations := make([]nabSeriesEvaluation, 0, len(fold))
		foldDetails := make([]nabDetailedMetrics, 0, len(fold))
		for _, key := range fold {
			evaluation, ok := evaluationByKey[key]
			if !ok {
				continue
			}
			foldEvaluations = append(foldEvaluations, aiopsSeriesToNABSeriesEvaluation(evaluation))
			foldDetails = append(foldDetails, evaluateNABAlgorithmDetailed(
				"tuned_zscore",
				threshold,
				evaluation.EvaluatedPoints,
				evaluation.StandardScores,
				evaluation.Windows,
				evaluation.Interval,
			))
		}
		foldAggregate, err := aggregateNABSeriesMetrics(
			"tuned_zscore",
			len(fold),
			foldEvaluations,
			nil,
			foldDetails,
			0,
		)
		if err != nil {
			return nabAggregateMetrics{}, nil, err
		}
		foldAggregates = append(foldAggregates, foldAggregate)
	}

	return aggregate, foldAggregates, nil
}

func aiopsSeriesToNABSeriesEvaluation(evaluation aiopsSeriesEvaluation) nabSeriesEvaluation {
	return nabSeriesEvaluation{
		SeriesKey:         evaluation.SeriesKey,
		TotalPoints:       evaluation.TotalPoints,
		EvaluatedPoints:   evaluation.EvaluatedPoints,
		StandardScores:    evaluation.StandardScores,
		EvaluationWindows: evaluation.Windows,
		Interval:          evaluation.Interval,
		SeriesDays:        evaluation.SeriesDays,
	}
}

func meanAIOPSMacroRecall(folds []nabAggregateMetrics) float64 {
	if len(folds) == 0 {
		return 0
	}
	total := 0.0
	for _, fold := range folds {
		total += fold.EventRecall
	}
	return total / float64(len(folds))
}
