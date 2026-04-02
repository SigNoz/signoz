package querybuilder

import (
	"os"
)

const (
	TrueConditionLiteral  = "true"
	SkipConditionLiteral  = "__skip__"
	ErrorConditionLiteral = "__skip_because_of_error__"

	// BodySearchDefaultWarning is emitted when a full-text search or "body" searches are hit
	// with New JSON Body enhancements.
	BodySearchDefaultWarning = "body searches default to `body.message:string`. Use `body.<key>` to search a different field inside body"
)

var (
	SkippableConditionLiterals = []string{SkipConditionLiteral, ErrorConditionLiteral}
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
