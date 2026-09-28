package meterstatementbuilder

import (
	"github.com/SigNoz/signoz/pkg/telemetryschema/metertelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// TableHintsForWindow pins the samples table the builder picks for
// [start, end), so a statement over a piece of that window reads the same
// table.
func TableHintsForWindow(start, end uint64, agg qbtypes.MetricAggregation) *metrictypes.MetricTableHints {
	if agg.TableHints != nil {
		return agg.TableHints
	}
	return &metrictypes.MetricTableHints{
		SamplesTableName: metertelemetryschema.WhichSamplesTableToUse(start, end, agg.Type, agg.TimeAggregation, nil),
	}
}
