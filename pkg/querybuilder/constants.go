package querybuilder

const (
	TrueConditionLiteral  = "true"
	SkipConditionLiteral  = "__skip__"
	ErrorConditionLiteral = "__skip_because_of_error__"

	// BodyFullTextSearchDefaultWarning is emitted when a full-text search or "body" searches are hit
	// with New JSON Body enhancements.
	BodyFullTextSearchDefaultWarning = "Full text searches default to `body.message:string`. Use `body.<key>` to search a different field inside body"

	// FTSInternalKey is the sentinel Name on TelemetryFieldKey instances that represent
	// wildcard map searches (all attribute/resource keys+values). The unconventional value
	// prevents collision with any real field name a user could type.
	FTSInternalKey = "_X_INTERNAL_FTS_KEY"

	// SearchFunctionName is the grammar function name for full-text search.
	SearchFunctionName = "search"

	// FTSMaxWindowNs is the maximum allowed time range for a search() query (6 hours).
	FTSMaxWindowNs = uint64(6 * 60 * 60 * 1_000_000_000)
)

var (
	SkippableConditionLiterals = []string{SkipConditionLiteral, ErrorConditionLiteral}
)
