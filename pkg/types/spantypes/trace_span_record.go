package spantypes

import (
	"fmt"
	"math"
	"slices"
	"sort"
	"strings"
	"unicode/utf8"
)

const (
	spanRecordValueChars   = 500
	spanRecordChars        = 20_000
	spanRecordShrunkChars  = 100
	spanRecordMinimumChars = 20
	spanRecordSelectChars  = 40_000
	// spanRecordSelectMaxChars leaves room in the response for the span's summary and ancestors.
	spanRecordSelectMaxChars = 44_000
	spanMatchSnippetRadius   = 40
	spanMatchLimit           = 3
	truncationMark           = "…"
)

// TruncatedField names a value of a span record that was cut, with its full length in characters.
type TruncatedField struct {
	Field  string `json:"field" required:"true"`
	Length uint64 `json:"length" required:"true"`
}

// SpanRecord is everything stored on a span. Long values are cut and listed in Truncated.
type SpanRecord struct {
	SpanID        string            `json:"spanId" required:"true"`
	StatusCode    string            `json:"statusCode" required:"true"`
	StatusMessage string            `json:"statusMessage" required:"true"`
	Attributes    map[string]any    `json:"attributes" required:"true" nullable:"false"`
	Resource      map[string]string `json:"resource" required:"true" nullable:"false"`
	Events        []EventV2         `json:"events" required:"true" nullable:"false"`
	// Links holds the spans this span links to, in this or another trace.
	Links     []Link           `json:"links" required:"true" nullable:"false"`
	Truncated []TruncatedField `json:"truncated" required:"true" nullable:"false"`
}

// NewSpanRecord cuts values over 500 characters, and shorter still while the record is over its size limit.
// With selectFields the record holds only those attributes, in full as far as the response allows.
func NewSpanRecord(item *StorableSpan, selectFields []string) SpanRecord {
	record := SpanRecord{
		SpanID:        item.SpanID,
		StatusCode:    item.StatusCodeString,
		StatusMessage: item.StatusMessage,
		Attributes:    item.Attributes(),
		Resource:      make(map[string]string, len(item.ResourcesString)),
		Events:        make([]EventV2, 0, len(item.Events)),
		Links:         make([]Link, 0),
		Truncated:     []TruncatedField{},
	}
	for key, value := range item.ResourcesString {
		record.Resource[key] = value
	}
	for _, event := range item.UnmarshalledEvents() {
		record.Events = append(record.Events, EventV2{Name: event.Name, TimeUnixNano: event.TimeUnixNano, Attributes: event.AttributeMap, IsError: event.IsError})
	}
	for _, ref := range item.UnmarshalledRefs() {
		if ref.RefType != "CHILD_OF" {
			record.Links = append(record.Links, Link{TraceID: ref.TraceId, SpanID: ref.SpanId})
		}
	}

	if len(selectFields) > 0 {
		record.selectOnly(selectFields)
	} else {
		record.cut(spanRecordValueChars)
		for _, limit := range []int{spanRecordShrunkChars, spanRecordMinimumChars} {
			if jsonChars(record) <= spanRecordChars {
				break
			}
			record.cut(limit)
		}
	}
	slices.SortFunc(record.Truncated, func(a, b TruncatedField) int { return strings.Compare(a.Field, b.Field) })
	return record
}

// SmallTraceRecords returns the full record of every span when the trace is small enough for all
// of them to fit in the response; ok is false otherwise.
func SmallTraceRecords(spans []StorableSpan) ([]SpanRecord, bool) {
	records := make([]SpanRecord, 0, len(spans))
	chars := 0
	for i := range spans {
		record := NewSpanRecord(&spans[i], nil)
		chars += jsonChars(record)
		if chars > inspectSmallTraceChars {
			return nil, false
		}
		records = append(records, record)
	}
	return records, true
}

// IsSmallTrace reports whether a trace has few enough spans to try returning their records.
func IsSmallTrace(spanCount int) bool {
	return spanCount <= inspectTreeSpans
}

// selectOnly keeps the named attributes of the span and of its events, and the events that have
// one. The status message and the resource follow the usual 500 character cut.
func (r *SpanRecord) selectOnly(fields []string) {
	attributes, events := r.Attributes, r.Events
	r.Attributes, r.Events = map[string]any{}, []EventV2{}
	r.cut(spanRecordValueChars)

	lengths := make([]int, 0)
	keep := func(source map[string]any) map[string]any {
		kept := make(map[string]any)
		for _, field := range fields {
			value, ok := source[field]
			if !ok {
				continue
			}
			kept[field] = value
			if str, isString := value.(string); isString {
				lengths = append(lengths, utf8.RuneCountInString(str))
			}
		}
		return kept
	}
	r.Attributes = keep(attributes)
	for _, event := range events {
		if kept := keep(event.Attributes); len(kept) > 0 {
			event.Attributes = kept
			r.Events = append(r.Events, event)
		}
	}

	limit := min(selectLimit(lengths, spanRecordSelectChars), spanRecordSelectChars)
	r.cut(limit)
	// The budget counts characters; escaped and multi-byte text takes more room than that in the response.
	for limit > spanRecordValueChars && jsonChars(r) > spanRecordSelectMaxChars {
		limit /= 2
		r.cut(limit)
	}
}

