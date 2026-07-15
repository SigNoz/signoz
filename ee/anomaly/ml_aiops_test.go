package anomaly

import (
	"encoding/csv"
	"fmt"
	"hash/fnv"
	"io"
	"math"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"
)

type aiopsKPIPoint struct {
	Timestamp time.Time
	Value     float64
	Label     bool
	Source    string
}

type aiopsKPISeries struct {
	ID               string
	Points           []aiopsKPIPoint
	ExpectedInterval time.Duration
	SegmentCount     int
	GapCount         int
}

type aiopsCSVSchema struct {
	Headers         []string
	TimestampColumn string
	ValueColumn     string
	LabelColumn     string
	KPIColumn       string
}

type aiopsCSVSummary struct {
	Files                []string
	Rows                 int
	ValidRows            int
	RejectedRows         int
	KPICount             int
	UsableKPICount       int
	SkippedKPICount      int
	SharedKPIs           int
	TrainOnlyKPIs        int
	TestOnlyKPIs         int
	TotalPoints          int
	MinimumPoints        int
	MedianPoints         int
	P95Points            int
	MaximumPoints        int
	MinimumDuration      time.Duration
	MedianDuration       time.Duration
	MaximumDuration      time.Duration
	IntervalDistribution string
	GapCount             int
	SegmentCount         int
	AnomalousPoints      int
	AnomalyPointFraction float64
	AnomalyEvents        int
	ZeroAnomalyKPIs      int
}

type aiopsSkippedKPI struct {
	ID     string
	Reason string
}

type aiopsSharedKPIDiagnostic struct {
	ID                string
	TrainMaxTimestamp time.Time
	TestMinTimestamp  time.Time
	TemporalRelation  string
}

type aiopsDevelopmentCorpus struct {
	TrainPath           string
	TestPath            string
	TrainSchema         aiopsCSVSchema
	TestSchema          aiopsCSVSchema
	TestUsedForCV       bool
	TestUsedForCVReason string
	TrainSummary        aiopsCSVSummary
	TestSummary         aiopsCSVSummary
	MergedSummary       aiopsCSVSummary
	MergedSeries        []aiopsKPISeries
	SkippedKPIs         []aiopsSkippedKPI
	SharedKPIs          []aiopsSharedKPIDiagnostic
	FoldSeriesKeys      [][]string
}

type aiopsSeriesEvaluation struct {
	SeriesKey       string
	TotalPoints     int
	EvaluatedPoints []nabPoint
	StandardScores  []float64
	Windows         []nabWindow
	Interval        time.Duration
	SeriesDays      float64
}

type aiopsCSVRow struct {
	KPIID string
	Point aiopsKPIPoint
	Line  int
}

func TestLoadAIOpsHeadersAndSummary(t *testing.T) {
	corpus, err := loadAIOPSDevelopmentCorpusFromEnv()
	if err != nil {
		t.Skip(err.Error())
	}

	t.Logf("train_headers=%s", strings.Join(corpus.TrainSchema.Headers, ","))
	t.Logf("test_headers=%s", strings.Join(corpus.TestSchema.Headers, ","))
	t.Logf("train_timestamp_column=%s", corpus.TrainSchema.TimestampColumn)
	t.Logf("train_value_column=%s", corpus.TrainSchema.ValueColumn)
	t.Logf("train_label_column=%s", corpus.TrainSchema.LabelColumn)
	t.Logf("train_kpi_column=%s", corpus.TrainSchema.KPIColumn)
	t.Logf("test_timestamp_column=%s", corpus.TestSchema.TimestampColumn)
	t.Logf("test_value_column=%s", corpus.TestSchema.ValueColumn)
	t.Logf("test_label_column=%s", corpus.TestSchema.LabelColumn)
	t.Logf("test_kpi_column=%s", corpus.TestSchema.KPIColumn)
	t.Logf("aiops_test_used_for_cv=%t", corpus.TestUsedForCV)
	if corpus.TestUsedForCVReason != "" {
		t.Logf("reason=%s", corpus.TestUsedForCVReason)
	}
	t.Logf("AIOps train summary: %s", formatAIOPSSummary(corpus.TrainSummary))
	t.Logf("AIOps test summary: %s", formatAIOPSSummary(corpus.TestSummary))
	t.Logf("AIOps merged development corpus summary: %s", formatAIOPSSummary(corpus.MergedSummary))
	for _, skipped := range corpus.SkippedKPIs {
		t.Logf("skipped_kpi id=%s reason=%s", skipped.ID, skipped.Reason)
	}
	for _, shared := range corpus.SharedKPIs {
		t.Logf(
			"shared_kpi id=%s train_max_timestamp=%s test_min_timestamp=%s relation=%s",
			shared.ID,
			shared.TrainMaxTimestamp.Format(time.RFC3339),
			shared.TestMinTimestamp.Format(time.RFC3339),
			shared.TemporalRelation,
		)
	}
}

