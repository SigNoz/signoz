package ruletypes

import (
	"encoding/json"
	"testing"
	"time"
)

func TestRollingWindow_EvaluationTime(t *testing.T) {
	tests := []struct {
		name       string
		evalWindow Duration
		current    time.Time
		wantStart  time.Time
		wantEnd    time.Time
	}{
		{
			name:       "5 minute rolling window",
			evalWindow: Duration(5 * time.Minute),
			current:    time.Date(2023, 12, 1, 12, 30, 0, 0, time.UTC),
			wantStart:  time.Date(2023, 12, 1, 12, 25, 0, 0, time.UTC),
			wantEnd:    time.Date(2023, 12, 1, 12, 30, 0, 0, time.UTC),
		},
		{
			name:       "1 hour rolling window",
			evalWindow: Duration(1 * time.Hour),
			current:    time.Date(2023, 12, 1, 15, 45, 30, 0, time.UTC),
			wantStart:  time.Date(2023, 12, 1, 14, 45, 30, 0, time.UTC),
			wantEnd:    time.Date(2023, 12, 1, 15, 45, 30, 0, time.UTC),
		},
		{
			name:       "30 second rolling window",
			evalWindow: Duration(30 * time.Second),
			current:    time.Date(2023, 12, 1, 12, 30, 15, 0, time.UTC),
			wantStart:  time.Date(2023, 12, 1, 12, 29, 45, 0, time.UTC),
			wantEnd:    time.Date(2023, 12, 1, 12, 30, 15, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rw := &RollingWindow{
				EvalWindow: tt.evalWindow,
				Frequency:  Duration(1 * time.Minute),
			}

			gotStart, gotEnd := rw.NextWindowFor(tt.current)
			if !gotStart.Equal(tt.wantStart) {
				t.Errorf("RollingWindow.NextWindowFor() start time = %v, want %v", gotStart, tt.wantStart)
			}
			if !gotEnd.Equal(tt.wantEnd) {
				t.Errorf("RollingWindow.NextWindowFor() end time = %v, want %v", gotEnd, tt.wantEnd)
			}
		})
	}
}

func TestCumulativeWindow_NewScheduleSystem(t *testing.T) {
	tests := []struct {
		name    string
		window  CumulativeWindow
		current time.Time
		wantErr bool
	}{
		{
			name: "hourly schedule - minute 15",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(15),
				},
				Frequency: Duration(5 * time.Minute),
				Timezone:  "UTC",
			},
			current: time.Date(2025, 3, 15, 14, 30, 0, 0, time.UTC),
			wantErr: false,
		},
		{
			name: "daily schedule - 9:30 AM IST",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(9),
					Minute: intPtr(30),
				},
				Frequency: Duration(1 * time.Hour),
				Timezone:  "Asia/Kolkata",
			},
			current: time.Date(2025, 3, 15, 15, 30, 0, 0, time.UTC),
			wantErr: false,
		},
		{
			name: "weekly schedule - Monday 2:00 PM",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:    ScheduleTypeWeekly,
					Weekday: intPtr(1), // Monday
					Hour:    intPtr(14),
					Minute:  intPtr(0),
				},
				Frequency: Duration(24 * time.Hour),
				Timezone:  "America/New_York",
			},
			current: time.Date(2025, 3, 18, 19, 0, 0, 0, time.UTC), // Tuesday
			wantErr: false,
		},
		{
			name: "monthly schedule - 1st at midnight",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(1),
					Hour:   intPtr(0),
					Minute: intPtr(0),
				},
				Frequency: Duration(24 * time.Hour),
				Timezone:  "UTC",
			},
			current: time.Date(2025, 3, 15, 12, 0, 0, 0, time.UTC),
			wantErr: false,
		},
		{
			name: "invalid schedule - missing minute for hourly",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type: ScheduleTypeHourly,
				},
				Frequency: Duration(5 * time.Minute),
				Timezone:  "UTC",
			},
			current: time.Date(2025, 3, 15, 14, 30, 0, 0, time.UTC),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test validation
			err := tt.window.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("CumulativeWindow.Validate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Test NextWindowFor
				start, end := tt.window.NextWindowFor(tt.current)

				// Basic validation
				if start.After(end) {
					t.Errorf("Window start should not be after end: start=%v, end=%v", start, end)
				}

				if end.After(tt.current) {
					t.Errorf("Window end should not be after current time: end=%v, current=%v", end, tt.current)
				}
			}
		})
	}
}

