package errors

import (
	"time"
)

type retry struct {
	delay time.Duration
}

// newRetryAfter builds a retry value carrying the given delay.
func newRetryAfter(d time.Duration) retry {
	return retry{
		delay: d,
	}
}