func TestAIOpsGroupedCVFolds(t *testing.T) {
	corpus, err := loadAIOPSDevelopmentCorpusFromEnv()
	if err != nil {
		t.Skip(err.Error())
	}

	if len(corpus.FoldSeriesKeys) == 0 {
		t.Fatal("AIOps CV folds are empty")
	}

	seen := make(map[string]int)
	foldsWithAnomalies := 0
	for foldIndex, seriesKeys := range corpus.FoldSeriesKeys {
		if len(seriesKeys) == 0 {
			t.Fatalf("fold %d is empty", foldIndex)
		}

		points := 0
		seriesDays := 0.0
		segments := 0
		gaps := 0
		anomalyEvents := 0
		zeroAnomalyKPIs := 0
		for _, key := range seriesKeys {
			seen[key]++
			series := findAIOPSSeriesByID(corpus.MergedSeries, key)
			if series == nil {
				t.Fatalf("series %s is missing from merged corpus", key)
			}
			points += len(series.Points)
			seriesDays += aiopsSeriesDays(*series)
			segments += series.SegmentCount
			gaps += series.GapCount
			events := countAIOPSTrueEvents(*series)
			anomalyEvents += events
			if events == 0 {
				zeroAnomalyKPIs++
			}
		}
		if anomalyEvents > 0 {
			foldsWithAnomalies++
		}
		t.Logf(
			"fold=%d kpi_ids=%s points=%d series_days=%.4f segments=%d gaps=%d anomaly_events=%d zero_anomaly_kpis=%d",
			foldIndex,
			strings.Join(seriesKeys, ","),
			points,
			seriesDays,
			segments,
			gaps,
			anomalyEvents,
			zeroAnomalyKPIs,
		)
	}

	for _, series := range corpus.MergedSeries {
		if seen[series.ID] != 1 {
			t.Fatalf("series %s appears in %d folds", series.ID, seen[series.ID])
		}
	}
	if foldsWithAnomalies < min(3, len(corpus.FoldSeriesKeys)) {
		t.Fatalf("not enough anomaly-bearing folds: got %d", foldsWithAnomalies)
	}
}

func loadAIOPSDevelopmentCorpusFromEnv() (aiopsDevelopmentCorpus, error) {
	root := strings.TrimSpace(os.Getenv("AIOPS_KPI_ROOT"))
	if root == "" {
		return aiopsDevelopmentCorpus{}, fmt.Errorf("AIOPS_KPI_ROOT is not configured")
	}

	if _, err := os.Stat(root); err != nil {
		if os.IsNotExist(err) {
			return aiopsDevelopmentCorpus{}, fmt.Errorf("AIOPS_KPI_ROOT does not exist: %s", root)
		}
		return aiopsDevelopmentCorpus{}, err
	}

	return loadAIOPSDevelopmentCorpus(root)
}

