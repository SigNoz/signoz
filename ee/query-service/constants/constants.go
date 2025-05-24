package constants

import (
	"os"
)

var LicenseSignozIo = "https://license.signoz.io/api/v1"
var LicenseAPIKey = GetOrDefaultEnv("SIGNOZ_LICENSE_API_KEY", "")
var SaasSegmentKey = GetOrDefaultEnv("SIGNOZ_SAAS_SEGMENT_KEY", "")
var FetchFeatures = GetOrDefaultEnv("FETCH_FEATURES", "false")
var ZeusFeaturesURL = GetOrDefaultEnv("ZEUS_FEATURES_URL", "ZeusFeaturesURL")

// this is set via build time variable
var ZeusURL = "https://api.signoz.cloud"

func GetOrDefaultEnv(key string, fallback string) string {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	return v
}
