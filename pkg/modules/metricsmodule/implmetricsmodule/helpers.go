package implmetricsmodule

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func generateMetricMetadataCacheKey(metricName string) string {
	return fmt.Sprintf("metrics_metadata:%s", metricName)
}

func getStatsOrderByColumn(order *qbtypes.OrderBy) (string, string, error) {
	if order == nil {
		return sqlColumnTimeSeries, qbtypes.OrderDirectionDesc.StringValue(), nil
	}

	var columnName string
	switch strings.ToLower(order.Key.Name) {
	case metrictypes.OrderByTimeSeries.StringValue():
		columnName = sqlColumnTimeSeries
	case metrictypes.OrderBySamples.StringValue():
		columnName = sqlColumnSamples
	default:
		return "", "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order column %q", columnName)
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

// enrichStatsWithMetadata enriches metric stats with metadata from the provided metadata map.
func enrichStatsWithMetadata(metricStats []metricsmoduletypes.Stat, metadata map[string]*metricsmoduletypes.MetricMetadata) {
	for i := range metricStats {
		if meta, ok := metadata[metricStats[i].MetricName]; ok {
			metricStats[i].Description = meta.Description
			metricStats[i].MetricType = meta.MetricType
			metricStats[i].MetricUnit = meta.MetricUnit
		}
	}
}
