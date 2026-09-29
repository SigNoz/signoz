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

var (
	ErrCodeThreadInvalidLimit  = errors.MustNewCode("trace_thread_invalid_limit")
	ErrCodeThreadInvalidCursor = errors.MustNewCode("trace_thread_invalid_cursor")
)

type QueryableThread struct {
	// Limit is the page size; 0 means 100.
	Limit int `query:"limit"`
	// Cursor is the nextCursor of the previous page; empty for the first page.
	Cursor string `query:"cursor"`
}

type ThreadQuery struct {
	Limit  int
	Cursor *ThreadCursor
}

func NewThreadQuery(queryable *QueryableThread) (*ThreadQuery, error) {
	query := &ThreadQuery{Limit: queryable.Limit}
	if query.Limit < 0 {
		return nil, errors.NewInvalidInputf(ErrCodeThreadInvalidLimit, "limit cannot be negative, got %d", query.Limit)
	}
	if query.Limit == 0 {
		query.Limit = threadDefaultLimit
	}
	if query.Limit > threadMaxLimit {
		return nil, errors.NewInvalidInputf(ErrCodeThreadInvalidLimit, "limit cannot exceed %d, got %d", threadMaxLimit, query.Limit)
	}
	if queryable.Cursor != "" {
		cursor, err := DecodeThreadCursor(queryable.Cursor)
		if err != nil {
			return nil, err
		}
		query.Cursor = cursor
	}
	return query, nil
}

// ThreadCursor is the (TimeUnixNano, SpanID) of the last span of a page.
type ThreadCursor struct {
	TimeUnixNano uint64 `json:"t"`
	SpanID       string `json:"s"`
}

func (c ThreadCursor) Encode() string {
	data, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(data)
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

type GettableTraceThread struct {
	Spans      []*ThreadSpan `json:"spans" required:"true" nullable:"false"`
	NextCursor string        `json:"nextCursor,omitempty"`
}

// ThreadSpan sets the formatted fields only when the span has the matching gen_ai messages attribute.
type ThreadSpan struct {
	WaterfallSpan
	FormattedInput  []aiobservabilitytypes.Message `json:"formatted_input,omitempty"`
	FormattedOutput []aiobservabilitytypes.Message `json:"formatted_output,omitempty"`
}

// NewGettableTraceThread expects limit+1 spans; the extra one only signals a next page.
func NewGettableTraceThread(traceID string, spans []StorableSpan, limit int) *GettableTraceThread {
	hasMore := len(spans) > limit
	if hasMore {
		spans = spans[:limit]
	}

	out := make([]*ThreadSpan, len(spans))
	for i := range spans {
		out[i] = newThreadSpan(traceID, &spans[i])
	}

	thread := &GettableTraceThread{Spans: out}
	if hasMore {
		last := spans[len(spans)-1]
		thread.NextCursor = ThreadCursor{TimeUnixNano: uint64(last.StartTime.UnixNano()), SpanID: last.SpanID}.Encode()
	}
	return thread
}

func newThreadSpan(traceID string, storable *StorableSpan) *ThreadSpan {
	span := &ThreadSpan{WaterfallSpan: *storable.ToWaterfallSpan(traceID)}
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
