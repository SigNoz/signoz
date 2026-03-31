package otlphttpauditor

import (
	"net/http"
	"strconv"
	"time"
)

// retryableError wraps an error that can be retried, optionally with a server-suggested delay.
type retryableError struct {
	err   error
	delay time.Duration
}

func newRetryableError(err error, res *http.Response) *retryableError {
	return &retryableError{
		err:   err,
		delay: parseRetryAfter(res),
	}
}

func (e *retryableError) Error() string {
	return e.err.Error()
}

func (e *retryableError) Unwrap() error {
	return e.err
}

// Ref: https://github.com/open-telemetry/opentelemetry-collector/blob/01b07fcbb7a253bd996c290dcae6166e71d13732/exporter/otlphttpexporter/otlp.go#L260
func isRetryableStatusCode(code int) bool {
	switch code {
	case http.StatusTooManyRequests, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}

// Parses the Retry-After header value. Supports both delay-seconds and HTTP-date formats per RFC 7231 §7.1.3.
func parseRetryAfter(resp *http.Response) time.Duration {
	values := resp.Header.Values("Retry-After")
	if len(values) == 0 {
		return 0
	}

	if seconds, err := strconv.Atoi(values[0]); err == nil {
		return time.Duration(seconds) * time.Second
	}
	if date, err := time.Parse(time.RFC1123, values[0]); err == nil {
		return time.Until(date)
	}

	return 0
}
