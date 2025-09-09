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

			gotStart, gotEnd, err := rw.EvaluationTime(tt.current)

			if err != nil {
				t.Fatalf("RollingWindow.EvaluationTime() unexpected error = %v", err)
			}
			if !gotStart.Equal(tt.wantStart) {
				t.Errorf("RollingWindow.EvaluationTime() start time = %v, want %v", gotStart, tt.wantStart)
			}
			if !gotEnd.Equal(tt.wantEnd) {
				t.Errorf("RollingWindow.EvaluationTime() end time = %v, want %v", gotEnd, tt.wantEnd)
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
			wantStart:  baseTime.Add(5 * time.Minute),
			wantEnd:    baseTime.Add(5 * time.Minute),
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

			gotStart, gotEnd, err := cw.EvaluationTime(tt.current)

			if tt.wantError {
				if err == nil {
					t.Errorf("CumulativeWindow.EvaluationTime() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("CumulativeWindow.EvaluationTime() unexpected error = %v", err)
			}
			if !gotStart.Equal(tt.wantStart) {
				t.Errorf("CumulativeWindow.EvaluationTime() start time = %v, want %v", gotStart, tt.wantStart)
			}
			if !gotEnd.Equal(tt.wantEnd) {
				t.Errorf("CumulativeWindow.EvaluationTime() end time = %v, want %v", gotEnd, tt.wantEnd)
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
	start, end, err := cw.EvaluationTime(current)

	if err != nil {
		t.Fatalf("CumulativeWindow.EvaluationTime() unexpected error = %v", err)
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
