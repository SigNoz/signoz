package runner

import (
	"context"
	"database/sql"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	dashboardreporttypes "github.com/SigNoz/signoz/pkg/types/dashboardreporttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Runner polls scheduled dashboard reports and writes run status rows.
// Phase 2 only writes placeholder "success" runs (no HTML/email generation).
type Runner struct {
	sqlStore      sqlstore.SQLStore
	pollInterval  time.Duration
	timeNow       func() time.Time
	maxBatchToRun int

	done     chan struct{}
	stopOnce sync.Once
}

func NewRunner(sqlStore sqlstore.SQLStore, pollInterval time.Duration) *Runner {
	return &Runner{
		sqlStore:     sqlStore,
		pollInterval: pollInterval,
		timeNow:      time.Now,
		done:         make(chan struct{}),
	}
}

// Stop triggers a graceful shutdown of the polling loop.
// It does not forcibly interrupt any in-flight runOnce call.
func (r *Runner) Stop() {
	if r == nil {
		return
	}
	r.stopOnce.Do(func() {
		close(r.done)
	})
}

// Start begins polling for due scheduled dashboard report runs.
func (r *Runner) Start(ctx context.Context) error {
	interval := r.pollInterval
	if interval <= 0 {
		interval = 30 * time.Second
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Run once immediately on startup.
	if err := r.runOnce(ctx); err != nil {
		slog.Error("scheduled dashboard report runner initial run failed", "err", err)
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-r.done:
			return nil
		case <-ticker.C:
			if err := r.runOnce(ctx); err != nil {
				slog.Error("scheduled dashboard report runner run failed", "err", err)
			}
		}
	}
}

func (r *Runner) runOnce(ctx context.Context) error {
	var scheduledReports []*dashboardreporttypes.StorableScheduledDashboardReport
	if err := r.sqlStore.BunDBCtx(ctx).
		NewSelect().
		Model(&scheduledReports).
		Scan(ctx); err != nil {
		return err
	}

	now := r.timeNow()
	timezoneLocCache := make(map[string]*time.Location, 4)

	for _, report := range scheduledReports {
		if report == nil {
			continue
		}

		loc, ok := getLocation(report.Schedule.Timezone, timezoneLocCache)
		if !ok {
			continue
		}

		nowInLoc := now.In(loc)

		after, ok := r.getLastExecutionTimeOrDefault(ctx, report, loc, nowInLoc)
		if !ok {
			continue
		}

		nextExecutionTime, ok := computeNextExecutionTimeAfter(after, report.Schedule, loc)
		if !ok {
			continue
		}

		// Due check: only execute if the next slot time has already happened.
		if nextExecutionTime.After(nowInLoc) {
			continue
		}

		runStartMs, runEndMs, err := report.TimeRange.Window(nextExecutionTime)
		if err != nil {
			slog.Error("scheduled dashboard report runner could not compute run window", "scheduledReportId", report.ID.StringValue(), "err", err)
			continue
		}

		if err := r.markRunSuccess(ctx, report, runStartMs, runEndMs); err != nil {
			slog.Error("scheduled dashboard report runner could not write run record", "scheduledReportId", report.ID.StringValue(), "err", err)
		}
	}

	return nil
}

func getLocation(tz string, cache map[string]*time.Location) (*time.Location, bool) {
	tz = strings.TrimSpace(tz)
	if tz == "" {
		tz = "UTC"
	}

	if loc, ok := cache[tz]; ok {
		return loc, true
	}

	loc, err := time.LoadLocation(tz)
	if err != nil {
		slog.Error("scheduled dashboard report runner failed to load timezone", "timezone", tz, "err", err)
		return nil, false
	}

	cache[tz] = loc
	return loc, true
}

func (r *Runner) getLastExecutionTimeOrDefault(
	ctx context.Context,
	report *dashboardreporttypes.StorableScheduledDashboardReport,
	loc *time.Location,
	nowInLoc time.Time,
) (time.Time, bool) {
	lastRun := new(dashboardreporttypes.StorableScheduledReportRun)
	err := r.sqlStore.BunDBCtx(ctx).
		NewSelect().
		Model(lastRun).
		Where("scheduled_report_id = ?", report.ID).
		Where("org_id = ?", report.OrgID).
		OrderExpr("run_end_ms DESC").
		Limit(1).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			// Default so we don't "backfill" immediately on schedule creation:
			// the next slot must be after "now".
			return nowInLoc.Add(-1 * time.Second), true
		}
		slog.Error("scheduled dashboard report runner could not fetch last run", "scheduledReportId", report.ID.StringValue(), "err", err)
		return time.Time{}, false
	}

	// run_end_ms = executionTime - endOffset
	endTime := time.UnixMilli(int64(lastRun.RunEndMs)).In(loc)
	lastExecutionTime := endTime.Add(report.TimeRange.EndOffset.Duration())
	return lastExecutionTime, true
}