// selectLimit returns the length each selected value may keep for all of them to fit the budget:
// short values keep their length and the long ones share what is left.
func selectLimit(lengths []int, budget int) int {
	slices.Sort(lengths)
	for i, length := range lengths {
		share := budget / (len(lengths) - i)
		if length > share {
			return share
		}
		budget -= length
	}
	return math.MaxInt
}

// cut shortens every string value longer than limit and records its full length once.
func (r *SpanRecord) cut(limit int) {
	noted := make(map[string]struct{}, len(r.Truncated))
	for _, field := range r.Truncated {
		noted[field.Field] = struct{}{}
	}
	note := func(field string, length int) {
		if _, ok := noted[field]; !ok {
			noted[field] = struct{}{}
			r.Truncated = append(r.Truncated, TruncatedField{Field: field, Length: uint64(length)})
		}
	}

	if cutValue, length, ok := cutString(r.StatusMessage, limit); ok {
		r.StatusMessage = cutValue
		note("statusMessage", length)
	}
	for key, value := range r.Attributes {
		if str, isString := value.(string); isString {
			if cutValue, length, ok := cutString(str, limit); ok {
				r.Attributes[key] = cutValue
				note("attributes."+key, length)
			}
		}
	}
	for key, value := range r.Resource {
		if cutValue, length, ok := cutString(value, limit); ok {
			r.Resource[key] = cutValue
			note("resource."+key, length)
		}
	}
	for idx := range r.Events {
		for key, value := range r.Events[idx].Attributes {
			if str, isString := value.(string); isString {
				if cutValue, length, ok := cutString(str, limit); ok {
					r.Events[idx].Attributes[key] = cutValue
					note(fmt.Sprintf("events[%d].attributes.%s", idx, key), length)
				}
			}
		}
	}
}

// cutString returns value shortened to limit characters, and its length when it was longer or already cut.
func cutString(value string, limit int) (string, int, bool) {
	if len(value) <= limit {
		return value, 0, false
	}
	length := utf8.RuneCountInString(value)
	if length <= limit {
		return value, 0, false
	}
	cut := 0
	for idx := range value {
		if cut == limit {
			return value[:idx] + truncationMark, length, true
		}
		cut++
	}
	return value, 0, false
}

// findWords returns up to three places in the span where one of the words occurs, ignoring case.
func findWords(item *StorableSpan, words []string) []SpanTextMatch {
	found := make([]SpanTextMatch, 0)
	if len(words) == 0 {
		return found
	}
	check := func(field, value string) bool {
		for _, word := range words {
			if snippet, ok := snippetAround(value, word); ok {
				found = append(found, SpanTextMatch{Field: field, Snippet: snippet})
				break
			}
		}
		return len(found) == spanMatchLimit
	}

	if check("name", item.Name) || check("statusMessage", item.StatusMessage) {
		return found
	}
	attributes := item.Attributes()
	keys := make([]string, 0, len(attributes))
	for key := range attributes {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		if check("attributes."+key, fmt.Sprintf("%v", attributes[key])) {
			return found
		}
	}
	for idx, event := range item.Events {
		if check(fmt.Sprintf("events[%d]", idx), event) {
			return found
		}
	}
	return found
}

// snippetAround returns the text around the first place word occurs in value, ignoring case.
func snippetAround(value, word string) (string, bool) {
	// Lowering can change the byte length of some characters; positions then no longer map back.
	lowered := strings.ToLower(value)
	if len(lowered) != len(value) {
		lowered = value
	}
	pos := strings.Index(lowered, strings.ToLower(word))
	if pos < 0 {
		return "", false
	}
	start := max(pos-spanMatchSnippetRadius, 0)
	end := min(pos+len(word)+spanMatchSnippetRadius, len(value))
	for start > 0 && !utf8.RuneStart(value[start]) {
		start--
	}
	for end < len(value) && !utf8.RuneStart(value[end]) {
		end++
	}
	snippet := value[start:end]
	if start > 0 {
		snippet = truncationMark + snippet
	}
	if end < len(value) {
		snippet += truncationMark
	}
	return snippet, true
}
