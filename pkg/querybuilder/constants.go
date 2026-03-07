package querybuilder

import (
	"os"
)

const (
	TrueConditionLiteral = "true"
)

var (
	BodyJSONQueryEnabled = GetOrDefaultEnv("BODY_JSON_QUERY_ENABLED", "false") == "true"
)

func GetOrDefaultEnv(key string, fallback string) string {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	return v
}
