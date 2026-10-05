package spantypes

import (
	"encoding/base64"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes/genaimessages"
)

const (
	threadDefaultLimit = 100
	threadMaxLimit     = 1000
)

const (
	ThreadAfter  ThreadFrom = iota // > cursor, ascending
	ThreadAt                       // >= cursor, ascending
	ThreadBefore                   // < cursor, descending
)

var (
	ErrCodeThreadInvalidLimit  = errors.MustNewCode("trace_thread_invalid_limit")
	ErrCodeThreadInvalidCursor = errors.MustNewCode("trace_thread_invalid_cursor")
	ErrCodeThreadInvalidAnchor = errors.MustNewCode("trace_thread_invalid_anchor")
	ErrCodeThreadSpanNotFound  = errors.MustNewCode("trace_thread_span_not_found")
)

type QueryableThread struct {
	// Limit is the page size; 0 means 100.
	Limit int `query:"limit"`
	// After is the nextCursor of a page; returns the spans after it.
	After string `query:"after"`
	// Before is the prevCursor of a page; returns the spans before it.
	Before string `query:"before"`
	// SpanID returns the page around this span. After, Before and SpanID are exclusive.
	SpanID string `query:"spanId"`
}

type ThreadQuery struct {
	Limit  int
	After  *ThreadCursor
	Before *ThreadCursor
	SpanID string
}

// ThreadCursor is the (TimeUnixNano, SpanID) key of a span.
type ThreadCursor struct {
	TimeUnixNano uint64 `json:"t"`
	SpanID       string `json:"s"`
}

type ThreadFrom int

type ThreadPage struct {
	Cursor *ThreadCursor
	From   ThreadFrom
	Limit  int
}

type GettableTraceThread struct {
	Spans      []*ThreadSpan `json:"spans" required:"true" nullable:"false"`
	PrevCursor string        `json:"prevCursor,omitempty"`
	NextCursor string        `json:"nextCursor,omitempty"`
}

// ThreadSpan sets the formatted fields only when the span has the matching gen_ai messages attribute.
type ThreadSpan struct {
	WaterfallSpan
	FormattedInput  []aiobservabilitytypes.Message `json:"formatted_input,omitempty"`
	FormattedOutput []aiobservabilitytypes.Message `json:"formatted_output,omitempty"`
	timeUnixNano    uint64
}

func NewThreadQuery(queryable *QueryableThread) (*ThreadQuery, error) {
	query := &ThreadQuery{Limit: queryable.Limit, SpanID: queryable.SpanID}
	if query.Limit < 0 {
		return nil, errors.NewInvalidInputf(ErrCodeThreadInvalidLimit, "limit cannot be negative, got %d", query.Limit)
	}
	if query.Limit == 0 {
		query.Limit = threadDefaultLimit
	}
	if query.Limit > threadMaxLimit {
		return nil, errors.NewInvalidInputf(ErrCodeThreadInvalidLimit, "limit cannot exceed %d, got %d", threadMaxLimit, query.Limit)
	}

	anchors := 0
	for _, value := range []string{queryable.After, queryable.Before, queryable.SpanID} {
		if value != "" {
			anchors++
		}
	}
	if anchors > 1 {
		return nil, errors.NewInvalidInputf(ErrCodeThreadInvalidAnchor, "only one of after, before and spanId can be set")
	}

	var err error
	if queryable.After != "" {
		if query.After, err = DecodeThreadCursor(queryable.After); err != nil {
			return nil, err
		}
	}
	if queryable.Before != "" {
		if query.Before, err = DecodeThreadCursor(queryable.Before); err != nil {
			return nil, err
		}
	}
	return query, nil
}

func DecodeThreadCursor(cursor string) (*ThreadCursor, error) {
	data, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeThreadInvalidCursor, "invalid cursor")
	}
	c := new(ThreadCursor)
	if err := json.Unmarshal(data, c); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeThreadInvalidCursor, "invalid cursor")
	}
	if c.SpanID == "" {
		return nil, errors.NewInvalidInputf(ErrCodeThreadInvalidCursor, "invalid cursor: missing span id")
	}
	return c, nil
}

func (c ThreadCursor) Encode() string {
	data, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(data)
}

// NewGettableTraceThread takes up to limit+1 spans on each side of the anchor: before in
// descending order, after in ascending order. Half the page goes to before, the rest to after,
// and a short side gives its room to the other. An extra span on a side sets that side's cursor.
func NewGettableTraceThread(traceID string, query *ThreadQuery, before, after []StorableSpan) *GettableTraceThread {
	nAfter := min(len(after), query.Limit-min(len(before), query.Limit/2))
	nBefore := min(len(before), query.Limit-nAfter)
	hasPrev := len(before) > nBefore || query.After != nil
	hasNext := len(after) > nAfter || query.Before != nil

	spans := make([]*ThreadSpan, 0, nBefore+nAfter)
	for i := nBefore - 1; i >= 0; i-- {
		spans = append(spans, newThreadSpan(traceID, &before[i]))
	}
	for i := range nAfter {
		spans = append(spans, newThreadSpan(traceID, &after[i]))
	}

	thread := &GettableTraceThread{Spans: spans}
	if len(spans) == 0 {
		return thread
	}
	if hasPrev {
		thread.PrevCursor = spans[0].cursor().Encode()
	}
	if hasNext {
		thread.NextCursor = spans[len(spans)-1].cursor().Encode()
	}
	return thread
}

func (s *ThreadSpan) cursor() ThreadCursor {
	return ThreadCursor{TimeUnixNano: s.timeUnixNano, SpanID: s.SpanID}
}

func newThreadSpan(traceID string, storable *StorableSpan) *ThreadSpan {
	span := &ThreadSpan{WaterfallSpan: *storable.ToWaterfallSpan(traceID), timeUnixNano: uint64(storable.StartTime.UnixNano())}
	// client expects millis, as in the waterfall
	span.TimeUnix = span.TimeUnix / 1_000_000
	if v, ok := span.Attributes[aiobservabilitytypes.GenAIInputMessages]; ok {
		span.FormattedInput = genaimessages.Normalize(v)
	}
	if v, ok := span.Attributes[aiobservabilitytypes.GenAIOutputMessages]; ok {
		span.FormattedOutput = genaimessages.Normalize(v)
	}
	return span
}