func loadAIOPSDevelopmentCorpus(root string) (aiopsDevelopmentCorpus, error) {
	trainPath := filepath.Join(root, "Preliminary_dataset", "train.csv")
	testPath := filepath.Join(root, "Preliminary_dataset", "test.csv")

	trainRows, trainSchema, trainHeaders, err := readAIOPSCSV(trainPath, "train.csv", true)
	if err != nil {
		return aiopsDevelopmentCorpus{}, err
	}

	testRows, testSchema, testHeaders, err := readAIOPSCSV(testPath, "test.csv", false)
	if err != nil {
		return aiopsDevelopmentCorpus{}, err
	}

	sharedDiagnostics := buildAIOPSSharedKPIDiagnostics(trainRows, testRows)
	testUsedForCV := testSchema.LabelColumn != ""
	testUsedReason := ""
	if !testUsedForCV {
		testUsedReason = "missing_labels"
	}

	mergedSeries, skipped, err := mergeAIOPSRows(trainRows, testRows, testUsedForCV)
	if err != nil {
		return aiopsDevelopmentCorpus{}, err
	}

	folds, err := buildAIOPSGroupedCVFolds(mergedSeries)
	if err != nil {
		return aiopsDevelopmentCorpus{}, err
	}

	trainSummary := summarizeAIOPSRows(trainRows, []string{trainPath}, nil, map[string]struct{}{}, trainHeaders)
	testSummary := summarizeAIOPSRows(testRows, []string{testPath}, nil, map[string]struct{}{}, testHeaders)
	mergedSummary := summarizeAIOPSSeries(
		mergedSeries,
		[]string{trainPath, testPath},
		skipped,
		sharedDiagnostics,
		trainRows,
		testRows,
		testUsedForCV,
	)

	return aiopsDevelopmentCorpus{
		TrainPath:           trainPath,
		TestPath:            testPath,
		TrainSchema:         trainSchema,
		TestSchema:          testSchema,
		TestUsedForCV:       testUsedForCV,
		TestUsedForCVReason: testUsedReason,
		TrainSummary:        trainSummary,
		TestSummary:         testSummary,
		MergedSummary:       mergedSummary,
		MergedSeries:        mergedSeries,
		SkippedKPIs:         skipped,
		SharedKPIs:          sharedDiagnostics,
		FoldSeriesKeys:      folds,
	}, nil
}

func readAIOPSCSV(path string, source string, requireLabel bool) ([]aiopsCSVRow, aiopsCSVSchema, []string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, aiopsCSVSchema{}, nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	headers, err := reader.Read()
	if err != nil {
		return nil, aiopsCSVSchema{}, nil, fmt.Errorf("read %s header: %w", path, err)
	}
	normalizedHeaders := normalizeAIOPSHeaders(headers)
	schema, err := detectAIOPSCSVSchema(normalizedHeaders, requireLabel)
	if err != nil {
		return nil, aiopsCSVSchema{}, normalizedHeaders, fmt.Errorf("%s headers=%v: %w", path, normalizedHeaders, err)
	}
	schema.Headers = normalizedHeaders

	rows := make([]aiopsCSVRow, 0)
	line := 1
	for {
		record, err := reader.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
			return nil, aiopsCSVSchema{}, normalizedHeaders, fmt.Errorf("read %s row %d: %w", path, line+1, err)
		}
		line++
		row, err := parseAIOPSCSVRecord(record, normalizedHeaders, schema, source, line)
		if err != nil {
			return nil, aiopsCSVSchema{}, normalizedHeaders, err
		}
		rows = append(rows, row)
	}

	return rows, schema, normalizedHeaders, nil
}

func normalizeAIOPSHeaders(headers []string) []string {
	normalized := make([]string, 0, len(headers))
	for index, header := range headers {
		value := strings.TrimSpace(header)
		if index == 0 {
			value = strings.TrimPrefix(value, "\ufeff")
		}
		normalized = append(normalized, value)
	}
	return normalized
}

func detectAIOPSCSVSchema(headers []string, requireLabel bool) (aiopsCSVSchema, error) {
	indexByAlias := make(map[string]string, len(headers))
	for _, header := range headers {
		indexByAlias[strings.ToLower(strings.TrimSpace(header))] = header
	}

	schema := aiopsCSVSchema{
		TimestampColumn: firstPresentAIOPSColumn(indexByAlias, []string{"timestamp", "time", "ts"}),
		ValueColumn:     firstPresentAIOPSColumn(indexByAlias, []string{"value"}),
		LabelColumn:     firstPresentAIOPSColumn(indexByAlias, []string{"label", "anomaly", "is_anomaly"}),
		KPIColumn:       firstPresentAIOPSColumn(indexByAlias, []string{"kpi id", "kpi_id", "kpiid", "kpi"}),
	}

	switch {
	case schema.TimestampColumn == "":
		return aiopsCSVSchema{}, fmt.Errorf("missing timestamp column")
	case schema.ValueColumn == "":
		return aiopsCSVSchema{}, fmt.Errorf("missing value column")
	case schema.KPIColumn == "":
		return aiopsCSVSchema{}, fmt.Errorf("missing KPI ID column")
	case requireLabel && schema.LabelColumn == "":
		return aiopsCSVSchema{}, fmt.Errorf("missing label column")
	}

	return schema, nil
}

func firstPresentAIOPSColumn(indexByAlias map[string]string, aliases []string) string {
	for _, alias := range aliases {
		if column, ok := indexByAlias[strings.ToLower(alias)]; ok {
			return column
		}
	}
	return ""
}

