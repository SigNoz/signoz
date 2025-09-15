package rules

import (
	"context"
	"time"

	"github.com/teambition/rrule-go"
	"go.uber.org/zap"
)

// runCronScheduledTask handles cron-based scheduling with timezone support
func runCronScheduledTask(
	schedule string,
	scheduleStartsAt time.Time,
	timezone string,
	done chan struct{},
	evalFunc func(),
) error {
	// Load the timezone
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		zap.L().Error("failed to load timezone", zap.String("timezone", timezone), zap.Error(err))
		return err
	}

	// Convert start time to the specified timezone
	startTimeInTZ := scheduleStartsAt.In(loc)

	// Format DTSTART with timezone info
	var rruleStr string
	if loc == time.UTC {
		rruleStr = "DTSTART:" + startTimeInTZ.Format("20060102T150405Z") + "\n" + schedule
	} else {
		// For non-UTC timezones, include timezone info
		rruleStr = "DTSTART;TZID=" + timezone + ":" + startTimeInTZ.Format("20060102T150405") + "\n" + schedule
	}

	parsedSchedule, err := rrule.StrToRRule(rruleStr)
	if err != nil {
		zap.L().Error("failed to parse rrule expression", zap.String("rrule", schedule), zap.String("timezone", timezone), zap.Error(err))
		return err
	}

	// Use timezone-aware current time
	now := time.Now().In(loc)
	nextRun := parsedSchedule.After(now, false)

	if nextRun.IsZero() {
		zap.L().Error("no future runs found for schedule", zap.String("schedule", schedule), zap.String("timezone", timezone))
		return err
	}

	zap.L().Debug("cron scheduler starting", zap.String("schedule", schedule), zap.String("timezone", timezone), zap.Time("nextRun", nextRun))

	select {
	case <-time.After(time.Until(nextRun)):
	case <-done:
		return nil
	}

	evalFunc()
	currentRun := nextRun

	for {
		nextRun = parsedSchedule.After(currentRun, false)

		if nextRun.IsZero() {
			zap.L().Info("no more scheduled runs", zap.String("schedule", schedule))
			return nil
		}

		select {
		case <-done:
			return nil
		default:
			select {
			case <-done:
				return nil
			case <-time.After(time.Until(nextRun)):
				now := time.Now().In(loc)
				if now.After(nextRun.Add(time.Minute)) {
					zap.L().Warn("missed scheduled run",
						zap.String("schedule", schedule),
						zap.String("timezone", timezone),
						zap.Time("scheduled", nextRun),
						zap.Time("actual", now))
				}
				currentRun = nextRun
				evalFunc()
			}
		}
	}
}

// runIntervalScheduledTask handles interval-based scheduling
func runIntervalScheduledTask(
	frequency time.Duration,
	done chan struct{},
	evalTimestampFunc func() time.Time,
	evalFunc func(),
) {
	evalTimestamp := evalTimestampFunc()

	select {
	case <-time.After(time.Until(evalTimestamp)):
	case <-done:
		return
	}

	tick := time.NewTicker(frequency)
	defer tick.Stop()

	evalFunc()

	for {
		select {
		case <-done:
			return
		default:
			select {
			case <-done:
				return
			case <-tick.C:
				missed := (time.Since(evalTimestamp) / frequency) - 1
				evalTimestamp = evalTimestamp.Add((missed + 1) * frequency)
				evalFunc()
			}
		}
	}
}

// createCronEvalFunction creates evaluation function for cron scheduling
func createCronEvalFunction(
	pause *bool,
	evalFunc func(ctx context.Context, ts time.Time),
	setEvaluationTime func(time.Duration),
	setLastEvaluation func(time.Time),
	ctx context.Context,
) func() {
	return func() {
		if *pause {
			return
		}
		start := time.Now()
		evalFunc(ctx, start)
		timeSinceStart := time.Since(start)
		setEvaluationTime(timeSinceStart)
		setLastEvaluation(start)
	}
}

// createIntervalEvalFunction creates evaluation function for interval scheduling
func createIntervalEvalFunction(
	pause *bool,
	evalFunc func(ctx context.Context, ts time.Time),
	setEvaluationTime func(time.Duration),
	setLastEvaluation func(time.Time),
	ctx context.Context,
	getEvalTimestamp func() time.Time,
) func() {
	return func() {
		if *pause {
			return
		}
		start := time.Now()
		evalFunc(ctx, getEvalTimestamp())
		timeSinceStart := time.Since(start)
		setEvaluationTime(timeSinceStart)
		setLastEvaluation(start)
	}
}
