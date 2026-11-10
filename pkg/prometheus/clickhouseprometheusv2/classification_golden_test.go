package clickhouseprometheusv2

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/prometheus/prometheus/promql/parser"
	"github.com/stretchr/testify/require"
)

var updateGolden = flag.Bool("update", false, "rewrite the classification golden file")

const goldenFile = "testdata/classification_golden.json"

// corpusFile is the conformance corpus that the integration suite replays.
// The golden freezes the route of every expression in it.
const corpusFile = "../../../tests/integration/testdata/promqltestcorpus/corpus.json"

// TestClassificationGolden freezes the route of every conformance-corpus
// expression: "full", "hybrid(<units>)", or "fallback: <reason>". The route
// is a correctness surface of its own. A change that silently sends a shape
// to the engine loses the pushdown. A change that silently transpiles an
// unproven shape risks wrong numbers. Both must show as a diff of this file.
// The corpus suite's clickhousev2 leg then judges the numbers.
//
// The golden keys on the expression alone. The corpus evaluates each
// expression on several grids, and the test requires the route to be the
// same on all of them. If a classifier change ever makes the route depend
// on the grid, this test fails and the key must grow.
//
// Regenerate after an intended classifier change:
//
//	go test ./pkg/prometheus/clickhouseprometheusv2 -run TestClassificationGolden -update
func TestClassificationGolden(t *testing.T) {
	raw, err := os.ReadFile(corpusFile)
	require.NoError(t, err)

	var corpus struct {
		Cases []struct {
			Expr    string `json:"expr"`
			StartMs int64  `json:"start_ms"`
			EndMs   int64  `json:"end_ms"`
			StepMs  int64  `json:"step_ms"`
		} `json:"cases"`
	}
	require.NoError(t, json.Unmarshal(raw, &corpus))
	require.NotEmpty(t, corpus.Cases)

	promParser := parser.NewParser(parser.Options{})
	routes := map[string]string{}
	for _, c := range corpus.Cases {
		expr, err := promParser.ParseExpr(c.Expr)
		require.NoError(t, err, "corpus expression must parse: %q", c.Expr)

		var route string
		plan, ok := classify(expr, gridContext{startMs: c.StartMs, endMs: c.EndMs, stepMs: c.StepMs})
		switch {
		case ok && plan.full:
			route = "full"
		case ok:
			route = fmt.Sprintf("hybrid(%d)", len(plan.units))
		default:
			route = "fallback: " + fallbackShape(expr)
		}

		if prev, seen := routes[c.Expr]; seen {
			require.Equal(t, prev, route,
				"route differs between grids for %q — the golden key must grow to include the grid", c.Expr)
			continue
		}
		routes[c.Expr] = route
	}

	// json.MarshalIndent sorts map keys: the file is deterministic.
	got, err := json.MarshalIndent(routes, "", "  ")
	require.NoError(t, err)
	got = append(got, '\n')

	if *updateGolden {
		require.NoError(t, os.MkdirAll(filepath.Dir(goldenFile), 0o755))
		require.NoError(t, os.WriteFile(goldenFile, got, 0o644))
		return
	}

	want, err := os.ReadFile(goldenFile)
	require.NoError(t, err, "golden missing — generate it with -update")
	require.Equal(t, string(want), string(got),
		"classification route changed; if intended, regenerate with -update and explain the diff in review")
}

// fallbackShape buckets a non-transpilable query by why it stays on the engine
// path, to separate "already served well" (instant selectors on the last-sample-per-step
// path) from genuine compiler gaps.
func fallbackShape(expr parser.Expr) string {
	var hasMatrix, hasSubquery, hasAt, hasDurationExpr, overTime bool
	rangeFns := map[string]bool{"rate": true, "increase": true, "delta": true, "irate": true, "idelta": true}
	var unsupportedFns []string
	parser.Inspect(expr, func(node parser.Node, _ []parser.Node) error {
		switch n := node.(type) {
		case *parser.MatrixSelector:
			hasMatrix = true
			if n.RangeExpr != nil {
				hasDurationExpr = true
			}
		case *parser.SubqueryExpr:
			hasSubquery = true
			if n.RangeExpr != nil || n.StepExpr != nil || n.OriginalOffsetExpr != nil {
				hasDurationExpr = true
			}
		case *parser.VectorSelector:
			if n.Timestamp != nil || n.StartOrEnd != 0 {
				hasAt = true
			}
			if n.OriginalOffsetExpr != nil {
				hasDurationExpr = true
			}
		case *parser.Call:
			if strings.HasSuffix(n.Func.Name, "_over_time") {
				overTime = true
			} else if !rangeFns[n.Func.Name] {
				unsupportedFns = append(unsupportedFns, n.Func.Name)
			}
		}
		return nil
	})

	switch {
	case hasDurationExpr:
		return "duration expression (resolved only at evaluation time)"
	case hasSubquery:
		return "subquery"
	case hasAt:
		return "@ modifier"
	case overTime:
		return "*_over_time range function"
	case !hasMatrix:
		return "instant-selector shape (last-sample-per-step engine path)"
	case len(unsupportedFns) > 0:
		return fmt.Sprintf("range shape with unsupported function(s): %s", strings.Join(dedupe(unsupportedFns), ",")) //nolint:makezero
	default:
		return "other range shape"
	}
}

func dedupe(in []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range in {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	sort.Strings(out)
	return out
}
