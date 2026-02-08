package alertmanagertypes

import (
	"testing"
	"time"
)

// Helper function to create a time pointer
func timePtr(t time.Time) *time.Time {
	return &t
}

func TestIsActive_Schedule(t *testing.T) {

	cases := []struct {
		name        string
		maintenance *GettablePlannedMaintenance
		ts          time.Time
		active      bool
	}{
		{
			name: "weekly-skip-only-on-saturday",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "Europe/London",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 24),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday, RepeatOnTuesday, RepeatOnWednesday, RepeatOnThursday, RepeatOnFriday, RepeatOnSunday},
					},
				},
			},
			ts:   time.Date(2025, 3, 20, 12, 0, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "weekly-across-midnight-same-week",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 1, 22, 0, 0, 0, time.UTC), // Monday 22:00
						Duration:   Duration(time.Hour * 4),                      // Until Tuesday 02:00
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday}, // Only Monday
					},
				},
			},
			ts:   time.Date(2024, 4, 2, 1, 30, 0, 0, time.UTC), // Tuesday 01:30
			active: true,
		},
		{
			name: "weekly-across-midnight-different-week",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 1, 22, 0, 0, 0, time.UTC), // Monday 22:00
						Duration:   Duration(time.Hour * 4),                      // Until Tuesday 02:00
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday}, // Only Monday
					},
				},
			},
			ts:   time.Date(2024, 4, 23, 1, 30, 0, 0, time.UTC), // Tuesday 01:30 (3 weeks later)
			active: true,
		},
		{
			name: "weekly-multi-day-duration-52h",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 1, 22, 0, 0, 0, time.UTC), // Monday 22:00
						Duration:   Duration(time.Hour * 52),                     // Until Thursday 02:00
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday}, // Only Monday
					},
				},
			},
			ts:   time.Date(2024, 4, 25, 1, 30, 0, 0, time.UTC), // Thursday 01:30
			active: true,
		},
		{
			name: "weekly-across-midnight-tuesday-start",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 2, 22, 0, 0, 0, time.UTC), // Tuesday 22:00
						Duration:   Duration(time.Hour * 4),                      // Until Wednesday 02:00
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnTuesday}, // Only Tuesday
					},
				},
			},
			ts:   time.Date(2024, 4, 3, 1, 30, 0, 0, time.UTC), // Wednesday 01:30
			active: true,
		},
		{
			name: "daily-across-midnight",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 23, 0, 0, 0, time.UTC), // 23:00
						Duration:   Duration(time.Hour * 2),                      // Until 01:00 next day
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 2, 0, 30, 0, 0, time.UTC), // 00:30 next day
			active: true,
		},
		{
			name: "daily-at-start-time-boundary",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC), // Exactly at start time
			active: true,
		},
		{
			name: "daily-at-end-time-boundary",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 1, 14, 0, 0, 0, time.UTC), // Exactly at end time
			active: true,
		},
		{
			name: "monthly-multi-day-duration-72h",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 28, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 72), // 3 days
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 1, 30, 12, 30, 0, 0, time.UTC), // Within the 3-day window
			active: true,
		},
		{
			name: "weekly-multi-day-duration-72h-sunday",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 28, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 72), // 3 days
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnSunday},
					},
				},
			},
			ts:   time.Date(2024, 1, 30, 12, 30, 0, 0, time.UTC), // Within the 3-day window
			active: true,
		},
		{
			name: "monthly-crosses-to-next-month",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 30, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 48), // 2 days, crosses to Feb 1
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 2, 1, 11, 0, 0, 0, time.UTC), // Feb 1, 11:00
			active: true,
		},
		{
			name: "daily-timezone-offset-america-new-york",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "America/New_York", // UTC-5 or UTC-4 depending on DST
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 22, 0, 0, 0, time.FixedZone("America/New_York", -5*3600)),
						Duration:   Duration(time.Hour * 4),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 2, 3, 30, 0, 0, time.UTC), // 22:30 NY time on Jan 1
			active: true,
		},
		{
			name: "daily-time-outside-window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 1, 16, 0, 0, 0, time.UTC), // 4 hours after start, 2 hours after end
			active: false,
		},
		{
			name: "recurring-past-end-date-not-active",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						EndTime:    timePtr(time.Date(2024, 1, 10, 12, 0, 0, 0, time.UTC)),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 15, 12, 30, 0, 0, time.UTC), // After the end date
			active: false,
		},
		{
			name: "monthly-spans-month-end-march-to-april",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 3, 31, 22, 0, 0, 0, time.UTC), // March 31, 22:00
						Duration:   Duration(time.Hour * 6),                       // Until April 1, 04:00
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 4, 1, 2, 0, 0, 0, time.UTC), // April 1, 02:00
			active: true,
		},
		{
			name: "weekly-empty-repeaton-applies-to-all-days",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{}, // Empty - should apply to all days
					},
				},
			},
			ts:   time.Date(2024, 4, 7, 12, 30, 0, 0, time.UTC), // Sunday
			active: true,
		},
		{
			name: "monthly-feb-fewer-days-jan31-not-active-on-feb28",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 31, 12, 0, 0, 0, time.UTC), // January 31st
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 2, 28, 12, 30, 0, 0, time.UTC), // February 28th (not 29th in this test)
			active: false,
		},
		{
			name: "daily-crosses-midnight-late-start",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 23, 30, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 1), // Crosses to 00:30 next day
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 2, 0, 15, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "monthly-jan31-active-on-feb29-leap-year",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 31, 12, 0, 0, 0, time.UTC), // January 31st
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 2, 29, 12, 30, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "monthly-jan30-48h-duration-active-on-feb1",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 30, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 48), // 2 days duration
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 2, 1, 11, 0, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "weekly-monday-23h-active-on-tuesday-0030",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 1, 23, 0, 0, 0, time.UTC), // Monday 23:00
						Duration:   Duration(time.Hour * 2),                      // Until Tuesday 01:00
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday}, // Only Monday
					},
				},
			},
			ts:   time.Date(2024, 4, 2, 0, 30, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "monthly-jan31-active-on-april30",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 31, 12, 0, 0, 0, time.UTC), // January 31st
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 4, 30, 12, 30, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "daily-22h-4h-duration-active-at-01h-next-day",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 22, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 4), // Until 02:00 next day
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 2, 1, 0, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "monthly-jan31-2h-active-on-feb29",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 31, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 2, 29, 12, 30, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "fixed-within-window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			ts:   time.Date(2024, 6, 1, 12, 0, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "fixed-before-window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			ts:   time.Date(2024, 6, 1, 8, 0, 0, 0, time.UTC),
			active: false,
		},
		{
			name: "fixed-after-window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			ts:   time.Date(2024, 6, 1, 16, 0, 0, 0, time.UTC),
			active: false,
		},
		{
			name: "weekly-sat-sun-24h-us-eastern",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "US/Eastern",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2025, 3, 29, 20, 0, 0, 0, time.FixedZone("US/Eastern", -4*3600)),
						Duration:   Duration(time.Hour * 24),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnSunday, RepeatOnSaturday},
					},
				},
			},
			ts:   time.Unix(1743343105, 0),
			active: true,
		},
		{
			name: "daily-12h-to-14h-within-window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 1, 12, 10, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "daily-12h-to-14h-at-end-boundary",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 1, 1, 14, 0, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "daily-12h-to-14h-different-month",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			ts:   time.Date(2024, 04, 1, 12, 10, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "weekly-monday-12h-to-14h-on-monday",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 04, 01, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday},
					},
				},
			},
			ts:   time.Date(2024, 04, 15, 12, 10, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "weekly-monday-12h-to-14h-on-sunday-not-active",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 04, 01, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday},
					},
				},
			},
			ts:   time.Date(2024, 04, 14, 12, 10, 0, 0, time.UTC), // 14th 04 is sunday
			active: false,
		},
		{
			name: "weekly-monday-12h-to-14h-on-tuesday-not-active",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 04, 01, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday},
					},
				},
			},
			ts:   time.Date(2024, 04, 16, 12, 10, 0, 0, time.UTC), // 16th 04 is tuesday
			active: false,
		},
		{
			name: "weekly-monday-12h-to-14h-next-month-monday",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 04, 01, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday},
					},
				},
			},
			ts:   time.Date(2024, 05, 06, 12, 10, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "weekly-monday-12h-to-14h-at-end-boundary",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 04, 01, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday},
					},
				},
			},
			ts:   time.Date(2024, 05, 06, 14, 00, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "monthly-4th-12h-to-14h-within-window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 04, 04, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 04, 04, 12, 10, 0, 0, time.UTC),
			active: true,
		},
		{
			name: "monthly-4th-12h-to-14h-after-window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 04, 04, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 04, 04, 14, 10, 0, 0, time.UTC),
			active: false,
		},
		{
			name: "monthly-4th-12h-to-14h-next-month",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 04, 04, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(time.Hour * 2),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			ts:   time.Date(2024, 05, 04, 12, 10, 0, 0, time.UTC),
			active: true,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			result := c.maintenance.IsActive(c.ts)
			if result != c.active {
				t.Errorf("expected active=%v, got %v", c.active, result)
			}
		})
	}
}

