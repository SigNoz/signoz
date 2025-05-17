package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/valuer"

type FunctionName struct {
	valuer.String
}

var (
	FunctionNameCutOffMin   = FunctionName{valuer.NewString("cutOffMin")}
	FunctionNameCutOffMax   = FunctionName{valuer.NewString("cutOffMax")}
	FunctionNameClampMin    = FunctionName{valuer.NewString("clampMin")}
	FunctionNameClampMax    = FunctionName{valuer.NewString("clampMax")}
	FunctionNameAbsolute    = FunctionName{valuer.NewString("absolute")}
	FunctionNameRunningDiff = FunctionName{valuer.NewString("runningDiff")}
	FunctionNameLog2        = FunctionName{valuer.NewString("log2")}
	FunctionNameLog10       = FunctionName{valuer.NewString("log10")}
	FunctionNameCumSum      = FunctionName{valuer.NewString("cumSum")}
	FunctionNameEWMA3       = FunctionName{valuer.NewString("ewma3")}
	FunctionNameEWMA5       = FunctionName{valuer.NewString("ewma5")}
	FunctionNameEWMA7       = FunctionName{valuer.NewString("ewma7")}
	FunctionNameMedian3     = FunctionName{valuer.NewString("median3")}
	FunctionNameMedian5     = FunctionName{valuer.NewString("median5")}
	FunctionNameMedian7     = FunctionName{valuer.NewString("median7")}
	FunctionNameTimeShift   = FunctionName{valuer.NewString("timeShift")}
	FunctionNameAnomaly     = FunctionName{valuer.NewString("anomaly")}
)
