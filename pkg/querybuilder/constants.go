package querybuilder

const (
	TrueConditionLiteral  = "true"
	SkipConditionLiteral  = "__skip__"
	ErrorConditionLiteral = "__skip_because_of_error__"

	// BodyFullTextSearchDefaultWarning is emitted when a full-text search or "body" searches are hit
	// with New JSON Body enhancements.
	BodyFullTextSearchDefaultWarning = "Full text searches default to `body.message:string`. Use `body.<key>` to search a different field inside body"

	// SearchWarning is emitted on every search() call. search() scans all fields,
	// so it is slow and expensive; a specific field is cheaper.
	SearchWarning = "search() runs across all fields and can be slow and expensive. Prefer a specific field, e.g. `<context>.<field_key>:<type>`"
)

var (
	SkippableConditionLiterals = []string{SkipConditionLiteral, ErrorConditionLiteral}
)
