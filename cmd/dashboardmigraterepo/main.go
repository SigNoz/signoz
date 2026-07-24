// Command dashboardmigraterepo runs the v1→v2 dashboard migration over every
// JSON file in the SigNoz dashboards repo (github.com/SigNoz/dashboards) to
// surface conversion/validation gaps and emit the migrated v2 JSON.
//
// It mirrors the production pipeline (module.ConvertAllV1ToV2): run the v4→v5
// widget-query migration in place, then StorableDashboard.ConvertV1ToV2, then
// DashboardSpec.Validate. Nothing is written back to the input repo — outputs
// go to -out so the result can be reviewed before staging a PR.
//
// Throwaway tooling for the schema migration; not part of the build.
//
// Flags default to environment variables so the command is portable across
// machines: DASHBOARDS_IN (-in), DASHBOARDS_OUT (-out), DASHBOARDS_ONLY (-only).
// Explicit flags always override the env vars.
//
// Usage:
//
//	DASHBOARDS_IN=~/dashboards DASHBOARDS_OUT=/tmp/dashboards-v2 go run ./cmd/dashboardmigraterepo
//	go run ./cmd/dashboardmigraterepo -in ~/dashboards -out /tmp/dashboards-v2
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type outcome struct {
	relPath string
	status  string // ok | skipped-v2 | convert-failed | validate-failed | read-failed
	detail  string
}

func main() {
	inDir := flag.String("in", os.Getenv("DASHBOARDS_IN"), "dashboards repo root to scan for v1 JSON (default $DASHBOARDS_IN)")
	outDir := flag.String("out", os.Getenv("DASHBOARDS_OUT"), "directory to write migrated v2 JSON (mirrors -in layout); empty = don't write, report only. Set equal to -in to overwrite in place (default $DASHBOARDS_OUT)")
	only := flag.String("only", os.Getenv("DASHBOARDS_ONLY"), "restrict the scan to this subfolder of -in (e.g. redis); empty = whole repo (default $DASHBOARDS_ONLY)")
	flag.Parse()

	if *inDir == "" {
		fmt.Fprintln(os.Stderr, "error: -in is required (or set $DASHBOARDS_IN) — path to the dashboards repo root")
		flag.Usage()
		os.Exit(2)
	}

	// Scan the whole repo, or a single subfolder when -only is set. rel paths are
	// always computed against -in so -out mirrors the repo layout either way.
	walkRoot := *inDir
	if *only != "" {
		walkRoot = filepath.Join(*inDir, *only)
	}

	ctx := context.Background()
	// nil duplicate-key lists == the create path / ConvertAllV1ToV2 wiring.
	migrator := transition.NewDashboardMigrateV5(slog.New(slog.NewTextHandler(os.Stderr, nil)), nil, nil)

	var outcomes []outcome
	err := filepath.WalkDir(walkRoot, func(path string, dirEntry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if dirEntry.IsDir() {
			// Skip VCS and image/asset directories — never dashboards.
			if name := dirEntry.Name(); name == ".git" || name == ".github" || name == "assets" {
				return fs.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".json") {
			return nil
		}
		// Skip our own migrated outputs from a prior run.
		if strings.HasSuffix(path, "-perses.json") {
			return nil
		}

		rel, _ := filepath.Rel(*inDir, path)
		outcomes = append(outcomes, migrateOne(ctx, migrator, path, rel, *outDir))
		return nil
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "walk failed: %v\n", err)
		os.Exit(1)
	}

	report(outcomes)
}

func migrateOne(ctx context.Context, migrator interface {
	Migrate(context.Context, map[string]any) bool
}, path, rel, outDir string) outcome {
	raw, err := os.ReadFile(path)
	if err != nil {
		return outcome{rel, "read-failed", err.Error()}
	}
	var data map[string]any
	if err := json.Unmarshal(raw, &data); err != nil {
		return outcome{rel, "read-failed", err.Error()}
	}

	storable := dashboardtypes.StorableDashboard{
		Data:  dashboardtypes.StorableDashboardData(data),
		OrgID: valuer.GenerateUUID(),
	}
	storable.ID = valuer.GenerateUUID()

	if storable.IsV2() {
		return outcome{rel, "skipped-v2", "already v2 schema"}
	}

	// v1→v2 assumes v5-shaped widget queries; run v4→v5 in place first.
	migrator.Migrate(ctx, storable.Data)

	v2, err := storable.ConvertV1ToV2()
	if err != nil {
		return outcome{rel, "convert-failed", err.Error()}
	}

	out, err := marshalPostableV2(v2)
	if err != nil {
		return outcome{rel, "convert-failed", err.Error()}
	}

	// Validate exactly as the import API does: unmarshal the JSON back. This both
	// populates common.JSONRef.Path (json:"-", set only on decode — an in-memory
	// Spec.Validate() would spuriously fail panel-ref checks) and runs the full
	// PostableDashboardV2.Validate (DisallowUnknownFields + spec validation).
	var roundTrip dashboardtypes.PostableDashboardV2
	if err := json.Unmarshal(out, &roundTrip); err != nil {
		return outcome{rel, "validate-failed", err.Error()}
	}

	if outDir != "" {
		if err := writeFile(out, rel, outDir); err != nil {
			return outcome{rel, "write-failed", err.Error()}
		}
	}
	return outcome{rel, "ok", ""}
}

// marshalPostableV2 renders the PostableDashboardV2 form (schemaVersion, image,
// name, tags, spec) — the shape the import API accepts.
func marshalPostableV2(v2 *dashboardtypes.DashboardV2) ([]byte, error) {
	postable := dashboardtypes.PostableDashboardV2{
		DashboardV2MetadataBase: v2.DashboardV2MetadataBase,
		Name:                    v2.Name,
		Tags:                    tagtypes.NewPostableTagsFromTags(v2.Tags),
		Spec:                    v2.Spec,
	}
	return json.MarshalIndent(postable, "", "  ")
}

// writeFile writes the migrated JSON alongside the original with a "-perses"
// suffix (foo.json → foo-perses.json), leaving the v1 file untouched.
func writeFile(out []byte, rel, outDir string) error {
	rel = strings.TrimSuffix(rel, ".json") + "-perses.json"
	dst := filepath.Join(outDir, rel)
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	return os.WriteFile(dst, out, 0o644)
}

func report(outcomes []outcome) {
	sort.Slice(outcomes, func(i, j int) bool { return outcomes[i].relPath < outcomes[j].relPath })

	counts := map[string]int{}
	for _, o := range outcomes {
		counts[o.status]++
	}

	fmt.Printf("\n=== %d dashboards ===\n", len(outcomes))
	for _, status := range []string{"ok", "skipped-v2", "convert-failed", "validate-failed", "read-failed", "write-failed"} {
		if counts[status] > 0 {
			fmt.Printf("  %-16s %d\n", status, counts[status])
		}
	}

	fmt.Printf("\n=== failures ===\n")
	any := false
	for _, o := range outcomes {
		if o.status == "ok" || o.status == "skipped-v2" {
			continue
		}
		any = true
		fmt.Printf("\n[%s] %s\n    %s\n", o.status, o.relPath, o.detail)
	}
	if !any {
		fmt.Println("  none")
	}
}
