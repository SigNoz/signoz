// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMetrics(t *testing.T) {
	metricViews := MetricViews()
	viewNames := []string{
		"kafka_receiver_messages",
		"kafka_receiver_current_offset",
		"kafka_receiver_offset_lag",
		"kafka_receiver_partition_start",
		"kafka_receiver_partition_close",
	}
	for i, viewName := range viewNames {
		assert.Equal(t, viewName, metricViews[i].Name)
	}
}
