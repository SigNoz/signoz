package constants

import (
	"os"
)

const (
	DefaultSiteURL = "https://localhost:3301"
)

var LicenseSignozIo = "https://license.signoz.io/api/v1"
var LicenseAPIKey = GetOrDefaultEnv("SIGNOZ_LICENSE_API_KEY", "")
var SaasSegmentKey = GetOrDefaultEnv("SIGNOZ_SAAS_SEGMENT_KEY", "")
var SpanRenderLimitStr = GetOrDefaultEnv("SPAN_RENDER_LIMIT", "2500")
var MaxSpansInTraceStr = GetOrDefaultEnv("MAX_SPANS_IN_TRACE", "250000")
var FetchFeatures = GetOrDefaultEnv("FETCH_FEATURES", "false")
var ZeusFeaturesURL = GetOrDefaultEnv("ZEUS_FEATURES_URL", "ZeusFeaturesURL")

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