func computeNextExecutionTimeAfter(
	after time.Time,
	schedule dashboardreporttypes.DashboardReportSchedule,
	loc *time.Location,
) (time.Time, bool) {
	timeOfDay := strings.TrimSpace(schedule.TimeOfDay)
	hour, minute, ok := parseTimeOfDayHHMM(timeOfDay)
	if !ok {
		// Phase 1 only ensures frequency and timezone; during phase 2 we require timeOfDay for due checks.
		return time.Time{}, false
	}

	after = after.In(loc)

	switch schedule.Frequency {
	case dashboardreporttypes.DashboardReportScheduleFrequencyDaily:
		candidate := time.Date(after.Year(), after.Month(), after.Day(), hour, minute, 0, 0, loc)
		if !candidate.After(after) {
			candidate = candidate.AddDate(0, 0, 1)
		}
		return candidate, true

	case dashboardreporttypes.DashboardReportScheduleFrequencyWeekly:
		// Phase 1 only guarantees daily/weekly/monthly frequency. If dayOfWeek is missing,
		// anchor the weekly schedule to the weekday of the last execution.
		var target int
		if schedule.DayOfWeek != nil {
			target = *schedule.DayOfWeek
			if target < 0 || target > 6 {
				return time.Time{}, false
			}
		} else {
			target = int(after.Weekday())
		}

		afterWeekday := after.Weekday()
		daysAhead := (int(time.Weekday(target)) - int(afterWeekday) + 7) % 7

		candidateDate := after.AddDate(0, 0, daysAhead)
		candidate := time.Date(candidateDate.Year(), candidateDate.Month(), candidateDate.Day(), hour, minute, 0, 0, loc)
		if !candidate.After(after) {
			candidate = candidate.AddDate(0, 0, 7)
		}
		return candidate, true

	case dashboardreporttypes.DashboardReportScheduleFrequencyMonthly:
		// Phase 1 only guarantees daily/weekly/monthly frequency. If dayOfMonth is missing,
		// anchor the monthly schedule to the day-of-month of the last execution.
		var day int
		if schedule.DayOfMonth != nil {
			day = *schedule.DayOfMonth
			if day < 1 || day > 31 {
				return time.Time{}, false
			}
		} else {
			day = after.Day()
		}

		year, month, _ := after.Date()
		candidateDay := clampDayOfMonth(day, year, month, loc)
		candidate := time.Date(year, month, candidateDay, hour, minute, 0, 0, loc)
		if !candidate.After(after) {
			nextMonth := after.AddDate(0, 1, 0)
			year, month, _ = nextMonth.Date()
			candidateDay = clampDayOfMonth(day, year, month, loc)
			candidate = time.Date(year, month, candidateDay, hour, minute, 0, 0, loc)
		}
		return candidate, true

	default:
		return time.Time{}, false
	}
}

func parseTimeOfDayHHMM(timeOfDay string) (hour, minute int, ok bool) {
	timeOfDay = strings.TrimSpace(timeOfDay)
	if timeOfDay == "" {
		// Default to midnight; schedule creation ensures timezone but may omit timeOfDay.
		return 0, 0, true
	}

	parts := strings.Split(timeOfDay, ":")
	if len(parts) != 2 {
		return 0, 0, false
	}

	h, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, false
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, false
	}

	if h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, 0, false
	}

	return h, m, true
}

func clampDayOfMonth(day, year int, month time.Month, loc *time.Location) int {
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, loc).Day()
	if day > lastDay {
		return lastDay
	}
	return day
}

func (r *Runner) markRunSuccess(
	ctx context.Context,
	report *dashboardreporttypes.StorableScheduledDashboardReport,
	runStartMs uint64,
	runEndMs uint64,
) error {
	run := &dashboardreporttypes.StorableScheduledReportRun{
		ScheduledReportID: report.ID,
		OrgID:             report.OrgID,
		RunStartMs:        runStartMs,
		RunEndMs:          runEndMs,
		Status:            dashboardreporttypes.ScheduledReportRunStatusRunning,
	}
	run.ID = valuer.GenerateUUID()

	return r.sqlStore.RunInTxCtx(ctx, nil, func(txCtx context.Context) error {
		res, err := r.sqlStore.BunDBCtx(txCtx).
			NewInsert().
			Model(run).
			On("CONFLICT (scheduled_report_id, org_id, run_start_ms, run_end_ms) DO NOTHING").
			Exec(txCtx)
		if err != nil {
			return err
		}

		rowsAffected, err := res.RowsAffected()
		if err != nil {
			return err
		}
		if rowsAffected == 0 {
			// Another runner instance already inserted this slot.
			return nil
		}

		run.Status = dashboardreporttypes.ScheduledReportRunStatusSuccess
		run.ErrorReason = nil

		_, err = r.sqlStore.BunDBCtx(txCtx).
			NewUpdate().
			Model(run).
			WherePK().
			Exec(txCtx)
		return err
	})
}
