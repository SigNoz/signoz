package querytemplate

import (
	"fmt"

	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// AssignReservedVars assigns values for go template vars. assumes that
// model.QueryRangeParamsV2.Start and End are Unix Nano timestamps
func AssignReservedVars(metricsQueryRangeParams *model.QueryRangeParamsV2) {
	metricsQueryRangeParams.Variables["start_timestamp"] = metricsQueryRangeParams.Start / 1000
	metricsQueryRangeParams.Variables["end_timestamp"] = metricsQueryRangeParams.End / 1000

	metricsQueryRangeParams.Variables["start_timestamp_ms"] = metricsQueryRangeParams.Start
	metricsQueryRangeParams.Variables["end_timestamp_ms"] = metricsQueryRangeParams.End

	metricsQueryRangeParams.Variables["start_timestamp_nano"] = metricsQueryRangeParams.Start * 1e6
	metricsQueryRangeParams.Variables["end_timestamp_nano"] = metricsQueryRangeParams.End * 1e6

	metricsQueryRangeParams.Variables["start_datetime"] = fmt.Sprintf("toDateTime(%d)", metricsQueryRangeParams.Start/1000)
	metricsQueryRangeParams.Variables["end_datetime"] = fmt.Sprintf("toDateTime(%d)", metricsQueryRangeParams.End/1000)

}

// AssignReservedVars assigns values for go template vars. assumes that
// model.QueryRangeParamsV3.Start and End are Unix Nano timestamps
func AssignReservedVarsV3(metricsQueryRangeParams *v3.QueryRangeParamsV3) {
	metricsQueryRangeParams.Variables["start_timestamp"] = metricsQueryRangeParams.Start / 1000
	metricsQueryRangeParams.Variables["end_timestamp"] = metricsQueryRangeParams.End / 1000

	metricsQueryRangeParams.Variables["start_timestamp_ms"] = metricsQueryRangeParams.Start
	metricsQueryRangeParams.Variables["end_timestamp_ms"] = metricsQueryRangeParams.End

	metricsQueryRangeParams.Variables["start_timestamp_nano"] = metricsQueryRangeParams.Start * 1e6
	metricsQueryRangeParams.Variables["end_timestamp_nano"] = metricsQueryRangeParams.End * 1e6

	metricsQueryRangeParams.Variables["start_datetime"] = fmt.Sprintf("toDateTime(%d)", metricsQueryRangeParams.Start/1000)
	metricsQueryRangeParams.Variables["end_datetime"] = fmt.Sprintf("toDateTime(%d)", metricsQueryRangeParams.End/1000)

}