func parseAIOPSCSVRecord(record []string, headers []string, schema aiopsCSVSchema, source string, line int) (aiopsCSVRow, error) {
	rowValues := make(map[string]string, len(headers))
	for index, header := range headers {
		if index < len(record) {
			rowValues[header] = strings.TrimSpace(record[index])
		}
	}

	kpiID := rowValues[schema.KPIColumn]
	if kpiID == "" {
		return aiopsCSVRow{}, fmt.Errorf("%s row %d: empty KPI ID", source, line)
	}

	timestamp, err := parseAIOPSTimestamp(rowValues[schema.TimestampColumn])
	if err != nil {
		return aiopsCSVRow{}, fmt.Errorf("%s row %d: parse timestamp: %w", source, line, err)
	}

	value, err := strconv.ParseFloat(rowValues[schema.ValueColumn], 64)
	if err != nil {
		return aiopsCSVRow{}, fmt.Errorf("%s row %d: parse value: %w", source, line, err)
	}
	if !isFinite(value) {
		return aiopsCSVRow{}, fmt.Errorf("%s row %d: value is not finite", source, line)
	}

	label := false
	if schema.LabelColumn != "" {
		label, err = parseAIOPSLabel(rowValues[schema.LabelColumn])
		if err != nil {
			return aiopsCSVRow{}, fmt.Errorf("%s row %d: %w", source, line, err)
		}
	}

	return aiopsCSVRow{
		KPIID: strings.TrimSpace(kpiID),
		Point: aiopsKPIPoint{
			Timestamp: timestamp,
			Value:     value,
			Label:     label,
			Source:    source,
		},
		Line: line,
	}, nil
}

func parseAIOPSTimestamp(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, fmt.Errorf("empty timestamp")
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return time.Time{}, err
	}
	if parsed > 1_000_000_000_000 {
		return time.UnixMilli(parsed).UTC(), nil
	}
	return time.Unix(parsed, 0).UTC(), nil
}

func parseAIOPSLabel(value string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "0", "false":
		return false, nil
	case "1", "true":
		return true, nil
	default:
		return false, fmt.Errorf("invalid label value %q", value)
	}
}

func buildAIOPSSharedKPIDiagnostics(trainRows []aiopsCSVRow, testRows []aiopsCSVRow) []aiopsSharedKPIDiagnostic {
	trainRanges := buildAIOPSKPIRanges(trainRows)
	testRanges := buildAIOPSKPIRanges(testRows)
	shared := make([]aiopsSharedKPIDiagnostic, 0)
	for kpiID, trainRange := range trainRanges {
		testRange, ok := testRanges[kpiID]
		if !ok {
			continue
		}

		relation := "ordered"
		switch {
		case trainRange.max.Before(testRange.min):
			relation = "ordered"
		case testRange.max.Before(trainRange.min):
			relation = "reversed"
		default:
			relation = "overlapping"
		}

		shared = append(shared, aiopsSharedKPIDiagnostic{
			ID:                kpiID,
			TrainMaxTimestamp: trainRange.max,
			TestMinTimestamp:  testRange.min,
			TemporalRelation:  relation,
		})
	}
	sort.Slice(shared, func(left, right int) bool {
		return shared[left].ID < shared[right].ID
	})
	return shared
}

type aiopsTimeRange struct {
	min time.Time
	max time.Time
}

func buildAIOPSKPIRanges(rows []aiopsCSVRow) map[string]aiopsTimeRange {
	ranges := make(map[string]aiopsTimeRange)
	for _, row := range rows {
		existing, ok := ranges[row.KPIID]
		if !ok {
			ranges[row.KPIID] = aiopsTimeRange{min: row.Point.Timestamp, max: row.Point.Timestamp}
			continue
		}
		if row.Point.Timestamp.Before(existing.min) {
			existing.min = row.Point.Timestamp
		}
		if row.Point.Timestamp.After(existing.max) {
			existing.max = row.Point.Timestamp
		}
		ranges[row.KPIID] = existing
	}
	return ranges
}

