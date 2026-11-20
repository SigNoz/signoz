package spantypes

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func recordSpan(spanID string, attributes map[string]string) StorableSpan {
	return StorableSpan{
		SpanID:           spanID,
		Name:             "POST /charge",
		ServiceName:      "payments",
		SpanKind:         "Server",
		StatusCodeString: "Error",
		StatusMessage:    "worldpay declined the card",
		AttributesString: attributes,
		AttributesNumber: map[string]float64{"http.response.status_code": 502},
		ResourcesString:  map[string]string{"service.name": "payments"},
		Events:           []string{`{"name":"exception","timeUnixNano":5,"attributeMap":{"exception.message":"card declined"},"isError":true}`},
		References:       `[{"traceId":"trace","spanId":"parent","refType":"CHILD_OF"},{"traceId":"other-trace","spanId":"producer","refType":"FOLLOWS_FROM"}]`,
	}
}

func TestNewSpanRecord(t *testing.T) {
	longStatement := strings.Repeat("SELECT 1; ", 120)

	t.Run("LongValue_IsCutAndListed", func(t *testing.T) {
		span := recordSpan("span-a", map[string]string{"db.statement": longStatement, "http.route": "/charge"})

		record := NewSpanRecord(&span, nil)

		assert.Equal(t, "Error", record.StatusCode)
		assert.Equal(t, "/charge", record.Attributes["http.route"])
		assert.InDelta(t, 502, record.Attributes["http.response.status_code"], 0)
		assert.Len(t, []rune(record.Attributes["db.statement"].(string)), spanRecordValueChars+1)
		assert.Equal(t, []TruncatedField{{Field: "attributes.db.statement", Length: uint64(len(longStatement))}}, record.Truncated)
		require.Len(t, record.Events, 1)
		assert.True(t, record.Events[0].IsError)
		assert.Equal(t, []Link{{TraceID: "other-trace", SpanID: "producer"}}, record.Links)
	})

	t.Run("SelectFields_ReturnsOnlyThoseInFull", func(t *testing.T) {
		span := recordSpan("span-b", map[string]string{"db.statement": longStatement, "http.route": "/charge"})

		record := NewSpanRecord(&span, []string{"db.statement", "not.present"})

		assert.Equal(t, map[string]any{"db.statement": longStatement}, record.Attributes)
		assert.Empty(t, record.Truncated)
		assert.Empty(t, record.Events)
	})

	t.Run("SelectFields_EventAttribute_KeepsThatEventWithOnlyThatAttribute", func(t *testing.T) {
		span := recordSpan("span-f", map[string]string{"http.route": "/charge"})

		record := NewSpanRecord(&span, []string{"exception.message"})

		assert.Empty(t, record.Attributes)
		require.Len(t, record.Events, 1)
		assert.Equal(t, "exception", record.Events[0].Name)
		assert.Equal(t, map[string]any{"exception.message": "card declined"}, record.Events[0].Attributes)
	})

	t.Run("SelectFields_OverBudget_ShortValueStaysWholeAndLongOnesShareTheRest", func(t *testing.T) {
		long := strings.Repeat("x", 100_000)
		span := recordSpan("span-g", map[string]string{"prompt": long, "completion": long, "http.route": "/charge"})

		record := NewSpanRecord(&span, []string{"prompt", "completion", "http.route", "not.present"})

		assert.Equal(t, "/charge", record.Attributes["http.route"])
		share := (spanRecordSelectChars - len("/charge")) / 2
		assert.Len(t, []rune(record.Attributes["prompt"].(string)), share+1)
		assert.Len(t, []rune(record.Attributes["completion"].(string)), share+1)
		assert.Equal(t, []TruncatedField{{Field: "attributes.completion", Length: 100_000}, {Field: "attributes.prompt", Length: 100_000}}, record.Truncated)
	})

	t.Run("MultiByteValue_IsCutOnACharacterBoundary", func(t *testing.T) {
		span := recordSpan("span-c", map[string]string{"note": strings.Repeat("é", 600)})

		record := NewSpanRecord(&span, nil)

		assert.Equal(t, strings.Repeat("é", spanRecordValueChars)+truncationMark, record.Attributes["note"])
		assert.Equal(t, uint64(600), record.Truncated[0].Length)
	})

	t.Run("RecordOverBudget_ShrinksValuesFurther", func(t *testing.T) {
		attributes := make(map[string]string, 80)
		for i := range 80 {
			attributes["key."+strings.Repeat("k", i+1)] = strings.Repeat("v", 480)
		}
		span := recordSpan("span-d", attributes)

		record := NewSpanRecord(&span, nil)

		assert.LessOrEqual(t, jsonChars(record), spanRecordChars)
		assert.Len(t, record.Truncated, 80)
		assert.Equal(t, uint64(480), record.Truncated[0].Length)
	})
}

func TestSmallTraceRecords(t *testing.T) {
	small := []StorableSpan{recordSpan("span-a", map[string]string{"k": "v"}), recordSpan("span-b", map[string]string{"k": "v"})}
	records, ok := SmallTraceRecords(small)
	require.True(t, ok)
	assert.Len(t, records, 2)

	large := make([]StorableSpan, 0, 60)
	for range 60 {
		large = append(large, recordSpan("span", map[string]string{"payload": strings.Repeat("x", 450)}))
	}
	_, ok = SmallTraceRecords(large)
	assert.False(t, ok)

	assert.True(t, IsSmallTrace(inspectTreeSpans))
	assert.False(t, IsSmallTrace(inspectTreeSpans+1))
}
