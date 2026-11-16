package logstelemetryschema

import (
	"context"
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/huandu/go-sqlbuilder"
)

// A log's pattern is its message with the values that change from log to
// log replaced by fixed placeholders. Logs whose pattern text is the same
// belong to one pattern. The filter function pattern('...') keeps the logs
// of the given patterns.

// PatternMaskVersion versions patternMasks. Changing a rule changes the
// pattern text, and so the pattern, a log maps to, so a saved filter on a
// pattern stops matching.
const PatternMaskVersion = 2

// patternMaxMessageChars caps the characters of a message the masks read, so
// one huge log cannot dominate the cost of a query. It counts characters, not
// bytes, so the cut never splits a multi-byte character into invalid UTF-8.
const patternMaxMessageChars = 2048

// PatternPlaceholders are the only placeholders patternMasks write. Any other
// text in angle brackets, like <nil>, is text from the log.
var PatternPlaceholders = []string{"<UUID>", "<MAC>", "<TS>", "<IP>", "<EMAIL>", "<URL>", "<HEX>", "<FRAME>", "<STR>", "<EMPTY>", "<*>"}

// patternEmpty is the pattern of a log whose message is empty once masked.
const patternEmpty = "<EMPTY>"

type patternMask struct {
	name        string
	regexp      string
	replacement string
}

// The building blocks of patternMasks.
const (
	hexDigit         = `[0-9a-fA-F]`
	macSeparatedPair = `[:-][0-9a-fA-F][0-9a-fA-F]`
	base64Char       = `[A-Za-z0-9+/]`
	// k8sNameChar is the alphabet Kubernetes draws the random parts of pod
	// names from: no vowels, so they never spell a word.
	k8sNameChar = `[bcdfghjklmnpqrstvwxz2456789]`

	// keyQuoteMarker stands in for the quotes of a key while values are
	// masked; blobStartMarker and blobEndMarker wrap a candidate base64 run.
	// A log message practically never holds these control characters.
	keyQuoteMarker  = "\x01"
	blobStartMarker = "\x02"
	blobEndMarker   = "\x03"
)