func mergeAIOPSRows(trainRows []aiopsCSVRow, testRows []aiopsCSVRow, includeTest bool) ([]aiopsKPISeries, []aiopsSkippedKPI, error) {
	grouped := make(map[string][]aiopsKPIPoint)
	for _, row := range trainRows {
		grouped[row.KPIID] = append(grouped[row.KPIID], row.Point)
	}
	if includeTest {
		for _, row := range testRows {
			grouped[row.KPIID] = append(grouped[row.KPIID], row.Point)
		}
	}

	seriesIDs := make([]string, 0, len(grouped))
	for kpiID := range grouped {
		seriesIDs = append(seriesIDs, kpiID)
	}
	slices.Sort(seriesIDs)

	seriesList := make([]aiopsKPISeries, 0, len(seriesIDs))
	skipped := make([]aiopsSkippedKPI, 0)
	for _, kpiID := range seriesIDs {
		points := slices.Clone(grouped[kpiID])
		sort.Slice(points, func(left, right int) bool {
			if points[left].Timestamp.Equal(points[right].Timestamp) {
				if points[left].Value != points[right].Value {
					return points[left].Value < points[right].Value
				}
				if points[left].Label != points[right].Label {
					return !points[left].Label && points[right].Label
				}
				return points[left].Source < points[right].Source
			}
			return points[left].Timestamp.Before(points[right].Timestamp)
		})

		deduped := make([]aiopsKPIPoint, 0, len(points))
		conflict := ""
		for _, point := range points {
			if len(deduped) == 0 {
				deduped = append(deduped, point)
				continue
			}
			last := deduped[len(deduped)-1]
			if point.Timestamp.Equal(last.Timestamp) {
				if point.Value == last.Value && point.Label == last.Label {
					continue
				}
				conflict = fmt.Sprintf("conflicting duplicate at %s", point.Timestamp.Format(time.RFC3339))
				break
			}
			deduped = append(deduped, point)
		}
		if conflict != "" {
			skipped = append(skipped, aiopsSkippedKPI{ID: kpiID, Reason: conflict})
			continue
		}

		expectedInterval, gapCount, segmentCount := inferAIOPSSeriesShape(deduped)
		if expectedInterval <= 0 {
			skipped = append(skipped, aiopsSkippedKPI{ID: kpiID, Reason: "not enough valid positive deltas"})
			continue
		}

		seriesList = append(seriesList, aiopsKPISeries{
			ID:               kpiID,
			Points:           deduped,
			ExpectedInterval: expectedInterval,
			SegmentCount:     segmentCount,
			GapCount:         gapCount,
		})
	}

	return seriesList, skipped, nil
}

func inferAIOPSSeriesShape(points []aiopsKPIPoint) (time.Duration, int, int) {
	if len(points) < 2 {
		return 0, 0, 1
	}

	deltas := make([]int64, 0, len(points)-1)
	for index := 1; index < len(points); index++ {
		delta := points[index].Timestamp.Sub(points[index-1].Timestamp)
		if delta > 0 {
			deltas = append(deltas, delta.Milliseconds())
		}
	}
	if len(deltas) == 0 {
		return 0, 0, 1
	}

	sort.Slice(deltas, func(left, right int) bool { return deltas[left] < deltas[right] })
	medianDelta := deltas[len(deltas)/2]
	expectedInterval := time.Duration(medianDelta) * time.Millisecond

	gapCount := 0
	segmentCount := 1
	for index := 1; index < len(points); index++ {
		delta := points[index].Timestamp.Sub(points[index-1].Timestamp)
		if delta > expectedInterval*3/2 {
			gapCount++
			segmentCount++
		}
	}

	return expectedInterval, gapCount, segmentCount
}

func summarizeAIOPSRows(rows []aiopsCSVRow, files []string, skipped []aiopsSkippedKPI, shared map[string]struct{}, headers []string) aiopsCSVSummary {
	grouped := make(map[string][]aiopsKPIPoint)
	for _, row := range rows {
		grouped[row.KPIID] = append(grouped[row.KPIID], row.Point)
	}

	seriesList := make([]aiopsKPISeries, 0, len(grouped))
	for kpiID, points := range grouped {
		sort.Slice(points, func(left, right int) bool {
			return points[left].Timestamp.Before(points[right].Timestamp)
		})
		expectedInterval, gapCount, segmentCount := inferAIOPSSeriesShape(points)
		seriesList = append(seriesList, aiopsKPISeries{
			ID:               kpiID,
			Points:           points,
			ExpectedInterval: expectedInterval,
			SegmentCount:     segmentCount,
			GapCount:         gapCount,
		})
	}
	return summarizeAIOPSSeries(seriesList, files, skipped, nil, rows, nil, true)
}

