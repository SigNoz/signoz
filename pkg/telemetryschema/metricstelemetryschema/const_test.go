package metricstelemetryschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStaleMarkerFilterForSamplesTable(t *testing.T) {
	withFlags := []string{
		SamplesV4TableName, SamplesV4LocalTableName,
		SamplesV4BufferTableName, SamplesV4BufferLocalTableName,
		ExpHistogramTableName, ExpHistogramLocalTableName,
	}
	for _, table := range withFlags {
		assert.Equal(t, "bitAnd(flags, 1) = 0", StaleMarkerFilterForSamplesTable(table), table)
	}

	withoutFlags := []string{
		SamplesV4Agg5mTableName, SamplesV4Agg5mLocalTableName,
		SamplesV4Agg30mTableName, SamplesV4Agg30mLocalTableName,
		SamplesV4ReducedLastTableName, SamplesV4ReducedSumTableName,
	}
	for _, table := range withoutFlags {
		assert.Empty(t, StaleMarkerFilterForSamplesTable(table), table)
	}
}
