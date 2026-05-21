package zeustypes

import "github.com/SigNoz/signoz/pkg/valuer"

type MeterUnit struct {
	valuer.String
}

var (
	MeterUnitCount = MeterUnit{valuer.NewString("count")}
	MeterUnitBytes = MeterUnit{valuer.NewString("bytes")}
)