func summarizeAIOPSSeries(
	seriesList []aiopsKPISeries,
	files []string,
	skipped []aiopsSkippedKPI,
	shared []aiopsSharedKPIDiagnostic,
	trainRows []aiopsCSVRow,
	testRows []aiopsCSVRow,
	testUsedForCV bool,
) aiopsCSVSummary {
	summary := aiopsCSVSummary{
		Files:           slices.Clone(files),
		Rows:            len(trainRows) + len(testRows),
		ValidRows:       len(trainRows) + len(testRows),
		KPICount:        len(seriesList) + len(skipped),
		UsableKPICount:  len(seriesList),
		SkippedKPICount: len(skipped),
		SharedKPIs:      len(shared),
	}

	trainSet := make(map[string]struct{})
	for _, row := range trainRows {
		trainSet[row.KPIID] = struct{}{}
	}
	testSet := make(map[string]struct{})
	for _, row := range testRows {
		testSet[row.KPIID] = struct{}{}
	}
	for key := range trainSet {
		if _, ok := testSet[key]; ok {
			continue
		}
		summary.TrainOnlyKPIs++
	}
	for key := range testSet {
		if _, ok := trainSet[key]; ok {
			continue
		}
		summary.TestOnlyKPIs++
	}

	pointCounts := make([]int, 0, len(seriesList))
	durations := make([]time.Duration, 0, len(seriesList))
	intervalCounts := make(map[time.Duration]int)
	intervalKeys := make([]time.Duration, 0)
	for _, series := range seriesList {
		pointCounts = append(pointCounts, len(series.Points))
		summary.TotalPoints += len(series.Points)
		summary.GapCount += series.GapCount
		summary.SegmentCount += series.SegmentCount
		if len(series.Points) > 0 {
			duration := series.Points[len(series.Points)-1].Timestamp.Sub(series.Points[0].Timestamp)
			durations = append(durations, duration)
			if series.ExpectedInterval > 0 {
				if _, ok := intervalCounts[series.ExpectedInterval]; !ok {
					intervalKeys = append(intervalKeys, series.ExpectedInterval)
				}
				intervalCounts[series.ExpectedInterval]++
			}
		}
		eventCount := countAIOPSTrueEvents(series)
		if eventCount == 0 {
			summary.ZeroAnomalyKPIs++
		}
		summary.AnomalyEvents += eventCount
		for _, point := range series.Points {
			if point.Label {
				summary.AnomalousPoints++
			}
		}
	}

	if len(pointCounts) > 0 {
		sort.Ints(pointCounts)
		summary.MinimumPoints = pointCounts[0]
		summary.MedianPoints = pointCounts[len(pointCounts)/2]
		summary.P95Points = pointCounts[int(math.Min(float64(len(pointCounts)-1), math.Ceil(0.95*float64(len(pointCounts)))-1))]
		summary.MaximumPoints = pointCounts[len(pointCounts)-1]
	}
	if len(durations) > 0 {
		sort.Slice(durations, func(left, right int) bool { return durations[left] < durations[right] })
		summary.MinimumDuration = durations[0]
		summary.MedianDuration = durations[len(durations)/2]
		summary.MaximumDuration = durations[len(durations)-1]
	}
	sort.Slice(intervalKeys, func(left, right int) bool { return intervalKeys[left] < intervalKeys[right] })
	intervalParts := make([]string, 0, len(intervalKeys))
	for _, interval := range intervalKeys {
		intervalParts = append(intervalParts, fmt.Sprintf("%s:%d", interval, intervalCounts[interval]))
	}
	summary.IntervalDistribution = strings.Join(intervalParts, ",")
	if summary.TotalPoints > 0 {
		summary.AnomalyPointFraction = float64(summary.AnomalousPoints) / float64(summary.TotalPoints)
	}

	if !testUsedForCV {
		summary.ValidRows = len(trainRows)
		summary.Rows = len(trainRows) + len(testRows)
	}
	return summary
}

