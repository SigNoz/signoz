package querytemplate

import (
	"fmt"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// AssignReservedVars assigns values for go template vars. assumes that
// model.QueryRangeParamsV3.Start and End are Unix Nano timestamps
func AssignReservedVarsV3(queryRangeParams *v3.QueryRangeParamsV3) {
	queryRangeParams.Variables["start_timestamp"] = queryRangeParams.Start / 1000
	queryRangeParams.Variables["end_timestamp"] = queryRangeParams.End / 1000

	queryRangeParams.Variables["start_timestamp_ms"] = queryRangeParams.Start
	queryRangeParams.Variables["end_timestamp_ms"] = queryRangeParams.End

	queryRangeParams.Variables["SIGNOZ_START_TIME"] = queryRangeParams.Start
	queryRangeParams.Variables["SIGNOZ_END_TIME"] = queryRangeParams.End

	queryRangeParams.Variables["start_timestamp_nano"] = queryRangeParams.Start * 1e6
	queryRangeParams.Variables["end_timestamp_nano"] = queryRangeParams.End * 1e6

	queryRangeParams.Variables["start_datetime"] = fmt.Sprintf("toDateTime(%d)", queryRangeParams.Start/1000)
	queryRangeParams.Variables["end_datetime"] = fmt.Sprintf("toDateTime(%d)", queryRangeParams.End/1000)

}
