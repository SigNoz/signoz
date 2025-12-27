package implmetricsexplorer

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// used for mapping the sqlColumns via orderBy
const (
	sqlColumnTimeSeries = "timeseries"
	sqlColumnSamples    = "samples"
)

func generateMetricMetadataCacheKey(metricName string) string {
	return fmt.Sprintf("metrics::metadata::%s", metricName)
}

func getStatsOrderByColumn(order *qbtypes.OrderBy) (string, string, error) {
	if order == nil {
		return sqlColumnSamples, qbtypes.OrderDirectionDesc.StringValue(), nil
	}

	var columnName string
	switch strings.ToLower(order.Key.Name) {
	case metricsexplorertypes.OrderByTimeSeries.StringValue():
		columnName = sqlColumnTimeSeries
	case metricsexplorertypes.OrderBySamples.StringValue():
		columnName = sqlColumnSamples
	default:
		return "", "", errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"unsupported order column %q: supported columns are %q or %q",
			order.Key.Name,
			metricsexplorertypes.OrderByTimeSeries,
			metricsexplorertypes.OrderBySamples,
		)
	}

	// Extract direction from OrderDirection and convert to SQL format (uppercase)
	var direction qbtypes.OrderDirection
	var ok bool
	// Validate direction using OrderDirectionMap
	if direction, ok = qbtypes.OrderDirectionMap[strings.ToLower(order.Direction.StringValue())]; !ok {
		return "", "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order direction %q, should be one of %s, %s", direction, qbtypes.OrderDirectionAsc, qbtypes.OrderDirectionDesc)
	}

	return columnName, direction.StringValue(), nil
}

func extractMissingMetricNamesInMap(metricNames []string, metricMetadataMap map[string]*metricsexplorertypes.MetricMetadata) []string {
	misses := make([]string, 0)
	for _, name := range metricNames {
		if _, ok := metricMetadataMap[name]; !ok {
			misses = append(misses, name)
		}
	}
	return misses
}

// enrichStatsWithMetadata enriches metric stats with metadata from the provided metadata map.
func enrichStatsWithMetadata(metricStats []metricsexplorertypes.Stat, metadata map[string]*metricsexplorertypes.MetricMetadata) {
	for i := range metricStats {
		if meta, ok := metadata[metricStats[i].MetricName]; ok {
			metricStats[i].Description = meta.Description
			metricStats[i].MetricType = meta.MetricType
			metricStats[i].MetricUnit = meta.MetricUnit
		}
	}
}
