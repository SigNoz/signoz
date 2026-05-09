package zeustypes

import "time"

type MeterCheckpoint struct {
	Name      string
	StartDate time.Time
}

type Meter struct {
	// MeterName is the fully-qualified meter identifier.
	MeterName MeterName `json:"name"`

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

func NewMeter(
	name MeterName,
	value int64,
	unit MeterUnit,
	aggregation MeterAggregation,
	window MeterWindow,
	dimensions map[string]string,
) Meter {
	return Meter{
		MeterName:      name,
		Value:          value,
		Unit:           unit,
		Aggregation:    aggregation,
		StartUnixMilli: window.StartUnixMilli,
		EndUnixMilli:   window.EndUnixMilli,
		IsCompleted:    window.IsCompleted,
		Dimensions:     dimensions,
	}
}
