// This file carries the upstream promqltest .test-format knowledge this
// generator depends on. The patterns are verbatim copies of unexported
// definitions in prometheus@v0.311.3 promql/promqltest/test.go (upstream
// exposes no public API for parsing the format short of running assertions
// through a testing.TB); the loader is adapted from loadCmd.set/append in
// the same file. REFRESH THIS FILE against test.go on every prometheus
// version bump.
package main

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/prometheus/common/model"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/teststorage"
)

// Copied verbatim from promql/promqltest/test.go (prometheus@v0.311.3).
var (
	patLoad        = regexp.MustCompile(`^load(?:_(with_nhcb))?\s+(.+?)$`)
	patEvalInstant = regexp.MustCompile(`^eval(?:_(fail|warn|ordered|info))?\s+instant\s+(?:at\s+(.+?))?\s+(.+)$`)
	patEvalRange   = regexp.MustCompile(`^eval(?:_(fail|warn|info))?\s+range\s+from\s+(.+)\s+to\s+(.+)\s+step\s+(.+?)\s+(.+)$`)
	patExpect      = regexp.MustCompile(`^expect\s+(ordered|fail|warn|no_warn|info|no_info)(?:\s+(regex|msg):(.+))?$`)
)

// testStartTime is upstream's epoch for all load offsets (test.go).
var testStartTime = time.Unix(0, 0).UTC()

// command is one column-0 block of a .test script with its attached
// continuation lines.
type command struct {
	kind string // "load" | "eval" | "clear" | "skip"
	head string
	body []string
	line int
}

// parseScript tokenizes a .test script into column-0 commands with their
// indented lines, classifying heads with upstream's own patterns (line
// walking follows (*test).parse in test.go: blank lines and #-comments
// reset, indentation attaches). eval_fail / eval_warn / eval_info /
// eval_ordered assert errors, warnings or ordering — none of which cross
// the API comparably — so their modifier forms are skipped.
func parseScript(script string) []command {
	var cmds []command
	var cur *command
	for i, line := range strings.Split(script, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			cur = nil
			continue
		}
		isTop := line[0] != ' ' && line[0] != '\t'
		if !isTop {
			if cur != nil {
				cur.body = append(cur.body, trimmed)
			}
			continue
		}
		switch {
		case trimmed == "clear":
			cmds = append(cmds, command{kind: "clear", line: i + 1})
			cur = nil
		case patLoad.MatchString(trimmed):
			// load_with_nhcb stays kind "load": checkLoad rejects the
			// variant, which poisons the whole segment — evals over a
			// partially-loaded dataset must not enter the corpus.
			cmds = append(cmds, command{kind: "load", head: trimmed, line: i + 1})
			cur = &cmds[len(cmds)-1]
		case patEvalInstant.MatchString(trimmed):
			if m := patEvalInstant.FindStringSubmatch(trimmed); m[1] != "" {
				cmds = append(cmds, command{kind: "skip", head: "eval_" + m[1], line: i + 1})
				cur = nil
				break
			}
			cmds = append(cmds, command{kind: "eval", head: trimmed, line: i + 1})
			cur = &cmds[len(cmds)-1]
		case patEvalRange.MatchString(trimmed):
			if m := patEvalRange.FindStringSubmatch(trimmed); m[1] != "" {
				cmds = append(cmds, command{kind: "skip", head: "eval_" + m[1], line: i + 1})
				cur = nil
				break
			}
			cmds = append(cmds, command{kind: "eval", head: trimmed, line: i + 1})
			cur = &cmds[len(cmds)-1]
		default:
			cmds = append(cmds, command{kind: "skip", head: strings.Fields(trimmed)[0], line: i + 1})
			cur = nil
		}
	}
	return cmds
}

// loadSeriesStorage builds a TSDB with the load blocks' samples, adapted
// from loadCmd.set/append (test.go): each series' samples sit at
// testStartTime + i*gap, omitted values leave gaps, and — like loadCmd.set's
// hash-keyed defs map — a series redefined within one load block replaces
// its earlier definition entirely (upstream testdata relies on this:
// aggregators.test defines data{test="inf3",point="d"} twice). Only float
// samples are supported; checkLoad guarantees no histogram series reach
// here.
func loadSeriesStorage(seriesParser seriesDescParser, loads []command) (*teststorage.TestStorage, error) {
	type def struct {
		metric  labels.Labels
		samples []promql.Sample
	}
	defs := map[uint64]def{}
	var order []uint64
	for _, l := range loads {
		fields := strings.Fields(l.head)
		gapDur, err := model.ParseDuration(fields[1])
		if err != nil {
			return nil, fmt.Errorf("load interval %q: %w", fields[1], err)
		}
		gap := time.Duration(gapDur)
		for _, line := range l.body {
			metric, vals, err := seriesParser.ParseSeriesDesc(line)
			if err != nil {
				return nil, fmt.Errorf("series %q: %w", line, err)
			}
			samples := make([]promql.Sample, 0, len(vals))
			ts := testStartTime
			for _, v := range vals {
				if !v.Omitted {
					samples = append(samples, promql.Sample{T: ts.UnixMilli(), F: v.Value})
				}
				ts = ts.Add(gap)
			}
			h := metric.Hash()
			if _, seen := defs[h]; !seen {
				order = append(order, h)
			}
			defs[h] = def{metric: metric, samples: samples}
		}
	}

	stor, err := teststorage.NewWithError()
	if err != nil {
		return nil, err
	}
	app := stor.Appender(context.Background())
	for _, h := range order {
		d := defs[h]
		for _, s := range d.samples {
			if _, err := app.Append(0, d.metric, s.T, s.F); err != nil {
				return nil, err
			}
		}
	}
	if err := app.Commit(); err != nil {
		return nil, err
	}
	return stor, nil
}

// defaultEpsilon is upstream's relative tolerance for sample values
// (promql/promqltest/test.go).
const defaultEpsilon = 0.000001