func TestCurrentWindowEndTime(t *testing.T) {
	cases := []struct {
		name        string
		maintenance *GettablePlannedMaintenance
		now         time.Time
		wantActive  bool
		wantEnd     time.Time
	}{
		{
			name: "fixed schedule - currently active",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			now:        time.Date(2024, 6, 1, 12, 0, 0, 0, time.UTC),
			wantActive: true,
			wantEnd:    time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
		},
		{
			name: "fixed schedule - at start boundary",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			now:        time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
			wantActive: true,
			wantEnd:    time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
		},
		{
			name: "fixed schedule - at end boundary",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			now:        time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
			wantActive: true,
			wantEnd:    time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
		},
		{
			name: "fixed schedule - before window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			now:        time.Date(2024, 6, 1, 8, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name: "fixed schedule - after window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			now:        time.Date(2024, 6, 1, 15, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name: "daily recurring - within window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			now:        time.Date(2024, 3, 15, 13, 0, 0, 0, time.UTC),
			wantActive: true,
			wantEnd:    time.Date(2024, 3, 15, 14, 0, 0, 0, time.UTC),
		},
		{
			name: "daily recurring - outside window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			now:        time.Date(2024, 3, 15, 16, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name: "daily recurring - crosses midnight",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 23, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			now:        time.Date(2024, 3, 15, 0, 30, 0, 0, time.UTC),
			wantActive: true,
			wantEnd:    time.Date(2024, 3, 15, 1, 0, 0, 0, time.UTC),
		},
		{
			name: "weekly recurring - on allowed day within window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 1, 10, 0, 0, 0, time.UTC), // Monday
						Duration:   Duration(3 * time.Hour),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday},
					},
				},
			},
			now:        time.Date(2024, 4, 15, 12, 0, 0, 0, time.UTC), // Monday
			wantActive: true,
			wantEnd:    time.Date(2024, 4, 15, 13, 0, 0, 0, time.UTC),
		},
		{
			name: "weekly recurring - on non-allowed day",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 1, 10, 0, 0, 0, time.UTC), // Monday
						Duration:   Duration(3 * time.Hour),
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday},
					},
				},
			},
			now:        time.Date(2024, 4, 16, 12, 0, 0, 0, time.UTC), // Tuesday
			wantActive: false,
		},
		{
			name: "weekly recurring - crosses midnight into next day",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 4, 1, 22, 0, 0, 0, time.UTC), // Monday 22:00
						Duration:   Duration(4 * time.Hour),                      // Until Tuesday 02:00
						RepeatType: RepeatTypeWeekly,
						RepeatOn:   []RepeatOn{RepeatOnMonday},
					},
				},
			},
			now:        time.Date(2024, 4, 2, 1, 0, 0, 0, time.UTC), // Tuesday 01:00
			wantActive: true,
			wantEnd:    time.Date(2024, 4, 2, 2, 0, 0, 0, time.UTC),
		},
		{
			name: "monthly recurring - within window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 15, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			now:        time.Date(2024, 3, 15, 13, 0, 0, 0, time.UTC),
			wantActive: true,
			wantEnd:    time.Date(2024, 3, 15, 14, 0, 0, 0, time.UTC),
		},
		{
			name: "monthly recurring - outside window",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 15, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			now:        time.Date(2024, 3, 15, 15, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name: "monthly recurring - February with day 31 start clamped to 29",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 31, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			now:        time.Date(2024, 2, 29, 13, 0, 0, 0, time.UTC), // Leap year
			wantActive: true,
			wantEnd:    time.Date(2024, 2, 29, 14, 0, 0, 0, time.UTC),
		},
		{
			name: "recurring - before recurrence start time",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			now:        time.Date(2024, 12, 31, 12, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name: "recurring - past recurrence end time",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						EndTime:    timePtr(time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC)),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			now:        time.Date(2024, 4, 1, 12, 30, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name: "invalid timezone returns not active",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "Invalid/Timezone",
					StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 14, 0, 0, 0, time.UTC),
				},
			},
			now:        time.Date(2024, 6, 1, 12, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name: "daily recurring - at exact end boundary",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			now:        time.Date(2024, 3, 15, 14, 0, 0, 0, time.UTC), // Exactly at end
			wantActive: true,
			wantEnd:    time.Date(2024, 3, 15, 14, 0, 0, 0, time.UTC),
		},
		{
			name: "monthly multi-day duration crosses month boundary",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 30, 12, 0, 0, 0, time.UTC),
						Duration:   Duration(48 * time.Hour), // 2 days
						RepeatType: RepeatTypeMonthly,
					},
				},
			},
			now:        time.Date(2024, 2, 1, 10, 0, 0, 0, time.UTC),
			wantActive: true,
			wantEnd:    time.Date(2024, 2, 1, 12, 0, 0, 0, time.UTC),
		},
		{
			name: "timezone aware - America/New_York",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "America/New_York",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 22, 0, 0, 0, time.FixedZone("EST", -5*3600)),
						Duration:   Duration(4 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			now:        time.Date(2024, 3, 15, 3, 30, 0, 0, time.UTC), // 22:30 EST previous day
			wantActive: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			endTime, active := tc.maintenance.CurrentWindowEndTime(tc.now)
			if active != tc.wantActive {
				t.Errorf("active: want %v, got %v", tc.wantActive, active)
			}
			if tc.wantActive && !tc.wantEnd.IsZero() {
				if !endTime.Equal(tc.wantEnd) {
					t.Errorf("endTime: want %v, got %v", tc.wantEnd, endTime)
				}
			}
		})
	}
}

