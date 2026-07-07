package rules

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

// GenerateMetricQueryCHArgs generates query arguments for metric queries used in tests.
// It calculates the time range, builds time series CTE args, temporal aggregation args,
// and spatial aggregation args to match the actual query builder behavior.
func GenerateMetricQueryCHArgs(
	evalTime time.Time,
	evalWindow time.Duration,
	evalDelay time.Duration,
	metricName string,
	temporality metrictypes.Temporality,
) []interface{} {
	// Calculate time range
	startTime := evalTime.Add(-evalWindow)
	endTime := evalTime

	startMs := startTime.UnixMilli()
	endMs := endTime.UnixMilli()

	// Apply eval delay if present
	if evalDelay > 0 {
		startMs = startMs - int64(evalDelay.Milliseconds())
		endMs = endMs - int64(evalDelay.Milliseconds())
	}

	// Round to nearest minute
	startMs = startMs - (startMs % (60 * 1000))
	endMs = endMs - (endMs % (60 * 1000))

	start := uint64(startMs)
	end := uint64(endMs)

	// Step1: Build time series CTE args

	// Adjust start time to nearest hour
	oneHourInMilliseconds := uint64(time.Hour.Milliseconds())
	// start time for filtering signoz_metrics.time_series_v4 with start time
	timeSeriesCTEStartTime := start - (start % oneHourInMilliseconds)

	queryArgs := []interface{}{
		metricName,
		timeSeriesCTEStartTime,
		end,
	}

	// Add temporality if specified
	if temporality == metrictypes.Unknown {
		temporality = metrictypes.Unspecified
	}
	if temporality != metrictypes.Unknown {
		queryArgs = append(queryArgs, temporality.StringValue())
	}

	// Add normalized flag
	queryArgs = append(queryArgs, false)

	// Step2: Add temporal aggregation args
	// build args for filtering signoz_metrics.distributed_samples_v4 table
	temporalAggArgs := []interface{}{
		metricName,
		start,
		end,
	}
	queryArgs = append(queryArgs, temporalAggArgs...)

	// Add spatial aggregation args
	spatialAggArgs := []interface{}{
		0, // isNaN check
	}
	queryArgs = append(queryArgs, spatialAggArgs...)

	return queryArgs
}
