package ruletypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type EvaluationKind struct {
	valuer.String
}

var (
	RollingEvaluation    = EvaluationKind{valuer.NewString("rolling")}
	CumulativeEvaluation = EvaluationKind{valuer.NewString("cumulative")}
)

type Evaluation interface {
	NextWindowFor(curr time.Time) (time.Time, time.Time)
	GetFrequency() Duration
}

type RollingWindow struct {
	EvalWindow Duration `json:"evalWindow"`
	Frequency  Duration `json:"frequency"`
}

func (rollingWindow RollingWindow) Validate() error {
	if rollingWindow.EvalWindow <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "evalWindow must be greater than zero")
	}
	if rollingWindow.Frequency <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "frequency must be greater than zero")
	}
	return nil
}

func (rollingWindow RollingWindow) NextWindowFor(curr time.Time) (time.Time, time.Time) {
	return curr.Add(time.Duration(-rollingWindow.EvalWindow)), curr
}

func (rollingWindow RollingWindow) GetFrequency() Duration {
	return rollingWindow.Frequency
}

type CumulativeWindow struct {
	Schedule  CumulativeSchedule `json:"schedule"`
	Frequency Duration           `json:"frequency"`
	Timezone  string             `json:"timezone"`
}

type CumulativeSchedule struct {
	Type    ScheduleType `json:"type"`
	Minute  *int         `json:"minute,omitempty"`  // 0-59, for all types
	Hour    *int         `json:"hour,omitempty"`    // 0-23, for daily/weekly/monthly
	Day     *int         `json:"day,omitempty"`     // 1-31, for monthly
	Weekday *int         `json:"weekday,omitempty"` // 0-6 (Sunday=0), for weekly
}

type ScheduleType struct {
	valuer.String
}

var (
	ScheduleTypeHourly  = ScheduleType{valuer.NewString("hourly")}
	ScheduleTypeDaily   = ScheduleType{valuer.NewString("daily")}
	ScheduleTypeWeekly  = ScheduleType{valuer.NewString("weekly")}
	ScheduleTypeMonthly = ScheduleType{valuer.NewString("monthly")}
)

func (cumulativeWindow CumulativeWindow) Validate() error {
	// Validate schedule
	if err := cumulativeWindow.Schedule.Validate(); err != nil {
		return err
	}

	if _, err := time.LoadLocation(cumulativeWindow.Timezone); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "timezone is invalid")
	}
	if cumulativeWindow.Frequency <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "frequency must be greater than zero")
	}
	return nil
}

func (cs CumulativeSchedule) Validate() error {
	switch cs.Type {
	case ScheduleTypeHourly:
		if cs.Minute == nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "minute must be specified for hourly schedule")
		}
		if *cs.Minute < 0 || *cs.Minute > 59 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "minute must be between 0 and 59")
		}
	case ScheduleTypeDaily:
		if cs.Hour == nil || cs.Minute == nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "hour and minute must be specified for daily schedule")
		}
		if *cs.Hour < 0 || *cs.Hour > 23 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "hour must be between 0 and 23")
		}
		if *cs.Minute < 0 || *cs.Minute > 59 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "minute must be between 0 and 59")
		}
	case ScheduleTypeWeekly:
		if cs.Weekday == nil || cs.Hour == nil || cs.Minute == nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "weekday, hour and minute must be specified for weekly schedule")
		}
		if *cs.Weekday < 0 || *cs.Weekday > 6 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "weekday must be between 0 and 6 (Sunday=0)")
		}
		if *cs.Hour < 0 || *cs.Hour > 23 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "hour must be between 0 and 23")
		}
		if *cs.Minute < 0 || *cs.Minute > 59 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "minute must be between 0 and 59")
		}
	case ScheduleTypeMonthly:
		if cs.Day == nil || cs.Hour == nil || cs.Minute == nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "day, hour and minute must be specified for monthly schedule")
		}
		if *cs.Day < 1 || *cs.Day > 31 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "day must be between 1 and 31")
		}
		if *cs.Hour < 0 || *cs.Hour > 23 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "hour must be between 0 and 23")
		}
		if *cs.Minute < 0 || *cs.Minute > 59 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "minute must be between 0 and 59")
		}
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid schedule type")
	}
	return nil
}

func (cumulativeWindow CumulativeWindow) NextWindowFor(curr time.Time) (time.Time, time.Time) {
	loc := time.UTC
	if cumulativeWindow.Timezone != "" {
		if tz, err := time.LoadLocation(cumulativeWindow.Timezone); err == nil {
			loc = tz
		}
	}

	currInTZ := curr.In(loc)
	windowStart := cumulativeWindow.getLastScheduleTime(currInTZ, loc)

	return windowStart.In(time.UTC), currInTZ.In(time.UTC)
}