// patternMasks run in order, each on the output of the one before. Each
// replaces only a value recognisable on its own, from a known format, and
// only the matched text, so the same rules can run unchanged in the collector
// later. Words made only of letters are never guessed at.
//
// The regular expressions are plain RE2 with ASCII classes, the dialect
// ClickHouse and Go share. They go into the query as string literals, and
// clickhouse-go scans a query without regard to literals: it binds every '?'
// to an argument and reads any {...:...} or $N as a parameter. So they hold
// no '?', '{', '}' or '$': a repeat is written out, an optional part is (x|),
// and { } $ are written \x7b \x7d \x24. A replacement refers to a group as
// \1, or to the whole match as \0, the way ClickHouse does.
var patternMasks = []patternMask{
	// clean up: terminal colour codes, leading space, and a stack trace after
	// its first line (Java, JavaScript, Python, Go)
	{name: "ansi", regexp: `\x1b\[[0-9;]*[A-Za-z]`, replacement: ""},
	{name: "lead_ws", regexp: `^\s+`, replacement: ""},
	{name: "stack_cut", regexp: `\n([ \t]+at \S|Caused by: |[ \t]*\.\.\. \d+ (more|common frames omitted)|Traceback \(|[ \t]+File "|goroutine \d+ \[)[\s\S]*`, replacement: ""},
	// values with a known format; the URL goes first so the rules after it
	// never take part of one
	{name: "url", regexp: `\b[a-zA-Z][a-zA-Z0-9+.-]*://[^\s"'<>,\x7d\])]+`, replacement: "<URL>"},
	{name: "uuid", regexp: repeat(hexDigit, 8) + `-` + repeat(hexDigit, 4) + `-` + repeat(hexDigit, 4) + `-` + repeat(hexDigit, 4) + `-` + repeat(hexDigit, 12), replacement: "<UUID>"},
	{name: "mac", regexp: `(^|[^0-9A-Za-z:-])` + repeat(hexDigit, 2) + repeat(macSeparatedPair, 5) + `([^0-9A-Za-z:-]|\z)`, replacement: `\1<MAC>\2`},
	// timestamps: ISO 8601, weekday (RFC 2822, Java Date), syslog, US style
	{name: "ts_iso", regexp: `\d\d\d\d[-/]\d\d[-/]\d\d[T ]\d\d:\d\d:\d\d([.,]\d+|)(Z|[+-]\d\d:\d\d|[+-]\d\d\d\d|)`, replacement: "<TS>"},
	{name: "ts_weekday", regexp: `\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(,|) (\d\d |\d |)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d\d |\d | \d |)(\d\d\d\d |)\d\d:\d\d:\d\d( [A-Z][A-Z][A-Z]|)( \d\d\d\d|)\b`, replacement: "<TS>"},
	{name: "ts_syslog", regexp: `\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d|\d) \d\d:\d\d:\d\d\b`, replacement: "<TS>"},
	{name: "ts_slash", regexp: `\b\d(\d|)/\d(\d|)/\d\d\d\d(,|) \d(\d|):\d\d:\d\d( [AP]M|)`, replacement: "<TS>"},
	{name: "ip", regexp: `\b\d(\d|)(\d|)\.\d(\d|)(\d|)\.\d(\d|)(\d|)\.\d(\d|)(\d|)(:\d+|)\b`, replacement: "<IP>"},
	// an email address ends in a domain of letters, so module@1.2.3 is not one
	{name: "email", regexp: `[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z][A-Za-z]+\b`, replacement: "<EMAIL>"},
	{name: "hex", regexp: `\b0[xX][0-9a-fA-F]+\b`, replacement: "<HEX>"},
	// a stack frame logged on its own line
	{name: "frame", regexp: `^at ((async |)[^\s(]*[./][^\s(]*( |)\([^)]*\)|/\S+:\d+:\d+)`, replacement: "at <FRAME>"},
	// a base64 blob: a run of 20 base64 characters and more that holds both a
	// digit and a '+'. RE2 has no lookahead, so runs are marked first, the
	// marked runs that qualify are masked, and the other marks are removed.
	{name: "b64_mark", regexp: repeat(base64Char, 20) + base64Char + `*=*`, replacement: blobStartMarker + `\0` + blobEndMarker},
	{name: "b64_mask", regexp: blobStartMarker + `([^` + blobEndMarker + `]*[0-9][^` + blobEndMarker + `]*\+|[^` + blobEndMarker + `]*\+[^` + blobEndMarker + `]*[0-9])[^` + blobEndMarker + `]*` + blobEndMarker, replacement: "<*>"},
	{name: "b64_unmark", regexp: `[` + blobStartMarker + blobEndMarker + `]`, replacement: ""},
	// structured text: the text of an XML element, and a JSON number, true,
	// false or null after a key
	{name: "xml_text", regexp: `(<[A-Za-z][\w:.-]*(\s[^<>]*|)>)([^<>]*[^<>\s][^<>]*)(</[A-Za-z][\w:.-]*>)`, replacement: `\1<*>\4`},
	{name: "json_scalar", regexp: `("[^"]*"\s*:\s*)(-\d|\d|true\b|false\b|null\b)[0-9.eE+-]*`, replacement: `\1<*>`},
	// a quoted string followed by : or = is a key, so it stays: its quotes are
	// swapped for a marker while every other quoted string, a value, becomes
	// <STR>, and then put back
	{name: "key_protect", regexp: `"([^"]*)"(\s*[:=])`, replacement: keyQuoteMarker + `\1` + keyQuoteMarker + `\2`},
	{name: "str", regexp: `"[^"]*"`, replacement: "<STR>"},
	{name: "key_unmark", regexp: keyQuoteMarker, replacement: `"`},
	// the key of a key=value pair stays. The value may hold placeholders, but
	// a value that opens an object or array is left to the rules above.
	{name: "kv", regexp: `([\w.-]+)=(<[A-Z*]+>|[^\s,;&\x7b\[(<>])(<[A-Z*]+>|[^\s,;&()\]\x7d<>])*`, replacement: `\1=<*>`},
	// any run of letters and digits that holds a digit; the letters before it,
	// like vpc- or URF_, stay
	{name: "digit", regexp: `(^|[^A-Za-z0-9])[A-Za-z]*[0-9][A-Za-z0-9]*`, replacement: `\1<*>`},
	// the random suffix of a Kubernetes pod name, like -xrsrt
	{name: "pod_suffix", regexp: `-` + repeat(k8sNameChar, 5) + `([\s"'_.,)\]\x7d]|\z)`, replacement: `-<*>\1`},
	// placeholders the rules above left side by side are one value
	{name: "collapse", regexp: `(<\*>)(([._:/@#-]|)<\*>)+`, replacement: "<*>"},
	{name: "unquote", regexp: `"<\*>"|'<\*>'`, replacement: "<*>"},
	{name: "ws", regexp: `\s+`, replacement: " "},
}

