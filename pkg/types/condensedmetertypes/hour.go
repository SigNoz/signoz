package condensedmetertypes

import "time"

// CondensingDelay is how long after an hour starts its condensed rows are final.
// Condensing of a minute finishes about 10 minutes after it, so the last minute of an hour is final within 2h of its start.
const CondensingDelay = 2 * time.Hour

// FirstHour is the hour after the first ingested meter row. Before it, datapoint.count meant ingested, so adding condensed rows would count them twice.
func FirstHour(firstIngested time.Time) time.Time {
	return firstIngested.UTC().Truncate(time.Hour).Add(time.Hour)
}

// ClosedHours returns the hours from next whose condensed rows are final at now, oldest first.
func ClosedHours(next time.Time, now time.Time) []time.Time {
	hours := []time.Time{}
	for hour := next; !hour.Add(CondensingDelay).After(now); hour = hour.Add(time.Hour) {
		hours = append(hours, hour)
	}

	return hours
}
