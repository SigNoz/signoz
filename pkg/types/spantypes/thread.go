package spantypes

import (
	"encoding/base64"
	"encoding/json"
	"maps"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes/genai"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes/genaiformatter"
)

const (
	threadDefaultLimit = 20
	threadMaxLimit     = 100
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

type GetTraceThreadParams struct {
	Limit  int    `query:"limit" description:"Page size, at most 100. 0 means 20."`
	After  string `query:"after" description:"The nextCursor of a page; returns the spans after it. Set only one of after, before and spanId."`
	Before string `query:"before" description:"The prevCursor of a page; returns the spans before it. Set only one of after, before and spanId."`
	SpanID string `query:"spanId" description:"Returns the page around this span. Set only one of after, before and spanId."`
}

type ThreadQuery struct {
	Limit  int
	After  *ThreadCursor
	Before *ThreadCursor
	SpanID string
}

// ThreadCursor is the (TimeUnixNano, SpanID) key of a span.
type ThreadCursor struct {
	TimeUnixNano uint64 `json:"timeUnixNano"`
	SpanID       string `json:"spanId"`
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

// ThreadSpan carries the fields the span details pane reads; snake_case keys match WaterfallSpan.
type ThreadSpan struct {
	SpanID           string            `json:"span_id" required:"true"`
	TraceID          string            `json:"trace_id" required:"true"`
	ParentSpanID     string            `json:"parent_span_id" required:"true"`
	Name             string            `json:"name" required:"true"`
	KindString       string            `json:"kind_string" required:"true"`
	TimeUnix         uint64            `json:"time_unix" required:"true"`
	DurationNano     uint64            `json:"duration_nano" required:"true"`
	HasError         bool              `json:"has_error" required:"true"`
	StatusCodeString string            `json:"status_code_string" required:"true"`
	StatusMessage    string            `json:"status_message" required:"true"`
	Resource         map[string]string `json:"resource" required:"true" nullable:"false"`
	Attributes       map[string]any    `json:"attributes" required:"true" nullable:"false"`
	Events           []Event           `json:"events" required:"true" nullable:"false"`
	References       []OtelSpanRef     `json:"references" required:"true" nullable:"false"`
	// The formatted fields hold the span's messages in the OTel GenAI shape; Formatter names the
	// converter that produced them and FormatterWarnings what it could not resolve.
	FormattedInput    genai.InputMessages  `json:"formatted_input" required:"true" nullable:"false"`
	FormattedOutput   genai.OutputMessages `json:"formatted_output" required:"true" nullable:"false"`
	Formatter         string               `json:"formatter" required:"true"`
	FormatterWarnings []string             `json:"formatter_warnings" required:"true" nullable:"false"`

	timeUnixNano uint64
}

func NewThreadQuery(params *GetTraceThreadParams) (*ThreadQuery, error) {
	query := &ThreadQuery{Limit: params.Limit, SpanID: params.SpanID}
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
	for _, value := range []string{params.After, params.Before, params.SpanID} {
		if value != "" {
			anchors++
		}
	}
	if anchors > 1 {
		return nil, errors.NewInvalidInputf(ErrCodeThreadInvalidAnchor, "only one of after, before and spanId can be set")
	}

	encoded := params.After
	if encoded == "" {
		encoded = params.Before
	}
	if encoded == "" {
		return query, nil
	}
	data, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeThreadInvalidCursor, "invalid cursor")
	}
	cursor := new(ThreadCursor)
	if err := json.Unmarshal(data, cursor); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeThreadInvalidCursor, "invalid cursor")
	}
	if cursor.SpanID == "" {
		return nil, errors.NewInvalidInputf(ErrCodeThreadInvalidCursor, "invalid cursor: missing span id")
	}
	if params.After != "" {
		query.After = cursor
	} else {
		query.Before = cursor
	}
	return query, nil
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
	resources := make(map[string]string, len(storable.ResourcesString))
	maps.Copy(resources, storable.ResourcesString)
	timeUnixNano := uint64(storable.StartTime.UnixNano())
	attributes := threadAttributes(storable)
	formatted := genaiformatter.Format(rawAttribute(storable, aiobservabilitytypes.GenAIInputMessages), rawAttribute(storable, aiobservabilitytypes.GenAIOutputMessages))
	return &ThreadSpan{
		SpanID:            storable.SpanID,
		TraceID:           traceID,
		ParentSpanID:      storable.ParentSpanID,
		Name:              storable.Name,
		KindString:        storable.SpanKind,
		TimeUnix:          timeUnixNano / 1_000_000, // client expects millis, as in the waterfall
		DurationNano:      storable.DurationNano,
		HasError:          storable.HasError,
		StatusCodeString:  storable.StatusCodeString,
		StatusMessage:     storable.StatusMessage,
		Resource:          resources,
		Attributes:        attributes,
		Events:            storable.UnmarshalledEvents(),
		References:        storable.UnmarshalledRefs(),
		FormattedInput:    formatted.Input,
		FormattedOutput:   formatted.Output,
		Formatter:         formatted.Formatter,
		FormatterWarnings: formatted.Warnings,
		timeUnixNano:      timeUnixNano,
	}
}

// threadAttributes flattens the JSON column into dotted keys, as the querier does for list
// responses, and falls back to the legacy maps for spans written before the JSON rollout.
func threadAttributes(storable *StorableSpan) map[string]any {
	if len(storable.AttributesJSON) == 0 {
		return storable.Attributes()
	}
	attributes := make(map[string]any, len(storable.AttributesJSON))
	storable.AttributesJSON.FlattenInto("", attributes)
	return attributes
}

// rawAttribute reads one attribute for decoding from the JSON document, where an object value is
// still whole. The legacy maps hold objects split into one key per field, so spans from before
// the JSON rollout are not decoded. Not handled: a list of JSON strings, which formats as generic,
// and a scalar at a prefix of the path, such as gen_ai.input beside gen_ai.input.messages, which
// ends the walk early.
func rawAttribute(storable *StorableSpan, key string) any {
	var current any = map[string]any(storable.AttributesJSON)
	for segment := range strings.SplitSeq(key, ".") {
		object, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = object[segment]
	}
	return current
}
