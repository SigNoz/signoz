// Command dashboardmigrateintegrations runs the v1→v2 dashboard migration over
// every bundled integration dashboard in this repo — the built-in integrations
// under pkg/query-service/app/integrations/builtin_integrations and the cloud
// integrations under pkg/modules/cloudintegration/.../fs/definitions — to surface
// conversion/validation gaps and rewrite the dashboards to the v2 schema.
//
// It mirrors the production pipeline (module.ConvertAllV1ToV2): run the v4→v5
// widget-query migration in place, then StorableDashboard.ConvertV1ToV2, then
// PostableDashboardV2.Validate.
//
// Unlike dashboardmigraterepo (which reviews an external checkout via -out), these
// dashboards live in this repo, so migrated output overwrites each file in place by
// default — review the result with `git diff`. Pass -out to mirror the migrated
// copies into a separate directory instead, leaving the repo untouched.
//
// Only files matching <root>/.../assets/dashboards/*.json count as dashboards;
// integration.json, config, and other assets are skipped, as are the frozen
// pkg/sqlmigration snapshot copies (they live outside the scanned roots).
//
// Throwaway tooling for the schema migration; not part of the build.
//
// Usage:
//
//	go run ./cmd/dashboardmigrateintegrations               # overwrite in place
//	go run ./cmd/dashboardmigrateintegrations -out /tmp/v2  # review copies, repo untouched
//	go run ./cmd/dashboardmigrateintegrations -only redis   # just the redis dashboards
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

// integrationDashboardRoots are the two live sources of bundled integration
// dashboards, relative to -in. The pkg/sqlmigration snapshot copies are
// deliberately excluded — they are frozen inputs to one-time DB migrations.
var integrationDashboardRoots = []string{
	"pkg/query-service/app/integrations/builtin_integrations",
	"pkg/modules/cloudintegration/implcloudintegration/fs/definitions",
}

type outcome struct {
	relPath string
	status  string // ok | skipped-v2 | convert-failed | validate-failed | read-failed | write-failed
	detail  string
}

func main() {
	inDir := flag.String("in", ".", "repo root to scan for integration dashboards")
	outDir := flag.String("out", "", "directory to write migrated v2 JSON (mirrors -in layout); empty = overwrite each dashboard in place")
	only := flag.String("only", "", "restrict to dashboards whose path contains this substring (e.g. redis or aws/rds); empty = all")
	flag.Parse()

	ctx := context.Background()
	// nil duplicate-key lists == the create path / ConvertAllV1ToV2 wiring.
	migrator := transition.NewDashboardMigrateV5(slog.New(slog.NewTextHandler(os.Stderr, nil)), nil, nil)

	var outcomes []outcome
	for _, root := range integrationDashboardRoots {
		walkRoot := filepath.Join(*inDir, root)
		err := filepath.WalkDir(walkRoot, func(path string, dirEntry fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if dirEntry.IsDir() || !isDashboardFile(path) {
				return nil
			}
			// rel is always computed against -in so -out mirrors the repo layout.
			rel, _ := filepath.Rel(*inDir, path)
			if *only != "" && !strings.Contains(rel, *only) {
				return nil
			}
			outcomes = append(outcomes, migrateOne(ctx, migrator, path, rel, *outDir))
			return nil
		})
		if err != nil {
			fmt.Fprintf(os.Stderr, "walk %s failed: %v\n", walkRoot, err)
			os.Exit(1)
		}
	}

	report(outcomes)
}

// isDashboardFile picks out only the dashboard JSONs — those under an
// assets/dashboards/ directory — leaving integration.json, config, and other
// per-integration assets untouched.
func isDashboardFile(path string) bool {
	return strings.HasSuffix(path, ".json") &&
		strings.Contains(filepath.ToSlash(path), "/assets/dashboards/")
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

	// Overwrite in place by default; mirror into -out (same layout, same name) when set.
	dst := path
	if outDir != "" {
		dst = filepath.Join(outDir, rel)
	}
	if err := writeFile(out, dst); err != nil {
		return outcome{rel, "write-failed", err.Error()}
	}
	return outcome{rel, "ok", ""}
}

// marshalPostableV2 renders the PostableDashboardV2 form (schemaVersion, image,
// tags, spec) — the shape the provisioning path decodes.
//
// generateName is set (and name left empty) so the committed files stay
// deterministic — no baked-in random suffix that would churn on every re-run —
// and each install generates a fresh per-org dashboard name from spec.display.name.
func marshalPostableV2(v2 *dashboardtypes.DashboardV2) ([]byte, error) {
	postable := dashboardtypes.PostableDashboardV2{
		DashboardV2MetadataBase: v2.DashboardV2MetadataBase,
		GenerateName:            true,
		Tags:                    tagtypes.NewPostableTagsFromTags(v2.Tags),
		Spec:                    v2.Spec,
	}
	return json.MarshalIndent(postable, "", "  ")
}

func writeFile(out []byte, dst string) error {
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
