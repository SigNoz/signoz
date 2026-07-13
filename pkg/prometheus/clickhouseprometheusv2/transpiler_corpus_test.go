package clickhouseprometheusv2

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"
	"testing"

	"github.com/prometheus/prometheus/promql/parser"
	"github.com/stretchr/testify/require"
)

// TestClassifyCorpus measures real-workload compiler coverage: it classifies
// every query of a JSON-lines corpus (one JSON-encoded PromQL string per
// line) with the live classifier and reports full / hybrid / fallback
// shares. Skipped unless PROMQL_CORPUS points to one or more files
// (comma-separated). Dashboard template variables are substituted with
// placeholder values before parsing, mirroring the production render step.
//
//	PROMQL_CORPUS=corpus-a.jsonl,corpus-b.jsonl go test -run TestClassifyCorpus -v
func TestClassifyCorpus(t *testing.T) {
	corpus := os.Getenv("PROMQL_CORPUS")
	if corpus == "" {
		t.Skip("PROMQL_CORPUS not set")
	}

	varRe := regexp.MustCompile(`\{\{\s*\.?[\w.]+\s*\}\}|\[\[\s*[\w.]+\s*\]\]|\$[\w.]+`)
	promParser := parser.NewParser(parser.Options{})

	for _, path := range strings.Split(corpus, ",") {
		f, err := os.Open(path)
		require.NoError(t, err)

		var full, hybrid, fallbackInstant, fallbackOther, parseErrs int
		fallbackReasons := map[string]int{}

		scanner := bufio.NewScanner(f)
		scanner.Buffer(make([]byte, 1024*1024), 1024*1024)
		for scanner.Scan() {
			var query string
			require.NoError(t, json.Unmarshal(scanner.Bytes(), &query))
			query = varRe.ReplaceAllString(query, "placeholder")

			expr, err := promParser.ParseExpr(query)
			if err != nil {
				parseErrs++
				continue
			}

			plan, ok := classify(expr, gridContext{startMs: 1_700_000_000_000, endMs: 1_700_007_200_000, stepMs: 60_000})
			switch {
			case ok && plan.full:
				full++
			case ok:
				hybrid++
			default:
				reason := fallbackShape(expr)
				fallbackReasons[reason]++
				if reason == "instant-selector shape (last-sample-per-step engine path)" {
					fallbackInstant++
				} else {
					fallbackOther++
				}
			}
		}
		require.NoError(t, scanner.Err())
		_ = f.Close()

		total := full + hybrid + fallbackInstant + fallbackOther
		if total == 0 {
			t.Logf("%s: no parseable queries (%d parse errors)", path, parseErrs)
			continue
		}
		t.Logf("%s: %d queries — full=%d (%.0f%%) hybrid=%d (%.0f%%) fallback=%d (%.0f%%; instant-shape=%d) parse_errors=%d",
			path, total,
			full, 100*float64(full)/float64(total),
			hybrid, 100*float64(hybrid)/float64(total),
			fallbackInstant+fallbackOther, 100*float64(fallbackInstant+fallbackOther)/float64(total),
			fallbackInstant, parseErrs)

		reasons := make([]string, 0, len(fallbackReasons))
		for r := range fallbackReasons {
			reasons = append(reasons, r)
		}
		sort.Slice(reasons, func(i, j int) bool { return fallbackReasons[reasons[i]] > fallbackReasons[reasons[j]] })
		for _, r := range reasons {
			t.Logf("  fallback %4d  %s", fallbackReasons[r], r)
		}
	}
}

// fallbackShape buckets a non-transpilable query by why it stays on the engine
// path, to separate "already served well" (instant selectors on the last-sample-per-step
// path) from genuine compiler gaps.
func fallbackShape(expr parser.Expr) string {
	var hasMatrix, hasSubquery, hasAt, overTime bool
	rangeFns := map[string]bool{"rate": true, "increase": true, "delta": true, "irate": true, "idelta": true}
	var unsupportedFns []string
	parser.Inspect(expr, func(node parser.Node, _ []parser.Node) error {
		switch n := node.(type) {
		case *parser.MatrixSelector:
			hasMatrix = true
		case *parser.SubqueryExpr:
			hasSubquery = true
		case *parser.VectorSelector:
			if n.Timestamp != nil || n.StartOrEnd != 0 {
				hasAt = true
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
