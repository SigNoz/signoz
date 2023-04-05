package app

import (
	"fmt"
	"net/http"
	"time"
)

var (
	// AutoCompleteCacheControlAge is the max-age for the cache-control header
	// for the autocomplete endpoint.
	// The default export interval for the SDK is 60 seconds, and ~10s at collector, so
	// one minute should be a safe value.
	AutoCompleteCacheControlAge = 60 * time.Second
)

func withCacheControl(maxAge time.Duration, h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", int(maxAge.Seconds())))
		h(w, r)
	}
}