func buildAIOPSGroupedCVFolds(seriesList []aiopsKPISeries) ([][]string, error) {
	if len(seriesList) == 0 {
		return nil, fmt.Errorf("no usable AIOps series")
	}

	foldCount := 5
	folds := make([][]string, foldCount)
	foldAnomalies := make([]int, foldCount)
	foldZeroAnomaly := make([]int, foldCount)
	for _, series := range seriesList {
		fold := int(hashAIOPSSeriesKey(series.ID+":aiops-cv-v2") % uint64(foldCount))
		folds[fold] = append(folds[fold], series.ID)
		if countAIOPSTrueEvents(series) > 0 {
			foldAnomalies[fold]++
		} else {
			foldZeroAnomaly[fold]++
		}
	}

	nonEmpty := 0
	foldsWithAnomalies := 0
	for index := range folds {
		slices.Sort(folds[index])
		if len(folds[index]) > 0 {
			nonEmpty++
		}
		if foldAnomalies[index] > 0 {
			foldsWithAnomalies++
		}
	}

	if nonEmpty == foldCount && foldsWithAnomalies >= 3 {
		return folds, nil
	}

	foldCount = 3
	folds = make([][]string, foldCount)
	for _, series := range seriesList {
		fold := int(hashAIOPSSeriesKey(series.ID+":aiops-cv-v2") % uint64(foldCount))
		folds[fold] = append(folds[fold], series.ID)
	}
	for index := range folds {
		slices.Sort(folds[index])
		if len(folds[index]) == 0 {
			return nil, fmt.Errorf("AIOps 3-fold CV is not possible because fold %d is empty", index)
		}
	}
	return folds, nil
}

func hashAIOPSSeriesKey(value string) uint64 {
	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(value))
	return hasher.Sum64()
}

func findAIOPSSeriesByID(seriesList []aiopsKPISeries, id string) *aiopsKPISeries {
	for index := range seriesList {
		if seriesList[index].ID == id {
			return &seriesList[index]
		}
	}
	return nil
}

func aiopsSeriesDays(series aiopsKPISeries) float64 {
	if len(series.Points) < 2 {
		return 0
	}
	return series.Points[len(series.Points)-1].Timestamp.Sub(series.Points[0].Timestamp).Hours() / 24
}

func countAIOPSTrueEvents(series aiopsKPISeries) int {
	if len(series.Points) == 0 {
		return 0
	}
	eventCount := 0
	inEvent := false
	for index, point := range series.Points {
		continues := false
		if index > 0 && series.ExpectedInterval > 0 {
			delta := point.Timestamp.Sub(series.Points[index-1].Timestamp)
			continues = delta <= series.ExpectedInterval*3/2
		}
		if point.Label {
			if !inEvent || !continues {
				eventCount++
			}
			inEvent = true
			continue
		}
		inEvent = false
	}
	return eventCount
}

func formatAIOPSSummary(summary aiopsCSVSummary) string {
	return fmt.Sprintf(
		"files=%s rows=%d valid_rows=%d rejected_rows=%d kpi_count=%d usable_kpi_count=%d skipped_kpi_count=%d shared_kpis=%d train_only_kpis=%d test_only_kpis=%d total_points=%d minimum_points=%d median_points=%d p95_points=%d maximum_points=%d minimum_duration=%s median_duration=%s maximum_duration=%s interval_distribution=%s gap_count=%d segment_count=%d anomalous_points=%d anomaly_point_fraction=%.6f anomaly_events=%d zero_anomaly_kpis=%d",
		strings.Join(summary.Files, ","),
		summary.Rows,
		summary.ValidRows,
		summary.RejectedRows,
		summary.KPICount,
		summary.UsableKPICount,
		summary.SkippedKPICount,
		summary.SharedKPIs,
		summary.TrainOnlyKPIs,
		summary.TestOnlyKPIs,
		summary.TotalPoints,
		summary.MinimumPoints,
		summary.MedianPoints,
		summary.P95Points,
		summary.MaximumPoints,
		summary.MinimumDuration,
		summary.MedianDuration,
		summary.MaximumDuration,
		summary.IntervalDistribution,
		summary.GapCount,
		summary.SegmentCount,
		summary.AnomalousPoints,
		summary.AnomalyPointFraction,
		summary.AnomalyEvents,
		summary.ZeroAnomalyKPIs,
	)
}

func prepareAIOPSSeriesEvaluations(corpus aiopsDevelopmentCorpus) ([]aiopsSeriesEvaluation, []nabSeriesSkip, error) {
	evaluations := make([]aiopsSeriesEvaluation, 0, len(corpus.MergedSeries))
	skipped := make([]nabSeriesSkip, 0)
	for _, series := range corpus.MergedSeries {
		evaluation, skipReason, err := evaluateAIOPSSeriesStandard(series)
		if err != nil {
			return nil, nil, fmt.Errorf("evaluate AIOps KPI %s: %w", series.ID, err)
		}
		if skipReason != "" {
			skipped = append(skipped, nabSeriesSkip{
				SeriesKey: series.ID,
				Reason:    skipReason,
			})
			continue
		}
		evaluations = append(evaluations, evaluation)
	}
	return evaluations, skipped, nil
}

