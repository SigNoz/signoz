package errors

import (
	"time"
)

type RetryPolicy string

const (
	RetryNever     RetryPolicy = "never"      // retry with the same inputs cannot succeed.
	RetryImmediate RetryPolicy = "immediate"  // retry without waiting.
	RetryBackoff   RetryPolicy = "backoff"    // caller picks its own backoff schedule.
	RetryAfter     RetryPolicy = "after"      // honor Retry.After exactly (the producer knows the wait).
	RetryAfterFix  RetryPolicy = "after_fix"  // retry pointless until the caller fixes the request.
	RetryAfterAuth RetryPolicy = "after_auth" // retry pointless until the caller re-authenticates.
)

// retry pairs a RetryPolicy with the canonical gRPC RetryInfo detail.
// info is non-nil only when policy == RetryAfter.
type retry struct {
	policy RetryPolicy
	delay  time.Duration
}

// newRetryAfter builds a retry value carrying a gRPC RetryInfo with the given delay.
func newRetryAfter(d time.Duration) retry {
	return retry{
		policy: RetryAfter,
		delay:  d,
	}
}
