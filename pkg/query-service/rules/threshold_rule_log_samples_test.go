package rules

import (
	"strings"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

func TestFormatLogSamples(t *testing.T) {
	ts := time.Date(2026, time.June, 1, 12, 0, 3, 0, time.UTC)

	t.Run("nil and empty yield empty string", func(t *testing.T) {
		assert.Equal(t, "", formatLogSamples(nil))
		assert.Equal(t, "", formatLogSamples([]*qbtypes.RawRow{}))
	})

	t.Run("skips nil rows and rows without a usable body", func(t *testing.T) {
		rows := []*qbtypes.RawRow{
			nil,
			{Timestamp: ts, Data: map[string]any{"body": ""}},
			{Timestamp: ts, Data: map[string]any{"body": "   "}},
			{Timestamp: ts, Data: map[string]any{"severity_text": "ERROR"}}, // no body key
			{Timestamp: ts, Data: map[string]any{"body": 42}},               // body not a string
		}
		assert.Equal(t, "", formatLogSamples(rows))
	})

	t.Run("renders timestamp, severity and body inside a code block", func(t *testing.T) {
		rows := []*qbtypes.RawRow{
			{Timestamp: ts, Data: map[string]any{"severity_text": "ERROR", "body": "payment failed"}},
		}
		want := "```\n[2026-06-01T12:00:03Z] ERROR payment failed\n```"
		assert.Equal(t, want, formatLogSamples(rows))
	})

	t.Run("omits severity when absent and collapses a multi-line body", func(t *testing.T) {
		rows := []*qbtypes.RawRow{
			{Timestamp: ts, Data: map[string]any{"body": "line1\nline2\r\nline3"}},
		}
		want := "```\n[2026-06-01T12:00:03Z] line1 line2 line3\n```"
		assert.Equal(t, want, formatLogSamples(rows))
	})

	t.Run("omits the timestamp prefix when zero", func(t *testing.T) {
		rows := []*qbtypes.RawRow{
			{Data: map[string]any{"body": "no ts"}},
		}
		assert.Equal(t, "```\nno ts\n```", formatLogSamples(rows))
	})

	t.Run("renders one line per record and preserves input order", func(t *testing.T) {
		rows := []*qbtypes.RawRow{
			{Timestamp: ts, Data: map[string]any{"body": "first"}},
			{Timestamp: ts.Add(-time.Second), Data: map[string]any{"body": "second"}},
		}
		want := "```\n[2026-06-01T12:00:03Z] first\n[2026-06-01T12:00:02Z] second\n```"
		assert.Equal(t, want, formatLogSamples(rows))
	})

	t.Run("truncates a long body to logSampleBodyMaxLen runes plus ellipsis", func(t *testing.T) {
		long := strings.Repeat("a", logSampleBodyMaxLen+50)
		rows := []*qbtypes.RawRow{
			{Timestamp: ts, Data: map[string]any{"body": long}},
		}
		out := formatLogSamples(rows)
		assert.Contains(t, out, strings.Repeat("a", logSampleBodyMaxLen)+"…")
		assert.NotContains(t, out, strings.Repeat("a", logSampleBodyMaxLen+1))
	})
}
