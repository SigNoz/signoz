package constants

import (
	"os"
)

const (
	DefaultSiteURL  = "https://localhost:3301"
	LicenseSignozIo = "http://localhost:9682/api/v1"
)

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

// GetDefaultSamlHost overrides SAML host to change default
// listening host attached to saml request. this host is
// used by IdP to send SAML response. This is usually
// site url in presence of proxy (e.g ngnix) but can be
// altered for dev purposes
func GetDefaultSamlHost() string {
	return GetOrDefaultEnv("SIGNOZ_SAML_HOST", GetDefaultSiteURL())
}
