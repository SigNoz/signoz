package errors

import (
	"time"
)

type retry struct {
	delay time.Duration
}

// newRetryAfter builds a retry value carrying a gRPC RetryInfo with the given delay.
func newRetryAfter(d time.Duration) retry {
	return retry{
		delay: d,
	}
}
