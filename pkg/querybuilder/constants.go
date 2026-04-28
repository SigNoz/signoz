package querybuilder

const (
	TrueConditionLiteral  = "true"
	SkipConditionLiteral  = "__skip__"
	ErrorConditionLiteral = "__skip_because_of_error__"
)

var (
	SkippableConditionLiterals = []string{SkipConditionLiteral, ErrorConditionLiteral}
)
