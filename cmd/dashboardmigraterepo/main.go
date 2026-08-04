// Command dashboardmigraterepo runs the v1→v2 dashboard migration over the
// SigNoz dashboards repo (github.com/SigNoz/dashboards) to surface
// conversion/validation gaps and emit the migrated v2 JSON.
//
// The repo keeps each dashboard's v1 JSON in a "v1" subfolder and its v2 form
// alongside that folder (foo/v1/bar.json → foo/bar.json), so only files
// directly inside a v1 folder are read, and each one is written to the same
// basename one level up. Folders without a v1 subfolder are left alone.
//
// It mirrors the production pipeline (the 103_migrate_dashboards_v1_to_v2 SQL
// migration): run the v4→v5 widget-query migration in place, then
// StorableDashboard.ConvertV1ToV2, then DashboardSpec.Validate. The v1 inputs
// are never touched; set -out to a scratch directory to review the result
// before overwriting the repo's v2 files in place.
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
	// overriddenIcon holds the original v1 image when it failed v2 validation and
	// was replaced with the default icon, so no dropped icon goes unreported.
	overriddenIcon string
}

func main() {
	inDir := flag.String("in", os.Getenv("DASHBOARDS_IN"), "dashboards repo root to scan for v1 JSON (default $DASHBOARDS_IN)")
	outDir := flag.String("out", os.Getenv("DASHBOARDS_OUT"), "directory to write migrated v2 JSON (mirrors -in layout, minus the v1 folder); empty = don't write, report only. Set equal to -in to overwrite the repo's v2 files in place (default $DASHBOARDS_OUT)")
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
	// nil duplicate-key lists == the create path / SQL-migration wiring.
	migrator := transition.NewDashboardMigrateV5(slog.New(slog.NewTextHandler(os.Stderr, nil)), nil, nil)

	var outcomes []outcome
	folders := folderIndex{}
	err := filepath.WalkDir(walkRoot, func(path string, dirEntry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(*inDir, path)

		if dirEntry.IsDir() {
			// Skip VCS and image/asset directories — never dashboards, and counting
			// them would inflate the folder tally.
			if name := dirEntry.Name(); name == ".git" || name == ".github" || name == "assets" || name == "images" {
				return fs.SkipDir
			}
			if dirEntry.Name() == v1Dir {
				folders.ensure(filepath.Dir(path)).hasV1 = true
				return nil
			}
			// Register every other directory so a folder still counts when it holds
			// no dashboards at all (e.g. aws-rds, a parent of two dashboard folders).
			// rel == "." is the scan root itself, not a dashboard folder.
			if rel != "." {
				folders.ensure(path)
			}
			return nil
		}
		if !strings.HasSuffix(path, ".json") {
			return nil
		}

		parent := filepath.Dir(path)
		// Only v1 sources are migrated; a JSON file anywhere else is either an
		// already-migrated v2 sibling or a dashboard in a folder the repo hasn't
		// split into a v1 folder yet.
		if filepath.Base(parent) != v1Dir {
			folders.ensure(parent).looseDashboards++
			return nil
		}

		folders.ensure(filepath.Dir(parent)).v1Dashboards++
		outcomes = append(outcomes, migrateOne(ctx, migrator, path, rel, *outDir))
		return nil
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "walk failed: %v\n", err)
		os.Exit(1)
	}

	report(outcomes, folders)
}

// v1Dir is the dashboards-repo folder holding a dashboard's v1 JSON; the
// migrated v2 JSON lives one level up, next to that folder.
const v1Dir = "v1"

// folderStats counts the dashboards a single folder owns. v1Dashboards and
// looseDashboards are disjoint: the former sit inside the folder's v1
// subfolder, the latter directly in the folder — which for a folder with a v1
// subfolder means the migrated v2 siblings, and for one without means
// dashboards this command leaves alone.
type folderStats struct {
	hasV1           bool
	v1Dashboards    int
	looseDashboards int
}

// folderIndex accumulates per-folder stats during the walk, keyed by path.
type folderIndex map[string]*folderStats

func (index folderIndex) ensure(path string) *folderStats {
	stats, ok := index[path]
	if !ok {
		stats = &folderStats{}
		index[path] = stats
	}
	return stats
}

