package ruletypes

import (
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

			gotStart, gotEnd, err := rw.NextWindowFor(tt.current)

			if err != nil {
				t.Fatalf("RollingWindow.NextWindowFor() unexpected error = %v", err)
			}
			if !gotStart.Equal(tt.wantStart) {
				t.Errorf("RollingWindow.NextWindowFor() start time = %v, want %v", gotStart, tt.wantStart)
			}
			if !gotEnd.Equal(tt.wantEnd) {
				t.Errorf("RollingWindow.NextWindowFor() end time = %v, want %v", gotEnd, tt.wantEnd)
			}
		})
	}
}

func TestCumulativeWindow_EvaluationTime(t *testing.T) {
	baseTime := time.Date(2023, 12, 1, 12, 0, 0, 0, time.UTC)
	startsAtUnixMilli := baseTime.UnixMilli()

	tests := []struct {
		name       string
		startsAt   int64
		evalWindow Duration
		current    time.Time
		wantStart  time.Time
		wantEnd    time.Time
		wantError  bool
	}{
		{
			name:       "current time before starts at",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime.Add(-1 * time.Hour),
			wantError:  true,
		},
		{
			name:       "first window - exact start time",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime,
			wantStart:  baseTime,
			wantEnd:    baseTime,
		},
		{
			name:       "first window - within first interval",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime.Add(2 * time.Minute),
			wantStart:  baseTime,
			wantEnd:    baseTime.Add(2 * time.Minute),
		},
		{
			name:       "second window - exactly 5 minutes later",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime.Add(5 * time.Minute),
			wantStart:  baseTime,                      // Previous window start
			wantEnd:    baseTime.Add(5 * time.Minute), // Previous window end
		},
		{
			name:       "second window - within second interval",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime.Add(7 * time.Minute),
			wantStart:  baseTime.Add(5 * time.Minute),
			wantEnd:    baseTime.Add(7 * time.Minute),
		},
		{
			name:       "multiple windows later",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(10 * time.Minute),
			current:    baseTime.Add(37 * time.Minute), // 3 complete windows + 7 minutes
			wantStart:  baseTime.Add(30 * time.Minute), // Start of 4th window
			wantEnd:    baseTime.Add(37 * time.Minute),
		},
		{
			name:       "zero eval window",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(0),
			current:    baseTime.Add(10 * time.Minute),
			wantError:  true,
		},
		{
			name:       "negative eval window",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(-5 * time.Minute),
			current:    baseTime.Add(10 * time.Minute),
			wantError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cw := &CumulativeWindow{
				StartsAt:   tt.startsAt,
				EvalWindow: tt.evalWindow,
			}

			gotStart, gotEnd, err := cw.NextWindowFor(tt.current)

			if tt.wantError {
				if err == nil {
					t.Errorf("CumulativeWindow.NextWindowFor() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("CumulativeWindow.NextWindowFor() unexpected error = %v", err)
			}
			if !gotStart.Equal(tt.wantStart) {
				t.Errorf("CumulativeWindow.NextWindowFor() start time = %v, want %v", gotStart, tt.wantStart)
			}
			if !gotEnd.Equal(tt.wantEnd) {
				t.Errorf("CumulativeWindow.NextWindowFor() end time = %v, want %v", gotEnd, tt.wantEnd)
			}
		})
	}
}

func TestCumulativeWindow_UnixMilliConversion(t *testing.T) {
	baseTime := time.Date(2023, 12, 1, 15, 30, 45, 123000000, time.UTC) // 123 milliseconds
	unixMilli := baseTime.UnixMilli()

	cw := &CumulativeWindow{
		StartsAt:   unixMilli,
		EvalWindow: Duration(1 * time.Minute),
	}

	current := baseTime.Add(30 * time.Second)
	start, end, err := cw.NextWindowFor(current)

	if err != nil {
		t.Fatalf("CumulativeWindow.NextWindowFor() unexpected error = %v", err)
	}
	if !start.Equal(baseTime) {
		t.Errorf("Unix milli conversion failed: got start time %v, want %v", start, baseTime)
	}
	if !end.Equal(current) {
		t.Errorf("End time should equal current time: got %v, want %v", end, current)
	}

	if start.UnixMilli() != unixMilli {
		t.Errorf("Millisecond precision lost: got %d, want %d", start.UnixMilli(), unixMilli)
	}
}

func TestCumulativeWindow_BoundaryConditions(t *testing.T) {
	baseTime := time.Date(2023, 12, 1, 12, 0, 0, 0, time.UTC)
	startsAtUnixMilli := baseTime.UnixMilli()

	tests := []struct {
		name       string
		startsAt   int64
		evalWindow Duration
		current    time.Time
		wantStart  time.Time
		wantEnd    time.Time
		wantError  bool
	}{
		{
			name:       "exact window boundary - end of first window",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime.Add(5 * time.Minute),
			wantStart:  baseTime,                      // Previous window start
			wantEnd:    baseTime.Add(5 * time.Minute), // Previous window end
		},
		{
			name:       "exact window boundary - end of third window",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(10 * time.Minute),
			current:    baseTime.Add(30 * time.Minute),
			wantStart:  baseTime.Add(20 * time.Minute), // Previous window start
			wantEnd:    baseTime.Add(30 * time.Minute), // Previous window end
		},
		{
			name:       "one millisecond before window boundary",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime.Add(5*time.Minute - 1*time.Millisecond),
			wantStart:  baseTime,
			wantEnd:    baseTime.Add(5*time.Minute - 1*time.Millisecond),
		},
		{
			name:       "one millisecond after window boundary",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime.Add(5*time.Minute + 1*time.Millisecond),
			wantStart:  baseTime.Add(5 * time.Minute),
			wantEnd:    baseTime.Add(5*time.Minute + 1*time.Millisecond),
		},
		{
			name:       "very large eval window - 24 hours",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(24 * time.Hour),
			current:    baseTime.Add(25*time.Hour + 30*time.Minute),
			wantStart:  baseTime.Add(24 * time.Hour),
			wantEnd:    baseTime.Add(25*time.Hour + 30*time.Minute),
		},
		{
			name:       "exactly at start time with zero offset",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(1 * time.Hour),
			current:    baseTime,
			wantStart:  baseTime,
			wantEnd:    baseTime,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cw := &CumulativeWindow{
				StartsAt:   tt.startsAt,
				EvalWindow: tt.evalWindow,
			}

			gotStart, gotEnd, err := cw.NextWindowFor(tt.current)

			if tt.wantError {
				if err == nil {
					t.Errorf("CumulativeWindow.NextWindowFor() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("CumulativeWindow.NextWindowFor() unexpected error = %v", err)
			}
			if !gotStart.Equal(tt.wantStart) {
				t.Errorf("CumulativeWindow.NextWindowFor() start time = %v, want %v", gotStart, tt.wantStart)
			}
			if !gotEnd.Equal(tt.wantEnd) {
				t.Errorf("CumulativeWindow.NextWindowFor() end time = %v, want %v", gotEnd, tt.wantEnd)
			}
		})
	}
}

func TestCumulativeWindow_WindowReset(t *testing.T) {
	baseTime := time.Date(2023, 12, 1, 12, 0, 0, 0, time.UTC)
	startsAtUnixMilli := baseTime.UnixMilli()

	tests := []struct {
		name        string
		startsAt    int64
		evalWindow  Duration
		evaluations []struct {
			current   time.Time
			wantStart time.Time
			wantEnd   time.Time
		}
	}{
		{
			name:       "window reset progression - 5 minute windows",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			evaluations: []struct {
				current   time.Time
				wantStart time.Time
				wantEnd   time.Time
			}{
				{
					current:   baseTime.Add(2 * time.Minute),
					wantStart: baseTime,
					wantEnd:   baseTime.Add(2 * time.Minute),
				},
				{
					current:   baseTime.Add(4 * time.Minute),
					wantStart: baseTime,
					wantEnd:   baseTime.Add(4 * time.Minute),
				},
				{
					current:   baseTime.Add(5 * time.Minute),
					wantStart: baseTime,                      // Previous window start
					wantEnd:   baseTime.Add(5 * time.Minute), // Previous window end
				},
				{
					current:   baseTime.Add(7 * time.Minute),
					wantStart: baseTime.Add(5 * time.Minute),
					wantEnd:   baseTime.Add(7 * time.Minute),
				},
				{
					current:   baseTime.Add(10 * time.Minute),
					wantStart: baseTime.Add(5 * time.Minute),  // Previous window start
					wantEnd:   baseTime.Add(10 * time.Minute), // Previous window end
				},
				{
					current:   baseTime.Add(12 * time.Minute),
					wantStart: baseTime.Add(10 * time.Minute),
					wantEnd:   baseTime.Add(12 * time.Minute),
				},
			},
		},
		{
			name:       "window reset with irregular intervals",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(10 * time.Minute),
			evaluations: []struct {
				current   time.Time
				wantStart time.Time
				wantEnd   time.Time
			}{
				{
					current:   baseTime.Add(1 * time.Minute),
					wantStart: baseTime,
					wantEnd:   baseTime.Add(1 * time.Minute),
				},
				{
					current:   baseTime.Add(15 * time.Minute),
					wantStart: baseTime.Add(10 * time.Minute),
					wantEnd:   baseTime.Add(15 * time.Minute),
				},
				{
					current:   baseTime.Add(35 * time.Minute),
					wantStart: baseTime.Add(30 * time.Minute),
					wantEnd:   baseTime.Add(35 * time.Minute),
				},
				{
					current:   baseTime.Add(40*time.Minute + 30*time.Second),
					wantStart: baseTime.Add(40 * time.Minute),
					wantEnd:   baseTime.Add(40*time.Minute + 30*time.Second),
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cw := &CumulativeWindow{
				StartsAt:   tt.startsAt,
				EvalWindow: tt.evalWindow,
			}

			for i, eval := range tt.evaluations {
				gotStart, gotEnd, err := cw.NextWindowFor(eval.current)

				if err != nil {
					t.Fatalf("Evaluation %d: CumulativeWindow.NextWindowFor() unexpected error = %v", i+1, err)
				}
				if !gotStart.Equal(eval.wantStart) {
					t.Errorf("Evaluation %d: start time = %v, want %v", i+1, gotStart, eval.wantStart)
				}
				if !gotEnd.Equal(eval.wantEnd) {
					t.Errorf("Evaluation %d: end time = %v, want %v", i+1, gotEnd, eval.wantEnd)
				}
			}
		})
	}
}
