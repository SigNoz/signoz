package condensedmetertypes

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestFirstHour(t *testing.T) {
	testCases := []struct {
		name          string
		firstIngested time.Time
		expected      time.Time
	}{
		{name: "MidHour_NextHour", firstIngested: time.Date(2026, 11, 12, 9, 39, 38, 0, time.UTC), expected: time.Date(2026, 11, 12, 10, 0, 0, 0, time.UTC)},
		{name: "OnTheHour_NextHour", firstIngested: time.Date(2026, 11, 12, 10, 0, 0, 0, time.UTC), expected: time.Date(2026, 11, 12, 11, 0, 0, 0, time.UTC)},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, FirstHour(testCase.firstIngested))
		})
	}
}

func TestClosedHours(t *testing.T) {
	next := time.Date(2026, 11, 12, 10, 0, 0, 0, time.UTC)

	testCases := []struct {
		name     string
		now      time.Time
		expected []time.Time
	}{
		// 10:00 + 2h = 12:00 is after 11:59
		{name: "NotClosed_None", now: time.Date(2026, 11, 12, 11, 59, 0, 0, time.UTC), expected: []time.Time{}},
		// 10:00 + 2h = 12:00
		{name: "ClosedAtDelay_One", now: time.Date(2026, 11, 12, 12, 0, 0, 0, time.UTC), expected: []time.Time{next}},
		// 12:00 + 2h = 14:00 is before 14:30, 13:00 + 2h = 15:00 is not
		{name: "Backlog_OldestFirst", now: time.Date(2026, 11, 12, 14, 30, 0, 0, time.UTC), expected: []time.Time{next, next.Add(time.Hour), next.Add(2 * time.Hour)}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, ClosedHours(next, testCase.now))
		})
	}
}