// repeat writes out n copies of a regular expression atom.
func repeat(atom string, n int) string {
	return strings.Repeat(atom, n)
}

// PatternMessageExpr is the text a log's pattern is computed from: the
// message sub-column of the JSON body, which holds the whole body of a log
// whose body is plain text.
const PatternMessageExpr = messageSubColumn

// PatternExpr is the ClickHouse expression for a log's pattern text.
func PatternExpr() string {
	expr := fmt.Sprintf("leftUTF8(%s, %d)", PatternMessageExpr, patternMaxMessageChars)
	for _, mask := range patternMasks {
		expr = fmt.Sprintf("replaceRegexpAll(%s, %s, %s)", expr, quoteClickHouseString(mask.regexp), quoteClickHouseString(mask.replacement))
	}
	return fmt.Sprintf("ifNull(nullIf(trimBoth(%s), ''), %s)", expr, quoteClickHouseString(patternEmpty))
}

// PatternIDExpr is the ClickHouse expression for a pattern's ID, the hash of
// its text, as a decimal string so that a JSON number cannot round it.
func PatternIDExpr(patternExpr string) string {
	return fmt.Sprintf("toString(cityHash64(%s))", patternExpr)
}

// PatternLiteralWords returns up to limit of the longest words a pattern
// keeps as they appear in the log, lowercase and unique. Every log of the
// pattern holds each of them in its body, so a body search on them narrows
// the logs before the masks run, and can use the body index. A word is
// ASCII letters and digits only and at least four characters long, so a
// JSON escape in the stored body cannot hide it and the ngram index can use
// it.
func PatternLiteralWords(pattern string, limit int) []string {
	for _, placeholder := range PatternPlaceholders {
		pattern = strings.ReplaceAll(pattern, placeholder, " ")
	}
	isWordByte := func(c byte) bool {
		return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c >= 0x80
	}

	var words []string
	for start := 0; start < len(pattern); {
		if !isWordByte(pattern[start]) {
			start++
			continue
		}
		end := start
		ascii := true
		for end < len(pattern) && isWordByte(pattern[end]) {
			if pattern[end] >= 0x80 {
				ascii = false
			}
			end++
		}
		word := strings.ToLower(pattern[start:end])
		if ascii && len(word) >= 4 && !slices.Contains(words, word) {
			words = append(words, word)
		}
		start = end
	}

	slices.SortStableFunc(words, func(a, b string) int { return len(b) - len(a) })
	if len(words) > limit {
		words = words[:limit]
	}
	return words
}

// patternPrecheckWords is how many words of a pattern the filter also
// searches the body for.
const patternPrecheckWords = 3

