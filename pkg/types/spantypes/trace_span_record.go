package spantypes

import (
	"fmt"
	"slices"
	"strings"
	"unicode/utf8"
)

const (
	spanRecordValueChars   = 500
	spanRecordChars        = 20_000
	spanRecordShrunkChars  = 100
	spanRecordMinimumChars = 20
	truncationMark         = "…"
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
func NewSpanRecord(item *StorableSpan) SpanRecord {
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

	record.cut(spanRecordValueChars)
	for _, limit := range []int{spanRecordShrunkChars, spanRecordMinimumChars} {
		if jsonChars(record) <= spanRecordChars {
			break
		}
		record.cut(limit)
	}
	slices.SortFunc(record.Truncated, func(a, b TruncatedField) int { return strings.Compare(a.Field, b.Field) })
	return record
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

// SmallTraceRecords returns the full record of every span when the trace is small enough for all
// of them to fit in the response; ok is false otherwise.
func SmallTraceRecords(spans []StorableSpan) ([]SpanRecord, bool) {
	records := make([]SpanRecord, 0, len(spans))
	chars := 0
	for i := range spans {
		record := NewSpanRecord(&spans[i])
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
