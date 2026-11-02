package ruletypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/swaggest/jsonschema-go"
)

type EvaluationKind struct {
	valuer.String
}

var (
	RollingEvaluation    = EvaluationKind{valuer.NewString("rolling")}
	CumulativeEvaluation = EvaluationKind{valuer.NewString("cumulative")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for EvaluationKind.
func (EvaluationKind) Enum() []any {
	return []any{
		RollingEvaluation,
		CumulativeEvaluation,
	}
}

type Evaluation interface {
	NextWindowFor(curr time.Time) (time.Time, time.Time)
	GetFrequency() valuer.TextDuration
}

type RollingWindow struct {
	EvalWindow valuer.TextDuration `json:"evalWindow" required:"true" description:"The sliding lookback window each evaluation queries, as a Go duration such as 5m."`
	Frequency  valuer.TextDuration `json:"frequency" required:"true" description:"How often the rule is evaluated, as a Go duration such as 1m. Must be positive."`
}

func (rollingWindow RollingWindow) Validate() error {
	if !rollingWindow.EvalWindow.IsPositive() {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "evalWindow must be greater than zero")
	}
	if !rollingWindow.Frequency.IsPositive() {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "frequency must be greater than zero")
	}
	return nil
}

func (rollingWindow RollingWindow) NextWindowFor(curr time.Time) (time.Time, time.Time) {
	return curr.Add(-rollingWindow.EvalWindow.Duration()), curr
}

func (rollingWindow RollingWindow) GetFrequency() valuer.TextDuration {
	return rollingWindow.Frequency
}

type CumulativeWindow struct {
	Schedule  CumulativeSchedule  `json:"schedule" required:"true" description:"The boundary the accumulation window starts from. Each evaluation queries from the most recent boundary to now."`
	Frequency valuer.TextDuration `json:"frequency" required:"true" description:"How often the rule is evaluated, as a Go duration such as 1m. Must be positive."`
	Timezone  string              `json:"timezone" required:"true" description:"The IANA time zone the schedule is resolved in, such as UTC or Asia/Kolkata."`
}

type CumulativeSchedule struct {
	Type    ScheduleType `json:"type" required:"true" description:"How often the window resets: hourly, daily, weekly or monthly."`
	Minute  *int         `json:"minute,omitempty" description:"The minute of the reset boundary, 0 to 59. Required for every type."`
	Hour    *int         `json:"hour,omitempty" description:"The hour of the reset boundary, 0 to 23. Required for daily, weekly and monthly."`
	Day     *int         `json:"day,omitempty" description:"The day of the month of the reset boundary, 1 to 31. Required for monthly."`
	Weekday *int         `json:"weekday,omitempty" description:"The weekday of the reset boundary, 0 (Sunday) to 6 (Saturday). Required for weekly."`
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

// Enum implements jsonschema.Enum; returns the acceptable values for ScheduleType.
func (ScheduleType) Enum() []any {
	return []any{
		ScheduleTypeHourly,
		ScheduleTypeDaily,
		ScheduleTypeWeekly,
		ScheduleTypeMonthly,
	}
}

func (cumulativeWindow CumulativeWindow) Validate() error {
	// Validate schedule
	if err := cumulativeWindow.Schedule.Validate(); err != nil {
		return err
	}

	if _, err := time.LoadLocation(cumulativeWindow.Timezone); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "timezone is invalid")
	}
	if !cumulativeWindow.Frequency.IsPositive() {
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

func (cumulativeWindow CumulativeWindow) getLastScheduleTime(curr time.Time, loc *time.Location) time.Time {
	schedule := cumulativeWindow.Schedule

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

func (cumulativeWindow CumulativeWindow) GetFrequency() valuer.TextDuration {
	return cumulativeWindow.Frequency
}

type EvaluationEnvelope struct {
	Kind EvaluationKind `json:"kind" required:"true" description:"The kind of evaluation window: rolling slides a fixed lookback, cumulative accumulates from a scheduled reset."`
	Spec any            `json:"spec" required:"true" description:"The evaluation specification for kind: evalWindow and frequency for rolling, schedule, frequency and timezone for cumulative."`
}

// evaluationRolling is the OpenAPI schema for an EvaluationEnvelope with kind=rolling.
type evaluationRolling struct {
	Kind EvaluationKind `json:"kind" description:"The kind of evaluation." required:"true"`
	Spec RollingWindow  `json:"spec" description:"The rolling window evaluation specification." required:"true"`
}

// evaluationCumulative is the OpenAPI schema for an EvaluationEnvelope with kind=cumulative.
type evaluationCumulative struct {
	Kind EvaluationKind   `json:"kind" description:"The kind of evaluation." required:"true"`
	Spec CumulativeWindow `json:"spec" description:"The cumulative window evaluation specification." required:"true"`
}

var (
	_ jsonschema.OneOfExposer = EvaluationEnvelope{}
	_ jsonschema.Preparer     = EvaluationEnvelope{}
)

// JSONSchemaOneOf returns the oneOf variants for the EvaluationEnvelope discriminated union.
// Each variant represents a different evaluation kind with its corresponding spec schema.
func (EvaluationEnvelope) JSONSchemaOneOf() []any {
	return []any{
		evaluationRolling{},
		evaluationCumulative{},
	}
}

func (EvaluationEnvelope) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if schema.ExtraProperties == nil {
		schema.ExtraProperties = map[string]any{}
	}

	schema.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "kind",
		"mapping": map[string]string{
			"rolling":    "#/components/schemas/RuletypesEvaluationRolling",
			"cumulative": "#/components/schemas/RuletypesEvaluationCumulative",
		},
	}

	return nil
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