func intPtr(i int) *int {
	return &i
}

func TestCumulativeWindow_NextWindowFor(t *testing.T) {
	tests := []struct {
		name      string
		window    CumulativeWindow
		current   time.Time
		wantStart time.Time
		wantEnd   time.Time
	}{
		// Hourly schedule tests
		{
			name: "hourly - current at exact minute",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(30),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 14, 30, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 15, 14, 30, 0, 0, time.UTC),
			wantEnd:   time.Date(2025, 3, 15, 14, 30, 0, 0, time.UTC),
		},
		{
			name: "hourly - current after scheduled minute",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(15),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 14, 45, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 15, 14, 15, 0, 0, time.UTC),
			wantEnd:   time.Date(2025, 3, 15, 14, 45, 0, 0, time.UTC),
		},
		{
			name: "hourly - current before scheduled minute",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(30),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 14, 15, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 15, 13, 30, 0, 0, time.UTC), // Previous hour
			wantEnd:   time.Date(2025, 3, 15, 14, 15, 0, 0, time.UTC),
		},
		{
			name: "hourly - current before scheduled minute",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(30),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 13, 14, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 15, 12, 30, 0, 0, time.UTC), // Previous hour
			wantEnd:   time.Date(2025, 3, 15, 13, 14, 0, 0, time.UTC),
		},
		{
			name: "hourly - current before scheduled minute",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(30),
				},
				Timezone: "Asia/Kolkata",
			},
			current:   time.Date(2025, 3, 15, 13, 14, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 15, 13, 00, 0, 0, time.UTC), // Previous hour
			wantEnd:   time.Date(2025, 3, 15, 13, 14, 0, 0, time.UTC),
		},

		// Daily schedule tests
		{
			name: "daily - current at exact time",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(9),
					Minute: intPtr(30),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 9, 30, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 15, 9, 30, 0, 0, time.UTC),
			wantEnd:   time.Date(2025, 3, 15, 9, 30, 0, 0, time.UTC),
		},
		{
			name: "daily - current after scheduled time",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(9),
					Minute: intPtr(30),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 15, 45, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 15, 9, 30, 0, 0, time.UTC),
			wantEnd:   time.Date(2025, 3, 15, 15, 45, 0, 0, time.UTC),
		},
		{
			name: "daily - current before scheduled time",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(9),
					Minute: intPtr(30),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 8, 15, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 14, 9, 30, 0, 0, time.UTC), // Previous day
			wantEnd:   time.Date(2025, 3, 15, 8, 15, 0, 0, time.UTC),
		},
		{
			name: "daily - with timezone IST",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(9),
					Minute: intPtr(30),
				},
				Timezone: "Asia/Kolkata",
			},
			current:   time.Date(2025, 3, 15, 15, 30, 0, 0, time.UTC), // 9:00 PM IST
			wantStart: time.Date(2025, 3, 15, 4, 0, 0, 0, time.UTC),   // 9:30 AM IST in UTC
			wantEnd:   time.Date(2025, 3, 15, 15, 30, 0, 0, time.UTC),
		},

		// Weekly schedule tests
		{
			name: "weekly - current on scheduled day at exact time",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:    ScheduleTypeWeekly,
					Weekday: intPtr(1), // Monday
					Hour:    intPtr(14),
					Minute:  intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 17, 14, 0, 0, 0, time.UTC), // Monday
			wantStart: time.Date(2025, 3, 17, 14, 0, 0, 0, time.UTC),
			wantEnd:   time.Date(2025, 3, 17, 14, 0, 0, 0, time.UTC),
		},
		{
			name: "weekly - current on different day",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:    ScheduleTypeWeekly,
					Weekday: intPtr(1), // Monday
					Hour:    intPtr(14),
					Minute:  intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 19, 10, 30, 0, 0, time.UTC), // Wednesday
			wantStart: time.Date(2025, 3, 17, 14, 0, 0, 0, time.UTC),  // Previous Monday
			wantEnd:   time.Date(2025, 3, 19, 10, 30, 0, 0, time.UTC),
		},
		{
			name: "weekly - current before scheduled time on same day",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:    ScheduleTypeWeekly,
					Weekday: intPtr(2), // Tuesday
					Hour:    intPtr(14),
					Minute:  intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 18, 10, 0, 0, 0, time.UTC), // Tuesday before 2 PM
			wantStart: time.Date(2025, 3, 11, 14, 0, 0, 0, time.UTC), // Previous Tuesday
			wantEnd:   time.Date(2025, 3, 18, 10, 0, 0, 0, time.UTC),
		},

		// Monthly schedule tests
		{
			name: "monthly - current on scheduled day at exact time",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(15),
					Hour:   intPtr(12),
					Minute: intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 12, 0, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 15, 12, 0, 0, 0, time.UTC),
			wantEnd:   time.Date(2025, 3, 15, 12, 0, 0, 0, time.UTC),
		},
		{
			name: "monthly - current after scheduled time",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(1),
					Hour:   intPtr(0),
					Minute: intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 16, 30, 0, 0, time.UTC),
			wantStart: time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC),
			wantEnd:   time.Date(2025, 3, 15, 16, 30, 0, 0, time.UTC),
		},
		{
			name: "monthly - current before scheduled day",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(15),
					Hour:   intPtr(12),
					Minute: intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 10, 10, 0, 0, 0, time.UTC),
			wantStart: time.Date(2025, 2, 15, 12, 0, 0, 0, time.UTC), // Previous month
			wantEnd:   time.Date(2025, 3, 10, 10, 0, 0, 0, time.UTC),
		},
		{
			name: "monthly - day 31 in february (edge case)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(31),
					Hour:   intPtr(12),
					Minute: intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2025, 3, 15, 10, 0, 0, 0, time.UTC),
			wantStart: time.Date(2025, 2, 28, 12, 0, 0, 0, time.UTC), // Feb 28 (last day of Feb)
			wantEnd:   time.Date(2025, 3, 15, 10, 0, 0, 0, time.UTC),
		},

		// Comprehensive timezone-based test cases
		{
			name: "Asia/Tokyo timezone - hourly schedule",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(45),
				},
				Timezone: "Asia/Tokyo",
			},
			current:   time.Date(2023, 12, 15, 2, 30, 0, 0, time.UTC), // 11:30 AM JST
			wantStart: time.Date(2023, 12, 15, 1, 45, 0, 0, time.UTC), // 10:45 AM JST in UTC
			wantEnd:   time.Date(2023, 12, 15, 2, 30, 0, 0, time.UTC),
		},
		{
			name: "America/New_York timezone - daily schedule (EST)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(8), // 8 AM EST
					Minute: intPtr(0),
				},
				Timezone: "America/New_York",
			},
			current:   time.Date(2023, 12, 15, 20, 30, 0, 0, time.UTC), // 3:30 PM EST
			wantStart: time.Date(2023, 12, 15, 13, 0, 0, 0, time.UTC),  // 8 AM EST in UTC
			wantEnd:   time.Date(2023, 12, 15, 20, 30, 0, 0, time.UTC),
		},
		{
			name: "Europe/London timezone - weekly schedule (GMT)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:    ScheduleTypeWeekly,
					Weekday: intPtr(1), // Monday
					Hour:    intPtr(12),
					Minute:  intPtr(0),
				},
				Timezone: "Europe/London",
			},
			current:   time.Date(2023, 12, 15, 15, 0, 0, 0, time.UTC), // Friday 3 PM GMT
			wantStart: time.Date(2023, 12, 11, 12, 0, 0, 0, time.UTC), // Previous Monday 12 PM GMT
			wantEnd:   time.Date(2023, 12, 15, 15, 0, 0, 0, time.UTC),
		},
		{
			name: "Australia/Sydney timezone - monthly schedule (AEDT)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(1),
					Hour:   intPtr(0), // Midnight AEDT
					Minute: intPtr(0),
				},
				Timezone: "Australia/Sydney",
			},
			current:   time.Date(2023, 12, 15, 5, 0, 0, 0, time.UTC),  // 4 PM AEDT on 15th
			wantStart: time.Date(2023, 11, 30, 13, 0, 0, 0, time.UTC), // Midnight AEDT on Dec 1st in UTC (Nov 30 13:00 UTC)
			wantEnd:   time.Date(2023, 12, 15, 5, 0, 0, 0, time.UTC),
		},
		{
			name: "Pacific/Honolulu timezone - hourly schedule (HST)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(30),
				},
				Timezone: "Pacific/Honolulu",
			},
			current:   time.Date(2023, 12, 15, 22, 45, 0, 0, time.UTC), // 12:45 PM HST
			wantStart: time.Date(2023, 12, 15, 22, 30, 0, 0, time.UTC), // 12:30 PM HST in UTC
			wantEnd:   time.Date(2023, 12, 15, 22, 45, 0, 0, time.UTC),
		},
		{
			name: "America/Los_Angeles timezone - DST transition daily",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(2), // 2 AM PST/PDT
					Minute: intPtr(0),
				},
				Timezone: "America/Los_Angeles",
			},
			current:   time.Date(2023, 3, 12, 15, 0, 0, 0, time.UTC), // Day after DST starts
			wantStart: time.Date(2023, 3, 12, 9, 0, 0, 0, time.UTC),  // 2 AM PDT in UTC (PDT = UTC-7)
			wantEnd:   time.Date(2023, 3, 12, 15, 0, 0, 0, time.UTC),
		},
		{
			name: "Europe/Berlin timezone - weekly schedule (CET)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:    ScheduleTypeWeekly,
					Weekday: intPtr(5),  // Friday
					Hour:    intPtr(16), // 4 PM CET
					Minute:  intPtr(30),
				},
				Timezone: "Europe/Berlin",
			},
			current:   time.Date(2023, 12, 18, 10, 0, 0, 0, time.UTC),  // Monday 11 AM CET
			wantStart: time.Date(2023, 12, 15, 15, 30, 0, 0, time.UTC), // Previous Friday 4:30 PM CET
			wantEnd:   time.Date(2023, 12, 18, 10, 0, 0, 0, time.UTC),
		},
		{
			name: "Asia/Kolkata timezone - monthly edge case (IST)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(31), // 31st (edge case for Feb)
					Hour:   intPtr(23),
					Minute: intPtr(59),
				},
				Timezone: "Asia/Kolkata",
			},
			current:   time.Date(2023, 3, 10, 12, 0, 0, 0, time.UTC),  // March 10th 5:30 PM IST
			wantStart: time.Date(2023, 2, 28, 18, 29, 0, 0, time.UTC), // Feb 28 11:59 PM IST (last day of Feb)
			wantEnd:   time.Date(2023, 3, 10, 12, 0, 0, 0, time.UTC),
		},
		{
			name: "America/Chicago timezone - hourly across midnight (CST)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(0), // Top of hour
				},
				Timezone: "America/Chicago",
			},
			current:   time.Date(2023, 12, 15, 6, 30, 0, 0, time.UTC), // 12:30 AM CST
			wantStart: time.Date(2023, 12, 15, 6, 0, 0, 0, time.UTC),  // Midnight CST in UTC
			wantEnd:   time.Date(2023, 12, 15, 6, 30, 0, 0, time.UTC),
		},

		// Boundary condition test cases
		{
			name: "boundary - end of year transition (Dec 31 to Jan 1)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(0),
					Minute: intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC), // Jan 1st noon
			wantStart: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),  // Jan 1st midnight
			wantEnd:   time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - leap year Feb 29th monthly schedule",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(29),
					Hour:   intPtr(15),
					Minute: intPtr(30),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2024, 3, 10, 10, 0, 0, 0, time.UTC),  // March 10th (leap year)
			wantStart: time.Date(2024, 2, 29, 15, 30, 0, 0, time.UTC), // Feb 29th exists in leap year
			wantEnd:   time.Date(2024, 3, 10, 10, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - non-leap year Feb 29th request (fallback to Feb 28th)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(29),
					Hour:   intPtr(15),
					Minute: intPtr(30),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2023, 3, 10, 10, 0, 0, 0, time.UTC),  // March 10th (non-leap year)
			wantStart: time.Date(2023, 2, 28, 15, 30, 0, 0, time.UTC), // Feb 28th (fallback)
			wantEnd:   time.Date(2023, 3, 10, 10, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - day 31 in April (30-day month fallback)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(31),
					Hour:   intPtr(12),
					Minute: intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2023, 5, 15, 10, 0, 0, 0, time.UTC), // May 15th
			wantStart: time.Date(2023, 4, 30, 12, 0, 0, 0, time.UTC), // April 30th (fallback from 31st)
			wantEnd:   time.Date(2023, 5, 15, 10, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - weekly Sunday to Monday transition",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:    ScheduleTypeWeekly,
					Weekday: intPtr(0), // Sunday
					Hour:    intPtr(23),
					Minute:  intPtr(59),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2023, 12, 11, 1, 0, 0, 0, time.UTC),   // Monday 1 AM
			wantStart: time.Date(2023, 12, 10, 23, 59, 0, 0, time.UTC), // Previous Sunday 11:59 PM
			wantEnd:   time.Date(2023, 12, 11, 1, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - hourly minute 59 to minute 0 transition",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(59),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2023, 12, 15, 14, 5, 0, 0, time.UTC),  // 14:05
			wantStart: time.Date(2023, 12, 15, 13, 59, 0, 0, time.UTC), // 13:59 (previous hour)
			wantEnd:   time.Date(2023, 12, 15, 14, 5, 0, 0, time.UTC),
		},
		{
			name: "boundary - DST spring forward (2 AM doesn't exist)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(2), // 2 AM (skipped during DST)
					Minute: intPtr(30),
				},
				Timezone: "America/New_York",
			},
			current:   time.Date(2023, 3, 12, 15, 0, 0, 0, time.UTC), // Day DST starts
			wantStart: time.Date(2023, 3, 12, 6, 30, 0, 0, time.UTC), // Same day 2:30 AM EDT (adjusted for DST)
			wantEnd:   time.Date(2023, 3, 12, 15, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - DST fall back (2 AM occurs twice)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(2), // 2 AM (occurs twice)
					Minute: intPtr(30),
				},
				Timezone: "America/New_York",
			},
			current:   time.Date(2023, 11, 5, 15, 0, 0, 0, time.UTC), // Day DST ends
			wantStart: time.Date(2023, 11, 5, 7, 30, 0, 0, time.UTC), // Same day 2:30 AM EST (after fall back)
			wantEnd:   time.Date(2023, 11, 5, 15, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - month transition January to February",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeMonthly,
					Day:    intPtr(31),
					Hour:   intPtr(0),
					Minute: intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2023, 2, 15, 12, 0, 0, 0, time.UTC), // February 15th
			wantStart: time.Date(2023, 1, 31, 0, 0, 0, 0, time.UTC),  // January 31st (exists)
			wantEnd:   time.Date(2023, 2, 15, 12, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - extreme timezone offset (+14 hours)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(12),
					Minute: intPtr(0),
				},
				Timezone: "Pacific/Kiritimati", // UTC+14
			},
			current:   time.Date(2023, 12, 15, 5, 0, 0, 0, time.UTC),  // 7 PM local time
			wantStart: time.Date(2023, 12, 14, 22, 0, 0, 0, time.UTC), // 12 PM local time (previous day in UTC)
			wantEnd:   time.Date(2023, 12, 15, 5, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - extreme timezone offset (-12 hours)",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeDaily,
					Hour:   intPtr(12),
					Minute: intPtr(0),
				},
				Timezone: "Etc/GMT+12", // UTC-12 (use standard timezone name)
			},
			current:   time.Date(2023, 12, 15, 5, 0, 0, 0, time.UTC), // 5 PM previous day local time
			wantStart: time.Date(2023, 12, 15, 0, 0, 0, 0, time.UTC), // 12 PM local time (same day in UTC)
			wantEnd:   time.Date(2023, 12, 15, 5, 0, 0, 0, time.UTC),
		},
		{
			name: "boundary - week boundary Saturday to Sunday",
			window: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:    ScheduleTypeWeekly,
					Weekday: intPtr(6), // Saturday
					Hour:    intPtr(0),
					Minute:  intPtr(0),
				},
				Timezone: "UTC",
			},
			current:   time.Date(2023, 12, 17, 12, 0, 0, 0, time.UTC), // Sunday noon
			wantStart: time.Date(2023, 12, 16, 0, 0, 0, 0, time.UTC),  // Saturday midnight
			wantEnd:   time.Date(2023, 12, 17, 12, 0, 0, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotStart, gotEnd := tt.window.NextWindowFor(tt.current)

			if !gotStart.Equal(tt.wantStart) {
				t.Errorf("NextWindowFor() start = %v, want %v", gotStart, tt.wantStart)
			}
			if !gotEnd.Equal(tt.wantEnd) {
				t.Errorf("NextWindowFor() end = %v, want %v", gotEnd, tt.wantEnd)
			}

			// Validate basic invariants
			if gotStart.After(gotEnd) {
				t.Errorf("Window start should not be after end: start=%v, end=%v", gotStart, gotEnd)
			}
			if gotEnd.After(tt.current) {
				t.Errorf("Window end should not be after current time: end=%v, current=%v", gotEnd, tt.current)
			}

			duration := gotEnd.Sub(gotStart)

			// Validate window length is reasonable
			if duration < 0 {
				t.Errorf("Window duration should not be negative: %v", duration)
			}
			if duration > 366*24*time.Hour {
				t.Errorf("Window duration should not exceed 1 year: %v", duration)
			}
		})
	}
}