func TestValidate(t *testing.T) {
	cases := []struct {
		name        string
		maintenance GettablePlannedMaintenance
		wantErr     bool
	}{
		{
			name: "valid fixed schedule",
			maintenance: GettablePlannedMaintenance{
				Name: "Test",
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
				},
			},
			wantErr: false,
		},
		{
			name: "valid recurring schedule",
			maintenance: GettablePlannedMaintenance{
				Name: "Test",
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			wantErr: false,
		},
		{
			name: "missing name",
			maintenance: GettablePlannedMaintenance{
				Name:     "",
				Schedule: &Schedule{Timezone: "UTC"},
			},
			wantErr: true,
		},
		{
			name: "missing schedule",
			maintenance: GettablePlannedMaintenance{
				Name:     "Test",
				Schedule: nil,
			},
			wantErr: true,
		},
		{
			name: "missing timezone",
			maintenance: GettablePlannedMaintenance{
				Name:     "Test",
				Schedule: &Schedule{Timezone: ""},
			},
			wantErr: true,
		},
		{
			name: "invalid timezone",
			maintenance: GettablePlannedMaintenance{
				Name:     "Test",
				Schedule: &Schedule{Timezone: "Nowhere/Land"},
			},
			wantErr: true,
		},
		{
			name: "start after end",
			maintenance: GettablePlannedMaintenance{
				Name: "Test",
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 2, 0, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
				},
			},
			wantErr: true,
		},
		{
			name: "recurrence missing repeat type",
			maintenance: GettablePlannedMaintenance{
				Name: "Test",
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: "",
					},
				},
			},
			wantErr: true,
		},
		{
			name: "recurrence missing duration",
			maintenance: GettablePlannedMaintenance{
				Name: "Test",
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
						Duration:   0,
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			wantErr: true,
		},
		{
			name: "recurrence end before start",
			maintenance: GettablePlannedMaintenance{
				Name: "Test",
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
						EndTime:    timePtr(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.maintenance.Validate()
			if tc.wantErr && err == nil {
				t.Error("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Errorf("expected no error, got %v", err)
			}
		})
	}
}

func TestValidateExpression(t *testing.T) {
	baseSchedule := &Schedule{
		Timezone:  "UTC",
		StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
		EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
	}

	cases := []struct {
		name    string
		m       GettablePlannedMaintenance
		wantErr bool
	}{
		{
			name: "valid expression - simple equality",
			m: GettablePlannedMaintenance{
				Name:       "Test",
				Schedule:   baseSchedule,
				Expression: `env == "prod"`,
			},
			wantErr: false,
		},
		{
			name: "valid expression - AND logic",
			m: GettablePlannedMaintenance{
				Name:       "Test",
				Schedule:   baseSchedule,
				Expression: `severity == "critical" && env == "prod"`,
			},
			wantErr: false,
		},
		{
			name: "valid expression - OR logic",
			m: GettablePlannedMaintenance{
				Name:       "Test",
				Schedule:   baseSchedule,
				Expression: `env == "prod" || env == "staging"`,
			},
			wantErr: false,
		},
		{
			name: "empty expression is valid",
			m: GettablePlannedMaintenance{
				Name:       "Test",
				Schedule:   baseSchedule,
				Expression: "",
			},
			wantErr: false,
		},
		{
			name: "invalid expression syntax",
			m: GettablePlannedMaintenance{
				Name:       "Test",
				Schedule:   baseSchedule,
				Expression: `env ==== "prod"`,
			},
			wantErr: true,
		},
		{
			name: "invalid expression - unclosed string",
			m: GettablePlannedMaintenance{
				Name:       "Test",
				Schedule:   baseSchedule,
				Expression: `env == "prod`,
			},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.m.Validate()
			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("expected no error, got %v", err)
				}
			}
		})
	}
}