// PatternCondition keeps the logs whose pattern is one of patterns. A
// placeholder given to the filter and the one in a log's pattern match when
// they are the same or either is <*>: pattern('User <*> logged in') keeps the
// logs of 'User <UUID> logged in', and pattern('User <UUID> logged in') keeps
// the logs of 'User <*> logged in'. Two different named placeholders never
// match, and <EMPTY> matches only itself. Each pattern also searches
// the message for its fixed words first, a cheap substring search, so the
// masks run only on the logs it keeps.
func (s *storage) PatternCondition(_ context.Context, _ qbtypes.QueryInfo, patterns []string, sb *sqlbuilder.SelectBuilder) (string, error) {
	if len(patterns) == 0 {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "function `pattern` expects at least one pattern, e.g. pattern('User <*> logged in')")
	}
	patternExpr := PatternExpr()

	alternatives := make([]string, 0, len(patterns))
	for _, pattern := range patterns {
		conditions := []string{}
		for _, word := range PatternLiteralWords(pattern, patternPrecheckWords) {
			// a word is letters and digits, so it holds no LIKE wildcard
			conditions = append(conditions, fmt.Sprintf("LOWER(%s) LIKE %s", PatternMessageExpr, sb.Var("%"+word+"%")))
		}
		if patternFilterPlaceholder.MatchString(pattern) {
			// the regular expression is an argument, so clickhouse-go never scans it
			conditions = append(conditions, fmt.Sprintf("match(%s, %s)", patternExpr, sb.Var(PatternFilterRegexp(pattern))))
		} else {
			conditions = append(conditions, sb.E(sqlbuilder.Escape(patternExpr), pattern))
		}
		if len(conditions) == 1 {
			alternatives = append(alternatives, conditions[0])
			continue
		}
		alternatives = append(alternatives, sb.And(conditions...))
	}
	if len(alternatives) == 1 {
		return alternatives[0], nil
	}
	return sb.Or(alternatives...), nil
}

// patternWildcard is the placeholder that, in the filter, matches any
// placeholder that stands for a value, and that any of them matches.
const patternWildcard = "<*>"

// patternValuePlaceholders are the placeholders that stand for a value, the
// ones patternWildcard matches. <EMPTY> stands for the whole message.
var patternValuePlaceholders = slices.DeleteFunc(slices.Clone(PatternPlaceholders), func(placeholder string) bool {
	return placeholder == patternEmpty || placeholder == patternWildcard
})

// patternFilterPlaceholder finds the placeholders of a pattern given to the
// filter that match more than their own text.
var patternFilterPlaceholder = regexp.MustCompile(patternPlaceholderAlternation(append(slices.Clone(patternValuePlaceholders), patternWildcard)))

// patternPlaceholderAlternation is the regular expression that matches any of
// placeholders.
func patternPlaceholderAlternation(placeholders []string) string {
	quoted := make([]string, len(placeholders))
	for i, placeholder := range placeholders {
		quoted[i] = regexp.QuoteMeta(placeholder)
	}
	return "(" + strings.Join(quoted, "|") + ")"
}

// PatternFilterRegexp is the anchored regular expression a pattern given to
// the filter matches pattern texts with: its text as it is, each <*> any
// placeholder that stands for a value, and each other such placeholder
// itself or <*>.
func PatternFilterRegexp(pattern string) string {
	anyValue := patternPlaceholderAlternation(append(slices.Clone(patternValuePlaceholders), patternWildcard))

	var builder strings.Builder
	builder.WriteString("^")
	last := 0
	for _, loc := range patternFilterPlaceholder.FindAllStringIndex(pattern, -1) {
		builder.WriteString(regexp.QuoteMeta(pattern[last:loc[0]]))
		placeholder := pattern[loc[0]:loc[1]]
		if placeholder == patternWildcard {
			builder.WriteString(anyValue)
		} else {
			builder.WriteString(patternPlaceholderAlternation([]string{placeholder, patternWildcard}))
		}
		last = loc[1]
	}
	builder.WriteString(regexp.QuoteMeta(pattern[last:]))
	builder.WriteString("$")
	return builder.String()
}

// quoteClickHouseString quotes s as a ClickHouse string literal, where the
// backslash escapes.
func quoteClickHouseString(s string) string {
	return "'" + strings.NewReplacer(`\`, `\\`, `'`, `\'`).Replace(s) + "'"
}
