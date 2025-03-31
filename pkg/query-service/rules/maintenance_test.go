package rules

import (
	"testing"
	"time"
)

func TestShouldSkipMaintenance(t *testing.T) {

	cases := []struct {
		name        string
		maintenance *PlannedMaintenance
		ts          time.Time
		skip        bool
	}{
		{
			name: "fixed planned maintenance start <= ts <= end",
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
			maintenance: &PlannedMaintenance{
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
		result := c.maintenance.shouldSkip(c.name, c.ts)
		if result != c.skip {
			t.Errorf("skip %v, got %v, case:%d - %s", c.skip, result, idx, c.name)
		}
	}
}