func TestIsRecurring(t *testing.T) {
	cases := []struct {
		name string
		m    *GettablePlannedMaintenance
		want bool
	}{
		{
			name: "recurring schedule",
			m: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone: "UTC",
					Recurrence: &Recurrence{
						StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
						Duration:   Duration(2 * time.Hour),
						RepeatType: RepeatTypeDaily,
					},
				},
			},
			want: true,
		},
		{
			name: "fixed schedule",
			m: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
					EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
				},
			},
			want: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.m.IsRecurring(); got != tc.want {
				t.Errorf("IsRecurring() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestIsActive(t *testing.T) {
	now := time.Date(2024, 6, 15, 12, 0, 0, 0, time.UTC)

	cases := []struct {
		name string
		m    *GettablePlannedMaintenance
		want bool
	}{
		{
			name: "active - within time window",
			m: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: now.Add(-time.Hour),
					EndTime:   now.Add(time.Hour),
				},
			},
			want: true,
		},
		{
			name: "inactive - after time window",
			m: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: now.Add(-3 * time.Hour),
					EndTime:   now.Add(-1 * time.Hour),
				},
			},
			want: false,
		},
		{
			name: "inactive - before time window",
			m: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: now.Add(time.Hour),
					EndTime:   now.Add(3 * time.Hour),
				},
			},
			want: false,
		},
		{
			name: "active - with expression",
			m: &GettablePlannedMaintenance{
				Expression: `env == "prod"`,
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: now.Add(-time.Hour),
					EndTime:   now.Add(time.Hour),
				},
			},
			want: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.m.IsActive(now); got != tc.want {
				t.Errorf("IsActive() = %v, want %v", got, tc.want)
			}
		})
	}
}
