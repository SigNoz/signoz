package middleware

import (
	"errors"
	"net/http"
)

// MaxBytes returns a middleware that wraps r.Body with http.MaxBytesReader,
// rejecting requests whose Content-Length or streamed body exceeds the
// given limit. The standard library returns a typed *http.MaxBytesError
// from Read calls beyond the limit; we surface it as a 413.
//
// Without this, a single client can send an arbitrarily large JSON body
// to /api/* endpoints and force the server to allocate memory until the
// JSON decoder finishes (DoS). 1 MiB is a generous default for dashboard
// query payloads.
func MaxBytes(max int64) WrapperFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, max)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// IsMaxBytes reports whether err originates from http.MaxBytesReader —
// callers can use this in their handler to render a 413 instead of a
// generic 500 when the limit trips mid-decode.
func IsMaxBytes(err error) bool {
	if err == nil {
		return false
	}
	var maxErr *http.MaxBytesError
	return errors.As(err, &maxErr)
}
