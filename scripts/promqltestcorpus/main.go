// Command promqltestcorpus extracts an absolute-truth conformance corpus from
// the upstream Prometheus promqltest testdata scripts.
//
// The integration suites compare our PromQL serving paths against each other
// (parity) or against nothing (smoke); both are blind to a bug that moves the
// oracle — anything that changes what the engine is fed. This corpus is the
// third leg: the samples come from upstream's own load notation (parsed by
// upstream's parser), the expected outputs are computed by the vendored
// reference engine over those samples, and both are frozen to JSON. The
// Python suite tests/integration/tests/promqlconformance replays ingestion
// and asserts API responses against the frozen expectations — an oracle that
// does not move when the querier or the transpiler changes.
//
// Regenerate (after bumping the vendored Prometheus) with:
//
//	cd scripts/promqltestcorpus && go run . \
//	  -out ../../tests/integration/testdata/promqltestcorpus/corpus.json
//
// upstream.go holds verbatim copies of upstream's private .test-format
// parsing; refresh it against promql/promqltest/test.go on every version
// bump. Drift fails loudly: the generator parses the NEW module's testdata,
// so unknown syntax surfaces here, and regeneration is already a mandatory
// step of any bump.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/prometheus/prometheus/promql/promqltest"
)

func main() {
	out := flag.String("out", os.Getenv("PROMQLTEST_CORPUS_OUT"), "path to write corpus.json")
	flag.Parse()
	if *out == "" {
		log.Fatal("set -out (or PROMQLTEST_CORPUS_OUT) to the corpus destination")
	}
	if err := run(*out); err != nil {
		log.Fatal(err)
	}
}

func run(out string) error {
	promDir, promVersion, err := prometheusModule()
	if err != nil {
		return err
	}
	testdataDir := filepath.Join(promDir, "promql", "promqltest", "testdata")
	files, err := filepath.Glob(filepath.Join(testdataDir, "*.test"))
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("no .test files under %s", testdataDir)
	}

	// NewTestEngine's options minus EnableDelayedNameRemoval: upstream's
	// testdata assumes that feature, but the Prometheus server default and
	// our engine (pkg/prometheus/engine.go) run with it off — the oracle
	// must model the semantics we serve.
	engine := promql.NewEngine(promql.EngineOpts{
		MaxSamples:               maxSamples,
		Timeout:                  100 * time.Second,
		NoStepSubqueryIntervalFn: func(int64) int64 { return time.Minute.Milliseconds() },
		EnableAtModifier:         true,
		EnableNegativeOffset:     true,
		LookbackDelta:            lookbackMs * time.Millisecond,
		Parser:                   parser.NewParser(promqltest.TestParserOpts),
	})
	defer func() { _ = engine.Close() }()
	seriesParser := parser.NewParser(promqltest.TestParserOpts)
	// Standard options: an expression the server-side parser would reject is
	// not servable, so it must not enter the corpus.
	exprParser := parser.NewParser(parser.Options{})

	c, skips, err := generate(files, engine, seriesParser, exprParser, promVersion)
	if err != nil {
		return err
	}
	if err := writeCorpus(out, c); err != nil {
		return err
	}

	log.Printf("wrote %s: %d cases over %d datasets", out, len(c.Cases), len(c.Datasets))
	keys := make([]string, 0, len(skips))
	for k := range skips {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		log.Printf("skipped %5d  %s", skips[k], k)
	}
	return nil
}

// prometheusModule locates the vendored prometheus module in the module
// cache; the generator always parses the testdata of the version this
// module requires, so a version bump regenerates against the new scripts.
func prometheusModule() (dir, version string, err error) {
	outDir, err := exec.Command("go", "list", "-m", "-f", "{{.Dir}}", "github.com/prometheus/prometheus").Output()
	if err != nil {
		return "", "", fmt.Errorf("locating prometheus module: %w", err)
	}
	outVer, err := exec.Command("go", "list", "-m", "-f", "{{.Version}}", "github.com/prometheus/prometheus").Output()
	if err != nil {
		return "", "", fmt.Errorf("resolving prometheus version: %w", err)
	}
	return strings.TrimSpace(string(outDir)), strings.TrimSpace(string(outVer)), nil
}
