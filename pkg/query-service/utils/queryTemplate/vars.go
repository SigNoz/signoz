package querytemplate

import (
	"fmt"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

// AssignReservedVars assigns values for go template vars. assumes that
// model.QueryRangeParamsV3.Start and End are Unix Nano timestamps
func AssignReservedVarsV3(queryRangeParams *v3.QueryRangeParamsV3) {
	AssignReservedVars(queryRangeParams.Variables, queryRangeParams.Start, queryRangeParams.End)
}

func AssignReservedVars(variables map[string]interface{}, start int64, end int64) {
	variables["start_timestamp"] = start / 1000
	variables["end_timestamp"] = end / 1000

	variables["start_timestamp_ms"] = start
	variables["end_timestamp_ms"] = end

	variables["SIGNOZ_START_TIME"] = start
	variables["SIGNOZ_END_TIME"] = end

	variables["start_timestamp_nano"] = start * 1e6
	variables["end_timestamp_nano"] = end * 1e6

	variables["start_datetime"] = fmt.Sprintf("toDateTime(%d)", start/1000)
	variables["end_datetime"] = fmt.Sprintf("toDateTime(%d)", end/1000)
}
