package zeustypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

type MeterWindow struct {
	StartUnixMilli int64
	EndUnixMilli   int64
	IsCompleted    bool
}

func NewMeterWindow(startUnixMilli, endUnixMilli int64, isCompleted bool) (MeterWindow, error) {
	if startUnixMilli <= 0 {
		return MeterWindow{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "meter window start must be positive: %d", startUnixMilli)
	}

	if endUnixMilli <= startUnixMilli {
		return MeterWindow{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "meter window end must be after start: [%d, %d)", startUnixMilli, endUnixMilli)
	}

	return MeterWindow{
		StartUnixMilli: startUnixMilli,
		EndUnixMilli:   endUnixMilli,
		IsCompleted:    isCompleted,
	}, nil
}

func MustNewMeterWindow(startUnixMilli, endUnixMilli int64, isCompleted bool) MeterWindow {
	window, err := NewMeterWindow(startUnixMilli, endUnixMilli, isCompleted)
	if err != nil {
		panic(err)
	}

	return window
}

func (w MeterWindow) Day() time.Time {
	t := time.UnixMilli(w.StartUnixMilli).UTC()
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}
