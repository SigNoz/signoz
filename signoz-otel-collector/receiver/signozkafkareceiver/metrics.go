// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver // import "github.com/SigNoz/signoz-otel-collector/receiver/signozkafkareceiver"

import (
	"go.opencensus.io/stats"
	"go.opencensus.io/stats/view"
	"go.opencensus.io/tag"
)

var (
	tagInstanceName, _ = tag.NewKey("name")

	statMessageCount     = stats.Int64("kafka_receiver_messages", "Number of received messages", stats.UnitDimensionless)
	statMessageOffset    = stats.Int64("kafka_receiver_current_offset", "Current message offset", stats.UnitDimensionless)
	statMessageOffsetLag = stats.Int64("kafka_receiver_offset_lag", "Current offset lag", stats.UnitDimensionless)

	statPartitionStart = stats.Int64("kafka_receiver_partition_start", "Number of started partitions", stats.UnitDimensionless)
	statPartitionClose = stats.Int64("kafka_receiver_partition_close", "Number of finished partitions", stats.UnitDimensionless)

	processingTime = stats.Int64("kafka_receiver_processing_time_milliseconds", "Time taken to process a kafka message in ms", stats.UnitMilliseconds)
)

// MetricViews return metric views for Kafka receiver.
func MetricViews() []*view.View {
	tagKeys := []tag.Key{tagInstanceName}

	countMessages := &view.View{
		Name:        statMessageCount.Name(),
		Measure:     statMessageCount,
		Description: statMessageCount.Description(),
		TagKeys:     tagKeys,
		Aggregation: view.Sum(),
	}

	lastValueOffset := &view.View{
		Name:        statMessageOffset.Name(),
		Measure:     statMessageOffset,
		Description: statMessageOffset.Description(),
		TagKeys:     tagKeys,
		Aggregation: view.LastValue(),
	}

	lastValueOffsetLag := &view.View{
		Name:        statMessageOffsetLag.Name(),
		Measure:     statMessageOffsetLag,
		Description: statMessageOffsetLag.Description(),
		TagKeys:     tagKeys,
		Aggregation: view.LastValue(),
	}

	countPartitionStart := &view.View{
		Name:        statPartitionStart.Name(),
		Measure:     statPartitionStart,
		Description: statPartitionStart.Description(),
		TagKeys:     tagKeys,
		Aggregation: view.Sum(),
	}

	countPartitionClose := &view.View{
		Name:        statPartitionClose.Name(),
		Measure:     statPartitionClose,
		Description: statPartitionClose.Description(),
		TagKeys:     tagKeys,
		Aggregation: view.Sum(),
	}

	processingTimeView := &view.View{
		Name:        processingTime.Name(),
		Measure:     processingTime,
		Description: processingTime.Description(),
		TagKeys:     tagKeys,
		Aggregation: view.Distribution(100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1750, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000),
	}

	return []*view.View{
		countMessages,
		lastValueOffset,
		lastValueOffsetLag,
		countPartitionStart,
		countPartitionClose,
		processingTimeView,
	}
}
