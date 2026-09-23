package dashboardtypes

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodePublicDashboardUnsupported   = errors.MustNewCode("public_dashboard_unsupported")
	ErrCodePublicDashboardInvalidInput  = errors.MustNewCode("public_dashboard_invalid_input")
	ErrCodePublicDashboardNotFound      = errors.MustNewCode("public_dashboard_not_found")
	ErrCodePublicDashboardAlreadyExists = errors.MustNewCode("public_dashboard_already_exists")
)

type StorablePublicDashboard struct {
	bun.BaseModel `bun:"table:public_dashboard,alias:public_dashboard"`

	types.Identifiable
	types.TimeAuditable
	TimeRangeEnabled bool   `bun:"time_range_enabled,type:boolean,notnull"`
	DefaultTimeRange string `bun:"default_time_range,type:text,notnull"`
	DashboardID      string `bun:"dashboard_id,type:text,notnull"`
}

type PublicDashboard struct {
	types.Identifiable
	types.TimeAuditable

	TimeRangeEnabled bool        `json:"timeRangeEnabled"`
	DefaultTimeRange string      `json:"defaultTimeRange"`
	DashboardID      valuer.UUID `json:"dashboardId"`
}

type GettablePublicDasbhboard struct {
	TimeRangeEnabled bool   `json:"timeRangeEnabled"`
	DefaultTimeRange string `json:"defaultTimeRange"`
	PublicPath       string `json:"publicPath"`
}

type PostablePublicDashboard struct {
	TimeRangeEnabled bool   `json:"timeRangeEnabled"`
	DefaultTimeRange string `json:"defaultTimeRange"`
}

type UpdatablePublicDashboard struct {
	TimeRangeEnabled bool   `json:"timeRangeEnabled"`
	DefaultTimeRange string `json:"defaultTimeRange"`
}

func NewPublicDashboard(timeRangeEnabled bool, defaultTimeRange string, dashboardID valuer.UUID) *PublicDashboard {
	return &PublicDashboard{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		TimeRangeEnabled: timeRangeEnabled,
		DefaultTimeRange: defaultTimeRange,
		DashboardID:      dashboardID,
	}
}

func NewStorablePublicDashboardFromPublicDashboard(publicDashboard *PublicDashboard) *StorablePublicDashboard {
	return &StorablePublicDashboard{
		Identifiable:     publicDashboard.Identifiable,
		TimeAuditable:    publicDashboard.TimeAuditable,
		TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
		DefaultTimeRange: publicDashboard.DefaultTimeRange,
		DashboardID:      publicDashboard.DashboardID.StringValue(),
	}
}

func NewPublicDashboardFromStorablePublicDashboard(storable *StorablePublicDashboard) *PublicDashboard {
	return &PublicDashboard{
		Identifiable:     storable.Identifiable,
		TimeAuditable:    storable.TimeAuditable,
		TimeRangeEnabled: storable.TimeRangeEnabled,
		DefaultTimeRange: storable.DefaultTimeRange,
		DashboardID:      valuer.MustNewUUID(storable.DashboardID),
	}
}

func NewGettablePublicDashboard(publicDashboard *PublicDashboard) *GettablePublicDasbhboard {
	return &GettablePublicDasbhboard{
		TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
		DefaultTimeRange: publicDashboard.DefaultTimeRange,
		PublicPath:       publicDashboard.PublicPath(),
	}
}

func (typ *PublicDashboard) Update(timeRangeEnabled bool, defaultTimeRange string) {
	typ.TimeRangeEnabled = timeRangeEnabled
	typ.DefaultTimeRange = defaultTimeRange
	typ.UpdatedAt = time.Now()
}

func (typ *PublicDashboard) PublicPath() string {
	return "/public/dashboard/" + typ.ID.StringValue()
}

// ResolveTimeRange returns the [start, end] window in epoch millis for a public
// widget/panel query: the caller-supplied range when the dashboard allows it,
// otherwise now minus the configured default range.
func (typ *PublicDashboard) ResolveTimeRange(startTimeRaw, endTimeRaw string) (uint64, uint64, error) {
	if typ.TimeRangeEnabled {
		startTime, err := strconv.ParseUint(startTimeRaw, 10, 64)
		if err != nil {
			return 0, 0, errors.New(errors.TypeInvalidInput, ErrCodePublicDashboardInvalidInput, "invalid startTime")
		}
		endTime, err := strconv.ParseUint(endTimeRaw, 10, 64)
		if err != nil {
			return 0, 0, errors.New(errors.TypeInvalidInput, ErrCodePublicDashboardInvalidInput, "invalid endTime")
		}
		return startTime, endTime, nil
	}

	timeRange, err := time.ParseDuration(typ.DefaultTimeRange)
	if err != nil {
		return 0, 0, errors.WrapInternalf(err, errors.CodeInternal, "stored defaultTimeRange %q is not a valid duration", typ.DefaultTimeRange)
	}
	now := time.Now()
	return uint64(now.Add(-timeRange).UnixMilli()), uint64(now.UnixMilli()), nil
}

func (typ *PostablePublicDashboard) UnmarshalJSON(data []byte) error {
	type alias PostablePublicDashboard
	var temp alias

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	_, err := time.ParseDuration(temp.DefaultTimeRange)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, ErrCodePublicDashboardInvalidInput, "unable to parse defaultTimeRange %s", temp.DefaultTimeRange)
	}

	*typ = PostablePublicDashboard(temp)
	return nil
}

func (typ *UpdatablePublicDashboard) UnmarshalJSON(data []byte) error {
	type alias UpdatablePublicDashboard
	var temp alias

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	_, err := time.ParseDuration(temp.DefaultTimeRange)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, ErrCodePublicDashboardInvalidInput, "unable to parse defaultTimeRange %s", temp.DefaultTimeRange)
	}

	*typ = UpdatablePublicDashboard(temp)
	return nil
}

func NewStatsFromStorablePublicDashboards(publicDashboards []*StorablePublicDashboard) map[string]any {
	stats := make(map[string]any)

	stats["public_dashboard.count"] = int64(len(publicDashboards))
	return stats
}
