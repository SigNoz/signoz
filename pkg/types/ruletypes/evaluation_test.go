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
	}{
		{
			name:       "current time before starts at",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(5 * time.Minute),
			current:    baseTime.Add(-1 * time.Hour),
			wantStart:  baseTime.Add(-1 * time.Hour), // Returns current time when before startsAt
			wantEnd:    baseTime.Add(-1 * time.Hour),
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
			wantStart:  baseTime.Add(10 * time.Minute), // Returns current time for invalid windows
			wantEnd:    baseTime.Add(10 * time.Minute),
		},
		{
			name:       "negative eval window",
			startsAt:   startsAtUnixMilli,
			evalWindow: Duration(-5 * time.Minute),
			current:    baseTime.Add(10 * time.Minute),
			wantStart:  baseTime.Add(10 * time.Minute), // Returns current time for invalid windows
			wantEnd:    baseTime.Add(10 * time.Minute),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cw := &CumulativeWindow{
				StartsAt:   tt.startsAt,
				EvalWindow: tt.evalWindow,
			}

			gotStart, gotEnd := cw.NextWindowFor(tt.current)
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
	start, end := cw.NextWindowFor(current)
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

			gotStart, gotEnd := cw.NextWindowFor(tt.current)
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
				gotStart, gotEnd := cw.NextWindowFor(eval.current)
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
			jsonInput: `{"kind":"cumulative","spec":{"startsAt":1701432000000,"evalWindow":"1h","frequency":"2m","timezone":"UTC"}}`,
			wantKind:  CumulativeEvaluation,
			wantSpec: CumulativeWindow{
				StartsAt:   1701432000000,
				EvalWindow: Duration(1 * time.Hour),
				Frequency:  Duration(2 * time.Minute),
				Timezone:   "UTC",
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
			name:      "cumulative evaluation with validation error - zero evalWindow",
			jsonInput: `{"kind":"cumulative","spec":{"startsAt":1701432000000,"evalWindow":"0s","frequency":"1m"}}`,
			wantError: true,
		},
		{
			name:      "cumulative evaluation with validation error - zero frequency",
			jsonInput: `{"kind":"cumulative","spec":{"startsAt":1701432000000,"evalWindow":"1h","frequency":"0s","timezone":"UTC"}}`,
			wantError: true,
		},
		{
			name:      "cumulative evaluation with validation error - invalid evalWindow",
			jsonInput: `{"kind":"cumulative","spec":{"startsAt":1701432000000,"evalWindow":"10m","frequency":"1m","timezone":"UTC"}}`,
			wantError: true,
		},
		{
			name:      "cumulative evaluation with validation error - future startsAt",
			jsonInput: `{"kind":"cumulative","spec":{"startsAt":9999999999999,"evalWindow":"1h","frequency":"1m","timezone":"UTC"}}`,
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
				if gotSpec.StartsAt != wantSpec.StartsAt {
					t.Errorf("CumulativeWindow.StartsAt = %v, want %v", gotSpec.StartsAt, wantSpec.StartsAt)
				}
				if gotSpec.EvalWindow != wantSpec.EvalWindow {
					t.Errorf("CumulativeWindow.EvalWindow = %v, want %v", gotSpec.EvalWindow, wantSpec.EvalWindow)
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
