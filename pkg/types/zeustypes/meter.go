package zeustypes

import (
	"regexp"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var meterNameRegex = regexp.MustCompile(`^[a-z][a-z0-9_.]+$`)

// MeterName is a validated dotted Zeus meter name.
type MeterName struct {
	s string
}

func NewMeterName(s string) (MeterName, error) {
	if !meterNameRegex.MatchString(s) {
		return MeterName{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid meter name: %s", s)
	}

	return MeterName{s: s}, nil
}

func MustNewMeterName(s string) MeterName {
	name, err := NewMeterName(s)
	if err != nil {
		panic(err)
	}

	return name
}

func (n MeterName) String() string {
	return n.s
}

func (n MeterName) IsZero() bool {
	return n.s == ""
}

// MeterUnit is a supported Zeus meter unit.
type MeterUnit struct {
	valuer.String
}

var (
	MeterUnitCount = MeterUnit{valuer.NewString("count")}
	MeterUnitBytes = MeterUnit{valuer.NewString("bytes")}
)

// MeterAggregation is a supported Zeus meter aggregation name.
type MeterAggregation struct {
	valuer.String
}

var (
	MeterAggregationSum = MeterAggregation{valuer.NewString("sum")}
	MeterAggregationMax = MeterAggregation{valuer.NewString("max")}
)

// ErrCodeMeterCollectFailed is the shared error code for collector failures.
var ErrCodeMeterCollectFailed = errors.MustNewCode("metercollector_collect_failed")

const (
	// MeterDimensionOrganizationID identifies the organization.
	MeterDimensionOrganizationID = "signoz.organization.id"

	// MeterDimensionRetentionDuration identifies the retention bucket a meter belongs to.
	MeterDimensionRetentionDuration = "signoz.retention.duration"
)

// MeterWindow is the [Start, End) range a reporter tick collects.
type MeterWindow struct {
	StartUnixMilli int64
	EndUnixMilli   int64
	IsCompleted    bool
}

// NewMeterWindow builds a validated reporting window.
func NewMeterWindow(startUnixMilli, endUnixMilli int64, isCompleted bool) (MeterWindow, error) {
	if err := validateMeterWindow(startUnixMilli, endUnixMilli); err != nil {
		return MeterWindow{}, err
	}

	return MeterWindow{
		StartUnixMilli: startUnixMilli,
		EndUnixMilli:   endUnixMilli,
		IsCompleted:    isCompleted,
	}, nil
}

// MustNewMeterWindow builds a window or panics.
func MustNewMeterWindow(startUnixMilli, endUnixMilli int64, isCompleted bool) MeterWindow {
	window, err := NewMeterWindow(startUnixMilli, endUnixMilli, isCompleted)
	if err != nil {
		panic(err)
	}

	return window
}

// Day returns the UTC day containing the window start.
func (w MeterWindow) Day() time.Time {
	t := time.UnixMilli(w.StartUnixMilli).UTC()
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func validateMeterWindow(startUnixMilli, endUnixMilli int64) error {
	if startUnixMilli <= 0 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "meter window start must be positive: %d", startUnixMilli)
	}

	if endUnixMilli <= startUnixMilli {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "meter window end must be after start: [%d, %d)", startUnixMilli, endUnixMilli)
	}

	return nil
}

// Meter is one meter value sent to Zeus.
type Meter struct {
	// MeterName is the fully-qualified meter identifier.
	MeterName string `json:"name"`

	// Value is the aggregated integer scalar for this meter over the reporting window.
	Value int64 `json:"value"`

	// Unit is the metric unit for this meter.
	Unit MeterUnit `json:"unit"`

	// Aggregation names the aggregation applied to produce Value.
	Aggregation MeterAggregation `json:"aggregation"`

	// StartUnixMilli is the inclusive window start in epoch milliseconds.
	StartUnixMilli int64 `json:"start_unix_milli"`

	// EndUnixMilli is the exclusive window end in epoch milliseconds.
	EndUnixMilli int64 `json:"end_unix_milli"`

	// IsCompleted is false for the current day's partial value.
	IsCompleted bool `json:"is_completed"`

	// Dimensions is the per-meter label set.
	Dimensions map[string]string `json:"dimensions"`
}

// NewMeter builds a meter from typed metadata and a reporting window.
func NewMeter(
	name MeterName,
	value int64,
	unit MeterUnit,
	aggregation MeterAggregation,
	window MeterWindow,
	dimensions map[string]string,
) Meter {
	return Meter{
		MeterName:      name.String(),
		Value:          value,
		Unit:           unit,
		Aggregation:    aggregation,
		StartUnixMilli: window.StartUnixMilli,
		EndUnixMilli:   window.EndUnixMilli,
		IsCompleted:    window.IsCompleted,
		Dimensions:     dimensions,
	}
}
