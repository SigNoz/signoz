package metercollector

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeMeterCollectorCollectFailed              = errors.MustNewCode("meter_collector_collect_failed")
	ErrCodeMeterCollectorInvalidCustomRetentionRule = errors.MustNewCode("meter_collector_invalid_custom_retention_rule")
	ErrCodeInvalidConfig                            = errors.MustNewCode("meter_collector_invalid_config")
)

type MeterCollector interface {
	Name() zeustypes.MeterName
	Unit() zeustypes.MeterUnit
	Aggregation() zeustypes.MeterAggregation
	Origin(ctx context.Context, orgID valuer.UUID, license *licensetypes.License, todayStart time.Time) (time.Time, error)
	Collect(ctx context.Context, orgID valuer.UUID, license *licensetypes.License, window zeustypes.MeterWindow) ([]zeustypes.Meter, error)
}
