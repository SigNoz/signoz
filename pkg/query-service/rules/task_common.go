package rules

import (
	"context"
	"time"

	"github.com/teambition/rrule-go"
	"go.uber.org/zap"
)

// runCronScheduledTask handles cron-based scheduling
func runCronScheduledTask(
	schedule string,
	scheduleStartsAt time.Time,
	done chan struct{},
	evalFunc func(),
) {
	rruleStr := "DTSTART=" + scheduleStartsAt.UTC().Format("20060102T150405Z") + "\nRRULE:" + schedule
	parsedSchedule, err := rrule.StrToRRule(rruleStr)
	if err != nil {
		zap.L().Error("failed to parse rrule expression", zap.String("rrule", schedule), zap.Error(err))
		return
	}

	now := time.Now()
	nextRun := parsedSchedule.After(now, false)

	select {
	case <-time.After(time.Until(nextRun)):
	case <-done:
		return
	}

	evalFunc()
	currentRun := nextRun

	for {
		nextRun = parsedSchedule.After(currentRun, false)

		select {
		case <-done:
			return
		default:
			select {
			case <-done:
				return
			case <-time.After(time.Until(nextRun)):
				now := time.Now()
				if now.After(nextRun.Add(time.Minute)) {
					zap.L().Warn("missed scheduled run",
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