func evaluateAIOPSSeriesStandard(series aiopsKPISeries) (aiopsSeriesEvaluation, string, error) {
	segments := splitAIOPSSeriesSegments(series)
	evaluatedPoints := make([]nabPoint, 0)
	standardScores := make([]float64, 0)

	for _, segment := range segments {
		if len(segment) < 2 {
			continue
		}

		interval := segment[1].Timestamp.Sub(segment[0].Timestamp)
		if interval <= 0 || 24*time.Hour%interval != 0 {
			continue
		}

		pointsPerDay := int(24 * time.Hour / interval)
		if len(segment) <= 4*pointsPerDay {
			continue
		}

		points := make([]nabPoint, 0, len(segment))
		for _, point := range segment {
			points = append(points, nabPoint{
				Timestamp: point.Timestamp,
				Value:     point.Value,
			})
		}

		segmentEvaluated, segmentScores, err := calculateNABStandardScores(points, pointsPerDay)
		if err != nil {
			continue
		}

		evaluatedPoints = append(evaluatedPoints, segmentEvaluated...)
		standardScores = append(standardScores, segmentScores...)
	}

	if len(evaluatedPoints) == 0 {
		return aiopsSeriesEvaluation{}, "no evaluable segments with four previous days of history", nil
	}

	windows := buildAIOPSEventWindows(series, evaluatedPoints)
	return aiopsSeriesEvaluation{
		SeriesKey:       series.ID,
		TotalPoints:     len(series.Points),
		EvaluatedPoints: evaluatedPoints,
		StandardScores:  standardScores,
		Windows:         windows,
		Interval:        series.ExpectedInterval,
		SeriesDays:      aiopsSeriesDaysFromPoints(evaluatedPoints, series.ExpectedInterval),
	}, "", nil
}

func splitAIOPSSeriesSegments(series aiopsKPISeries) [][]aiopsKPIPoint {
	if len(series.Points) == 0 {
		return nil
	}

	segments := make([][]aiopsKPIPoint, 0, series.SegmentCount)
	start := 0
	for index := 1; index < len(series.Points); index++ {
		if series.ExpectedInterval > 0 &&
			series.Points[index].Timestamp.Sub(series.Points[index-1].Timestamp) > series.ExpectedInterval*3/2 {
			segments = append(segments, slices.Clone(series.Points[start:index]))
			start = index
		}
	}
	segments = append(segments, slices.Clone(series.Points[start:]))
	return segments
}

func buildAIOPSEventWindows(series aiopsKPISeries, evaluatedPoints []nabPoint) []nabWindow {
	windows := make([]nabWindow, 0)
	var currentStart time.Time
	var currentEnd time.Time
	for _, point := range evaluatedPoints {
		if findAIOPSLabelAtTimestamp(series, point.Timestamp) {
			if currentStart.IsZero() {
				currentStart = point.Timestamp
			}
			currentEnd = point.Timestamp
			continue
		}
		if !currentStart.IsZero() {
			windows = append(windows, nabWindow{Start: currentStart, End: currentEnd})
			currentStart = time.Time{}
			currentEnd = time.Time{}
		}
	}
	if !currentStart.IsZero() {
		windows = append(windows, nabWindow{Start: currentStart, End: currentEnd})
	}
	return windows
}

func findAIOPSLabelAtTimestamp(series aiopsKPISeries, timestamp time.Time) bool {
	index := sort.Search(len(series.Points), func(index int) bool {
		return !series.Points[index].Timestamp.Before(timestamp)
	})
	if index >= len(series.Points) || !series.Points[index].Timestamp.Equal(timestamp) {
		return false
	}
	return series.Points[index].Label
}

func aiopsSeriesDaysFromPoints(points []nabPoint, fallbackInterval time.Duration) float64 {
	if len(points) < 2 {
		return 0
	}

	days := points[len(points)-1].Timestamp.Sub(points[0].Timestamp).Hours() / 24
	if days > 0 {
		return days
	}

	return float64(len(points)) * fallbackInterval.Hours() / 24
}
