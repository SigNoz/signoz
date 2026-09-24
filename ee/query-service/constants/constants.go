package constants

import (
	"os"
)

var SaasSegmentKey = GetOrDefaultEnv("SIGNOZ_SAAS_SEGMENT_KEY", "")
var FetchFeatures = GetOrDefaultEnv("FETCH_FEATURES", "false")
var ZeusFeaturesURL = GetOrDefaultEnv("ZEUS_FEATURES_URL", "ZeusFeaturesURL")

func GetOrDefaultEnv(key string, fallback string) string {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	return v
}