func TestEvaluationEnvelope_UnmarshalJSON(t *testing.T) {
	tests := []struct {
		name      string
		jsonInput string
		wantKind  EvaluationKind
		wantSpec  interface{}
		wantError bool
	}{
		{
			name:      "rolling evaluation with valid data",
			jsonInput: `{"kind":"rolling","spec":{"evalWindow":"5m","frequency":"1m"}}`,
			wantKind:  RollingEvaluation,
			wantSpec: RollingWindow{
				EvalWindow: Duration(5 * time.Minute),
				Frequency:  Duration(1 * time.Minute),
			},
		},
		{
			name:      "cumulative evaluation with valid data",
			jsonInput: `{"kind":"cumulative","spec":{"schedule":{"type":"hourly","minute":30},"frequency":"2m","timezone":"UTC"}}`,
			wantKind:  CumulativeEvaluation,
			wantSpec: CumulativeWindow{
				Schedule: CumulativeSchedule{
					Type:   ScheduleTypeHourly,
					Minute: intPtr(30),
				},
				Frequency: Duration(2 * time.Minute),
				Timezone:  "UTC",
			},
		},
		{
			name:      "rolling evaluation with validation error - zero evalWindow",
			jsonInput: `{"kind":"rolling","spec":{"evalWindow":"0s","frequency":"1m"}}`,
			wantError: true,
		},
		{
			name:      "rolling evaluation with validation error - zero frequency",
			jsonInput: `{"kind":"rolling","spec":{"evalWindow":"5m","frequency":"0s"}}`,
			wantError: true,
		},
		{
			name:      "cumulative evaluation with validation error - zero frequency",
			jsonInput: `{"kind":"cumulative","spec":{"schedule":{"type":"hourly","minute":30},"frequency":"0s","timezone":"UTC"}}`,
			wantError: true,
		},
		{
			name:      "cumulative evaluation with validation error - invalid timezone",
			jsonInput: `{"kind":"cumulative","spec":{"schedule":{"type":"daily","hour":9,"minute":30},"frequency":"1m","timezone":"Invalid/Timezone"}}`,
			wantError: true,
		},
		{
			name:      "cumulative evaluation with validation error - missing minute for hourly",
			jsonInput: `{"kind":"cumulative","spec":{"schedule":{"type":"hourly"},"frequency":"1m","timezone":"UTC"}}`,
			wantError: true,
		},
		{
			name:      "unknown evaluation kind",
			jsonInput: `{"kind":"unknown","spec":{"evalWindow":"5m","frequency":"1h"}}`,
			wantError: true,
		},
		{
			name:      "invalid JSON",
			jsonInput: `{"kind":"rolling","spec":invalid}`,
			wantError: true,
		},
		{
			name:      "missing kind field",
			jsonInput: `{"spec":{"evalWindow":"5m","frequency":"1m"}}`,
			wantError: true,
		},
		{
			name:      "missing spec field",
			jsonInput: `{"kind":"rolling"}`,
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var envelope EvaluationEnvelope
			err := json.Unmarshal([]byte(tt.jsonInput), &envelope)

			if tt.wantError {
				if err == nil {
					t.Errorf("EvaluationEnvelope.UnmarshalJSON() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("EvaluationEnvelope.UnmarshalJSON() unexpected error = %v", err)
			}

			if envelope.Kind != tt.wantKind {
				t.Errorf("EvaluationEnvelope.Kind = %v, want %v", envelope.Kind, tt.wantKind)
			}

			// Check spec content based on type
			switch tt.wantKind {
			case RollingEvaluation:
				gotSpec, ok := envelope.Spec.(RollingWindow)
				if !ok {
					t.Fatalf("Expected RollingWindow spec, got %T", envelope.Spec)
				}
				wantSpec := tt.wantSpec.(RollingWindow)
				if gotSpec.EvalWindow != wantSpec.EvalWindow {
					t.Errorf("RollingWindow.EvalWindow = %v, want %v", gotSpec.EvalWindow, wantSpec.EvalWindow)
				}
				if gotSpec.Frequency != wantSpec.Frequency {
					t.Errorf("RollingWindow.Frequency = %v, want %v", gotSpec.Frequency, wantSpec.Frequency)
				}
			case CumulativeEvaluation:
				gotSpec, ok := envelope.Spec.(CumulativeWindow)
				if !ok {
					t.Fatalf("Expected CumulativeWindow spec, got %T", envelope.Spec)
				}
				wantSpec := tt.wantSpec.(CumulativeWindow)
				if gotSpec.Schedule.Type != wantSpec.Schedule.Type {
					t.Errorf("CumulativeWindow.Schedule.Type = %v, want %v", gotSpec.Schedule.Type, wantSpec.Schedule.Type)
				}
				if (gotSpec.Schedule.Minute == nil) != (wantSpec.Schedule.Minute == nil) ||
					(gotSpec.Schedule.Minute != nil && wantSpec.Schedule.Minute != nil && *gotSpec.Schedule.Minute != *wantSpec.Schedule.Minute) {
					t.Errorf("CumulativeWindow.Schedule.Minute = %v, want %v", gotSpec.Schedule.Minute, wantSpec.Schedule.Minute)
				}
				if gotSpec.Frequency != wantSpec.Frequency {
					t.Errorf("CumulativeWindow.Frequency = %v, want %v", gotSpec.Frequency, wantSpec.Frequency)
				}
				if gotSpec.Timezone != wantSpec.Timezone {
					t.Errorf("CumulativeWindow.Timezone = %v, want %v", gotSpec.Timezone, wantSpec.Timezone)
				}
			}
		})
	}
}
