package constants

import (
	"fmt"
	"os"
)

const (
	DefaultSAMLHost = "http://localhost:8080"
	DefaultSiteURL  = "https://localhost:3301"
)

func GetOrDefaultEnv(key string, fallback string) string {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	return v
}

// constant functions that override env vars
func GetSiteURL() string {
	return GetOrDefaultEnv("SIGNOZ_SITE_URL", DefaultSiteURL)
}

func GetSAMLHost() string {
	return GetOrDefaultEnv("SIGNOZ_SAML_HOST", DefaultSAMLHost)
}

func GetSAMLRedirectURL() string {
	return fmt.Sprintf("%s%s", GetSiteURL(), "/login")
}
