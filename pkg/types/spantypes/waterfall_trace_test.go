package spantypes

import (
	"encoding/json"
	"strconv"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewGettableWaterfallTracePreservesNanosecondTimestamps(t *testing.T) {
	const start uint64 = 1757500000000123456
	parent := &WaterfallSpan{
		SpanID:       "parent",
		TimeUnix:     start,
		DurationNano: 3_000_000,
	}
	child := &WaterfallSpan{
		SpanID:       "child",
		ParentSpanID: parent.SpanID,
		TimeUnix:     start + 720_000,
		DurationNano: 50_000,
	}
	trace := NewWaterfallTraceFromSpans([]*WaterfallSpan{parent, child})
	selectedSpans := trace.GetAllSpans()
	response := NewGettableWaterfallTrace(trace, selectedSpans, nil, true)

	encoded, err := json.Marshal(response)
	require.NoError(t, err)
	var payload struct {
		StartTimestampUnixNano json.RawMessage `json:"startTimestampUnixNano"`
		EndTimestampUnixNano   json.RawMessage `json:"endTimestampUnixNano"`
		Spans                  []struct {
			TimeUnix     json.RawMessage `json:"time_unix"`
			TimeUnixNano json.RawMessage `json:"time_unix_nano"`
		} `json:"spans"`
	}
	require.NoError(t, json.Unmarshal(encoded, &payload))
	require.Len(t, payload.Spans, 2)
	for index, timestamp := range []uint64{start, start + 720_000} {
		assert.Equal(t, strconv.Quote(strconv.FormatUint(timestamp, 10)), string(payload.Spans[index].TimeUnixNano))
		assert.Equal(t, strconv.FormatUint(start/1_000_000, 10), string(payload.Spans[index].TimeUnix))
	}
	assert.Equal(t, strconv.Quote(strconv.FormatUint(start, 10)), string(payload.StartTimestampUnixNano))
	assert.Equal(t, strconv.Quote(strconv.FormatUint(start+parent.DurationNano, 10)), string(payload.EndTimestampUnixNano))
	assert.Equal(t, start/1_000_000, response.StartTimestampMillis)
	assert.Equal(t, (start+parent.DurationNano)/1_000_000, response.EndTimestampMillis)
	assert.Equal(t, start, trace.StartTime)
	assert.Equal(t, start+parent.DurationNano, trace.EndTime)
	assert.Equal(t, start, parent.TimeUnix)
	assert.Equal(t, start+720_000, child.TimeUnix)
	assert.Equal(t, start, selectedSpans[0].TimeUnix)
	assert.Equal(t, start+720_000, selectedSpans[1].TimeUnix)
	secondResponse := NewGettableWaterfallTrace(trace, selectedSpans, nil, true)
	secondEncoded, err := json.Marshal(secondResponse)
	require.NoError(t, err)
	assert.JSONEq(t, string(encoded), string(secondEncoded))
}

func TestWaterfallSpanOmitsUnsetNanosecondTimestamp(t *testing.T) {
	encoded, err := json.Marshal(&WaterfallSpan{})
	require.NoError(t, err)
	var payload map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(encoded, &payload))
	assert.NotContains(t, payload, "time_unix_nano")
}
