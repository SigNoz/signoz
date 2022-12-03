package constants

import (
	"os"
)

const (
	DefaultSiteURL = "https://localhost:3301"
)

var LicenseSignozIo = "https://license.signoz.io/api/v1"

var SpanLimitStr = GetOrDefaultEnv("SPAN_LIMIT", "5000")

func GetOrDefaultEnv(key string, fallback string) string {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	return v
}

// constant functions that override env vars

// GetDefaultSiteURL returns default site url, primarily
// used to send saml request and allowing backend to
// handle http redirect
func GetDefaultSiteURL() string {
	return GetOrDefaultEnv("SIGNOZ_SITE_URL", DefaultSiteURL)
}
