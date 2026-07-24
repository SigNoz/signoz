package telemetryscopedtraces

import (
	"strings"
	"testing"

	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// The full-pipeline golden tests live in pkg/telemetryai, which exercises this
// builder through its production provider pair. The tests here cover only what
// needs the package internals.

// embedExpr treats every `?` byte as a placeholder; a count/args mismatch (an expr
// carrying a literal `?`, or a dropped arg) must fail loudly instead of silently
// shifting every subsequent arg into the wrong placeholder.
func TestEmbedExpr_PlaceholderArgMismatch(t *testing.T) {
	sb := sqlbuilder.NewSelectBuilder()

	out, err := embedExpr(sb, "x = ? AND y = ?", []any{1, 2})
	require.NoError(t, err)
	require.Equal(t, 2, strings.Count(out, "$"), "both placeholders bound as builder vars")

	_, err = embedExpr(sb, "x = ? AND y LIKE 'a?b'", []any{1})
	require.Error(t, err, "literal ? in the expr must not pass as a placeholder")

	_, err = embedExpr(sb, "x = ?", []any{1, 2})
	require.Error(t, err, "extra args must not be silently dropped")
}
