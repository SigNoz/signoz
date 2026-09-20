package spantypes

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseSQLStoredEventsAndLinks(t *testing.T) {
	raw := `[{"name":"tool.start","timestamp_unix_nano":"1789000000123456789","attributes":{"tool.name":"shell","ok":true}},{"name":"invalid","timestamp_unix_nano":"not-a-time"}]`
	events := ParseEvents(raw)
	require.Len(t, events, 1)
	require.Equal(t, uint64(1789000000123456789), events[0].TimeUnixNano)
	require.Equal(t, "shell", events[0].Attributes["tool.name"])
	require.Equal(t, true, events[0].Attributes["ok"])
	require.Equal(t, []Link{{TraceID: "abc", SpanID: "def"}}, ParseLinks(`[{"trace_id":"abc","span_id":"def","attributes":{}}]`))
	require.Equal(t, []Link{{TraceID: "abc", SpanID: "def"}}, ParseLinks(`[{"traceId":"abc","spanId":"def"}]`))
}
