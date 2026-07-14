package querybuilder

const (
	TrueConditionLiteral  = "true"
	SkipConditionLiteral  = "__skip__"
	ErrorConditionLiteral = "__skip_because_of_error__"

	// BodyFullTextSearchDefaultWarning is emitted when a full-text search or "body" searches are hit
	// with New JSON Body enhancements.
	BodyFullTextSearchDefaultWarning = "Full text searches default to `body.message:string`. Use `body.<key>` to search a different field inside body"
)

var (
	SkippableConditionLiterals = []string{SkipConditionLiteral, ErrorConditionLiteral}
)