func (cw CumulativeWindow) getLastScheduleTime(curr time.Time, loc *time.Location) time.Time {
	schedule := cw.Schedule

	switch schedule.Type {
	case ScheduleTypeHourly:
		// Find the most recent hour boundary with the specified minute
		minute := *schedule.Minute
		candidate := time.Date(curr.Year(), curr.Month(), curr.Day(), curr.Hour(), minute, 0, 0, loc)
		if candidate.After(curr) {
			candidate = candidate.Add(-time.Hour)
		}
		return candidate

	case ScheduleTypeDaily:
		// Find the most recent day boundary with the specified hour and minute
		hour := *schedule.Hour
		minute := *schedule.Minute
		candidate := time.Date(curr.Year(), curr.Month(), curr.Day(), hour, minute, 0, 0, loc)
		if candidate.After(curr) {
			candidate = candidate.AddDate(0, 0, -1)
		}
		return candidate

	case ScheduleTypeWeekly:
		weekday := time.Weekday(*schedule.Weekday)
		hour := *schedule.Hour
		minute := *schedule.Minute

		// Calculate days to subtract to reach the target weekday
		daysBack := int(curr.Weekday() - weekday)
		if daysBack < 0 {
			daysBack += 7
		}

		candidate := time.Date(curr.Year(), curr.Month(), curr.Day(), hour, minute, 0, 0, loc).AddDate(0, 0, -daysBack)
		if candidate.After(curr) {
			candidate = candidate.AddDate(0, 0, -7)
		}
		return candidate

	case ScheduleTypeMonthly:
		// Find the most recent month boundary with the specified day, hour and minute
		targetDay := *schedule.Day
		hour := *schedule.Hour
		minute := *schedule.Minute

		// Try current month first
		lastDayOfCurrentMonth := time.Date(curr.Year(), curr.Month()+1, 0, 0, 0, 0, 0, loc).Day()
		dayInCurrentMonth := targetDay
		if targetDay > lastDayOfCurrentMonth {
			dayInCurrentMonth = lastDayOfCurrentMonth
		}

		candidate := time.Date(curr.Year(), curr.Month(), dayInCurrentMonth, hour, minute, 0, 0, loc)
		if candidate.After(curr) {
			prevMonth := curr.AddDate(0, -1, 0)
			lastDayOfPrevMonth := time.Date(prevMonth.Year(), prevMonth.Month()+1, 0, 0, 0, 0, 0, loc).Day()
			dayInPrevMonth := targetDay
			if targetDay > lastDayOfPrevMonth {
				dayInPrevMonth = lastDayOfPrevMonth
			}
			candidate = time.Date(prevMonth.Year(), prevMonth.Month(), dayInPrevMonth, hour, minute, 0, 0, loc)
		}
		return candidate

	default:
		return curr
	}
}

func (cumulativeWindow CumulativeWindow) GetFrequency() Duration {
	return cumulativeWindow.Frequency
}

type EvaluationEnvelope struct {
	Kind EvaluationKind `json:"kind"`
	Spec any            `json:"spec"`
}

func (e *EvaluationEnvelope) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal evaluation: %v", err)
	}
	if err := json.Unmarshal(raw["kind"], &e.Kind); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal evaluation kind: %v", err)
	}
	switch e.Kind {
	case RollingEvaluation:
		var rollingWindow RollingWindow
		if err := json.Unmarshal(raw["spec"], &rollingWindow); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal rolling window: %v", err)
		}
		err := rollingWindow.Validate()
		if err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to validate rolling window: %v", err)
		}
		e.Spec = rollingWindow
	case CumulativeEvaluation:
		var cumulativeWindow CumulativeWindow
		if err := json.Unmarshal(raw["spec"], &cumulativeWindow); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal cumulative window: %v", err)
		}
		err := cumulativeWindow.Validate()
		if err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to validate cumulative window: %v", err)
		}
		e.Spec = cumulativeWindow

	default:
		return errors.NewInvalidInputf(errors.CodeUnsupported, "unknown evaluation kind")
	}

	return nil
}

func (e *EvaluationEnvelope) GetEvaluation() (Evaluation, error) {
	if e.Kind.IsZero() {
		e.Kind = RollingEvaluation
	}

	switch e.Kind {
	case RollingEvaluation:
		if rolling, ok := e.Spec.(RollingWindow); ok {
			return rolling, nil
		}
	case CumulativeEvaluation:
		if cumulative, ok := e.Spec.(CumulativeWindow); ok {
			return cumulative, nil
		}
	default:
		return nil, errors.NewInvalidInputf(errors.CodeUnsupported, "unknown evaluation kind")
	}
	return nil, errors.NewInvalidInputf(errors.CodeUnsupported, "unknown evaluation kind")
}
