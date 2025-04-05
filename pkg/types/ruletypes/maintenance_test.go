package ruletypes

import (
	"testing"
	"time"
)

// Helper function to create a time pointer
func timePtr(t time.Time) *time.Time {
	return &t
}

func TestShouldSkipMaintenance(t *testing.T) {

	cases := []struct {
		name        string
		maintenance *GettablePlannedMaintenance
		ts          time.Time
		skip        bool
	}{
		{
			name: "only-on-saturday",
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
			skip: true,
		},
		// Testing weekly recurrence with midnight crossing
		{
			name: "weekly-across-midnight-previous-day",
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
			skip: true,
		},
		// Testing weekly recurrence with midnight crossing
		{
			name: "weekly-across-midnight-previous-day",
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
			ts:   time.Date(2024, 4, 23, 1, 30, 0, 0, time.UTC), // Tuesday 01:30
			skip: true,
		},
		// Testing weekly recurrence with multi day duration
		{
			name: "weekly-across-midnight-previous-day",
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
			ts:   time.Date(2024, 4, 25, 1, 30, 0, 0, time.UTC), // Tuesday 01:30
			skip: true,
		},
		// Weekly recurrence where the previous day is not in RepeatOn
		{
			name: "weekly-across-midnight-previous-day-not-in-repeaton",
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
			skip: true,
		},
		// Daily recurrence with midnight crossing
		{
			name: "daily-maintenance-across-midnight",
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
			skip: true,
		},
		// Exactly at start time boundary
		{
			name: "at-start-time-boundary",
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
			skip: true,
		},
		// Exactly at end time boundary
		{
			name: "at-end-time-boundary",
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
			skip: true,
		},
		// Monthly maintenance with multi-day duration
		{
			name: "monthly-multi-day-duration",
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
			skip: true,
		},
		// Weekly maintenance with multi-day duration
		{
			name: "weekly-multi-day-duration",
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
			skip: true,
		},
		// Monthly maintenance that crosses to next month
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
			skip: true,
		},
		// Different timezone tests
		{
			name: "timezone-offset-test",
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
			skip: true,
		},
		// Test negative case - time well outside window
		{
			name: "daily-maintenance-time-outside-window",
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
			skip: false,
		},
		// Test for recurring maintenance with an end date that is before the current time
		{
			name: "recurring-maintenance-with-past-end-date",
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
			skip: false,
		},
		// Monthly recurring maintenance spanning end of month into beginning of next month
		{
			name: "monthly-maintenance-spans-month-end",
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
			skip: true,
		},
		// Test for RepeatOn with empty array (should apply to all days)
		{
			name: "weekly-empty-repeaton",
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
			skip: true,
		},
		// February has fewer days than January - test the edge case when maintenance is on 31st
		{
			name: "monthly-maintenance-february-fewer-days",
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
			skip: false,
		},
		{
			name: "daily-maintenance-crosses-midnight",
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
			skip: true,
		},
		{
			name: "monthly-maintenance-crosses-month-end",
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
			skip: true,
		},
		{
			name: "monthly-maintenance-crosses-month-end-and-duration-is-2-days",
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
			skip: true,
		},
		{
			name: "weekly-maintenance-crosses-midnight",
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
			skip: true,
		},
		{
			name: "monthly-maintenance-crosses-month-end-and-duration-is-2-days",
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
			skip: true,
		},
		{
			name: "daily-maintenance-crosses-midnight",
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
			skip: true,
		},
		{
			name: "monthly-maintenance-crosses-month-end-and-duration-is-2-hours",
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
			skip: true,
		},
		{
			name: "fixed planned maintenance start <= ts <= end",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Now().UTC().Add(-time.Hour),
					EndTime:   time.Now().UTC().Add(time.Hour * 2),
				},
			},
			ts:   time.Now().UTC(),
			skip: true,
		},
		{
			name: "fixed planned maintenance start >= ts",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Now().UTC().Add(time.Hour),
					EndTime:   time.Now().UTC().Add(time.Hour * 2),
				},
			},
			ts:   time.Now().UTC(),
			skip: false,
		},
		{
			name: "fixed planned maintenance ts < start",
			maintenance: &GettablePlannedMaintenance{
				Schedule: &Schedule{
					Timezone:  "UTC",
					StartTime: time.Now().UTC().Add(time.Hour),
					EndTime:   time.Now().UTC().Add(time.Hour * 2),
				},
			},
			ts:   time.Now().UTC().Add(-time.Hour),
			skip: false,
		},
		{
			name: "recurring maintenance, repeat sunday, saturday, weekly for 24 hours, in Us/Eastern timezone",
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
			skip: true,
		},
		{
			name: "recurring maintenance, repeat daily from 12:00 to 14:00",
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
			skip: true,
		},
		{
			name: "recurring maintenance, repeat daily from 12:00 to 14:00",
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
			skip: true,
		},
		{
			name: "recurring maintenance, repeat daily from 12:00 to 14:00",
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
			skip: true,
		},
		{
			name: "recurring maintenance, repeat weekly on monday from 12:00 to 14:00",
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
			skip: true,
		},
		{
			name: "recurring maintenance, repeat weekly on monday from 12:00 to 14:00",
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
			skip: false,
		},
		{
			name: "recurring maintenance, repeat weekly on monday from 12:00 to 14:00",
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
			skip: false,
		},
		{
			name: "recurring maintenance, repeat weekly on monday from 12:00 to 14:00",
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
			skip: true,
		},
		{
			name: "recurring maintenance, repeat weekly on monday from 12:00 to 14:00",
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
			skip: true,
		},
		{
			name: "recurring maintenance, repeat monthly on 4th from 12:00 to 14:00",
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
			skip: true,
		},
		{
			name: "recurring maintenance, repeat monthly on 4th from 12:00 to 14:00",
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
			skip: false,
		},
		{
			name: "recurring maintenance, repeat monthly on 4th from 12:00 to 14:00",
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
			skip: true,
		},
	}

	for idx, c := range cases {
		result := c.maintenance.ShouldSkip(c.name, c.ts)
		if result != c.skip {
			t.Errorf("skip %v, got %v, case:%d - %s", c.skip, result, idx, c.name)
		}
	}
}