func migrateOne(ctx context.Context, migrator interface {
	Migrate(context.Context, map[string]any) bool
}, path, rel, outDir string) outcome {
	raw, err := os.ReadFile(path)
	if err != nil {
		return outcome{relPath: rel, status: "read-failed", detail: err.Error()}
	}
	var data map[string]any
	if err := json.Unmarshal(raw, &data); err != nil {
		return outcome{relPath: rel, status: "read-failed", detail: err.Error()}
	}

	storable := dashboardtypes.StorableDashboard{
		Data:  dashboardtypes.StorableDashboardData(data),
		OrgID: valuer.GenerateUUID(),
	}
	storable.ID = valuer.GenerateUUID()

	if storable.IsV2() {
		return outcome{relPath: rel, status: "skipped-v2", detail: "already v2 schema"}
	}

	// v1→v2 assumes v5-shaped widget queries; run v4→v5 in place first.
	migrator.Migrate(ctx, storable.Data)

	v2, err := storable.ConvertV1ToV2()
	if err != nil {
		return outcome{relPath: rel, status: "convert-failed", detail: err.Error()}
	}

	out, err := marshalPostableV2(v2)
	if err != nil {
		return outcome{relPath: rel, status: "convert-failed", detail: err.Error()}
	}

	// Validate exactly as the import API does: unmarshal the JSON back. This both
	// populates common.JSONRef.Path (json:"-", set only on decode — an in-memory
	// Spec.Validate() would spuriously fail panel-ref checks) and runs the full
	// PostableDashboardV2.Validate (DisallowUnknownFields + spec validation).
	var roundTrip dashboardtypes.PostableDashboardV2
	if err := json.Unmarshal(out, &roundTrip); err != nil {
		return outcome{relPath: rel, status: "validate-failed", detail: err.Error()}
	}

	if outDir != "" {
		if err := writeFile(out, rel, outDir); err != nil {
			return outcome{relPath: rel, status: "write-failed", detail: err.Error()}
		}
	}

	// The conversion silently replaces an image that fails v2 validation with the
	// default icon; capture the original so a dropped icon is reported, not lost.
	result := outcome{relPath: rel, status: "ok"}
	if origIcon, _ := storable.Data["image"].(string); origIcon != "" {
		if _, overridden := dashboardtypes.ResolveV1Image(origIcon); overridden {
			result.overriddenIcon = origIcon
		}
	}
	return result
}

// marshalPostableV2 renders the PostableDashboardV2 form (schemaVersion, image,
// generateName, tags, spec) — the shape the import API accepts. generateName is
// set instead of a name so every import derives its own internal name from
// spec.display.name; a name baked into the repo JSON would be reused verbatim by
// every org importing it.
func marshalPostableV2(v2 *dashboardtypes.DashboardV2) ([]byte, error) {
	postable := dashboardtypes.PostableDashboardV2{
		DashboardV2MetadataBase: v2.DashboardV2MetadataBase,
		GenerateName:            true,
		Tags:                    tagtypes.NewPostableTagsFromTags(v2.Tags),
		Spec:                    v2.Spec,
	}
	return json.MarshalIndent(postable, "", "  ")
}

// writeFile writes the migrated JSON to the v1 source's sibling one level above
// the v1 folder, keeping the basename (foo/v1/bar.json → foo/bar.json), so an
// -out equal to -in replaces the repo's v2 file and leaves the v1 file untouched.
func writeFile(out []byte, rel, outDir string) error {
	dst := filepath.Join(outDir, filepath.Dir(filepath.Dir(rel)), filepath.Base(rel))
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	return os.WriteFile(dst, out, 0o644)
}

func report(outcomes []outcome, folders folderIndex) {
	sort.Slice(outcomes, func(i, j int) bool { return outcomes[i].relPath < outcomes[j].relPath })

	counts := map[string]int{}
	for _, o := range outcomes {
		counts[o.status]++
	}

	withV1, withoutV1, dashboardsWithV1, dashboardsWithoutV1 := summarizeFolders(folders)
	fmt.Printf("\n=== folders ===\n")
	fmt.Printf("  %-24s %4d\n", "total", withV1+withoutV1)
	fmt.Printf("  %-24s %4d   %d dashboards\n", "with a "+v1Dir+" folder", withV1, dashboardsWithV1)
	fmt.Printf("  %-24s %4d   %d dashboards (skipped)\n", "without a "+v1Dir+" folder", withoutV1, dashboardsWithoutV1)

	fmt.Printf("\n=== %d dashboards migrated ===\n", len(outcomes))
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

	// Icons dropped because the v1 image failed v2 validation — these migrated
	// fine but lost their original icon to the default, so list them for review.
	fmt.Printf("\n=== icons overridden (replaced with default) ===\n")
	anyIcon := false
	for _, o := range outcomes {
		if o.overriddenIcon == "" {
			continue
		}
		anyIcon = true
		fmt.Printf("\n%s\n    %s\n", o.relPath, truncate(o.overriddenIcon, 100))
	}
	if !anyIcon {
		fmt.Println("  none")
	}
}

// summarizeFolders splits the scanned folders into those that carry a v1
// subfolder and those that don't, with the dashboard count on each side. Only
// dashboards in a v1 folder are migrated, so the second count is what this
// command left untouched.
func summarizeFolders(folders folderIndex) (withV1, withoutV1, dashboardsWithV1, dashboardsWithoutV1 int) {
	for _, stats := range folders {
		if stats.hasV1 {
			withV1++
			dashboardsWithV1 += stats.v1Dashboards
			continue
		}
		withoutV1++
		dashboardsWithoutV1 += stats.looseDashboards
	}
	return withV1, withoutV1, dashboardsWithV1, dashboardsWithoutV1
}

// truncate shortens a value for the report — v1 images can be multi-KB base64.
func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + fmt.Sprintf("… (%d chars)", len(s))
}
