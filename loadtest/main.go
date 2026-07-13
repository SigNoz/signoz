// Command loadtest seeds Postgres with a large, realistic set of v6 (perses)
// dashboards and times the dashboard-list query against them.
//
// It is a throwaway tool. The schema below is a hand-written copy of the parts
// of the SigNoz migrations the list query touches (organizations, dashboard,
// tag, tag_relation, user_dashboard_preference) with the same columns, types,
// and indexes — notably NO index on dashboard.org_id, mirroring production, so
// the timings you get are the real ones.
//
// Usage:
//
//	go run ./loadtest
//
// Env knobs: PG_DSN, ORGS (1000), DASHBOARDS_PER_ORG (500), SEARCH (storage,
// the free-text term to time), PERSES_JSON (pkg/types/dashboardtypes/testdata/
// perses.json), DROP=1 to drop tables first, SEED=0 to only run the queries.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// tagKind is the tag_relation.kind value the list query binds — stored
// double-encoded (with the embedded quotes), matching dashboardtypes.
const tagKind = `"dashboard"`

// Each dashboard gets a rotating team/env/tier, so free-text and tag filters
// match predictable subsets.
var (
	teams = []string{"pulse", "storage", "metrics", "frontend", "platform"}
	envs  = []string{"prod", "dev", "staging"}
	tiers = []string{"critical", "normal"}
	nouns = []string{"Overview", "Latency", "Errors", "Traffic", "Saturation", "Cost"}
)

func main() {
	ctx := context.Background()

	dsn := env("PG_DSN", "postgres://signoz:signoz@localhost:5499/signoz?sslmode=disable")
	orgs := envInt("ORGS", 1000)
	dashPerOrg := envInt("DASHBOARDS_PER_ORG", 500)

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping (is postgres up?): %v", err)
	}

	if os.Getenv("DROP") == "1" {
		exec(ctx, pool, `DROP TABLE IF EXISTS tag_relation, tag, user_dashboard_preference, dashboard, organizations CASCADE`)
	}
	createSchema(ctx, pool)

	if env("SEED", "1") != "0" {
		seed(ctx, pool, orgs, dashPerOrg)
		exec(ctx, pool, `ANALYZE organizations, dashboard, tag, tag_relation, user_dashboard_preference`)
	}

	// IDX_ORG=1 adds the index prod lacks, to measure its effect. Re-run with
	// SEED=0 IDX_ORG=1 to time the same data with the index in place.
	if os.Getenv("IDX_ORG") == "1" {
		exec(ctx, pool, `CREATE INDEX IF NOT EXISTS dashboard_org_id_idx ON dashboard (org_id)`)
		exec(ctx, pool, `ANALYZE dashboard`)
		log.Println("created dashboard(org_id) index")
	}

	timeQueries(ctx, pool)
}

// ─── schema ──────────────────────────────────────────────────────────────────

func createSchema(ctx context.Context, pool *pgxpool.Pool) {
	// No index on dashboard.org_id — matches production; it's what makes the list
	// query a sequential scan and therefore interesting to measure.
	ddl := []string{
		`CREATE TABLE IF NOT EXISTS organizations (
			id text PRIMARY KEY, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
			name text, alias text, key bigint NOT NULL, display_name text NOT NULL)`,

		`CREATE TABLE IF NOT EXISTS dashboard (
			id text PRIMARY KEY, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
			created_by text, updated_by text, data text NOT NULL, locked boolean NOT NULL DEFAULT false,
			org_id text NOT NULL, source text NOT NULL, name text NOT NULL)`,

		`CREATE TABLE IF NOT EXISTS tag (
			id text PRIMARY KEY, key text NOT NULL, value text NOT NULL, org_id text NOT NULL,
			kind text NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL)`,
		// Functional unique index the tag subquery's LOWER(t.key) = LOWER(?) can use.
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_tag_a36c51df ON tag (org_id, kind, lower(key), lower(value))`,

		`CREATE TABLE IF NOT EXISTS tag_relation (
			id text PRIMARY KEY, kind text NOT NULL, resource_id text NOT NULL,
			tag_id text NOT NULL, created_at timestamptz NOT NULL)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_tag_relation_kind_resource_id_tag_id ON tag_relation (kind, resource_id, tag_id)`,

		`CREATE TABLE IF NOT EXISTS user_dashboard_preference (
			id text PRIMARY KEY, user_id text NOT NULL, dashboard_id text NOT NULL,
			is_pinned boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_user_dashboard_preference_user_id_dashboard_id ON user_dashboard_preference (user_id, dashboard_id)`,
	}
	for _, s := range ddl {
		exec(ctx, pool, s)
	}
}

// ─── seeding ─────────────────────────────────────────────────────────────────

func seed(ctx context.Context, pool *pgxpool.Pool, orgs, dashPerOrg int) {
	template := dataTemplate()
	log.Printf("seeding %d orgs × %d dashboards = %d rows (~%.1f GB of dashboard.data)",
		orgs, dashPerOrg, orgs*dashPerOrg, float64(orgs*dashPerOrg*len(template))/(1<<30))

	conn, err := pool.Acquire(ctx)
	if err != nil {
		log.Fatalf("acquire: %v", err)
	}
	defer conn.Release()

	start := time.Now()
	for o := 0; o < orgs; o++ {
		seedOrg(ctx, conn, o, dashPerOrg, template)
		if (o+1)%50 == 0 || o+1 == orgs {
			log.Printf("  %d/%d orgs (%s)", o+1, orgs, time.Since(start).Round(time.Second))
		}
	}
}

func seedOrg(ctx context.Context, conn *pgxpool.Conn, orgIdx, dashPerOrg int, template string) {
	now := time.Now().UTC()
	orgID := uuid.NewString()

	bulkCopy(ctx, conn, "organizations",
		[]string{"id", "created_at", "updated_at", "name", "alias", "key", "display_name"},
		[][]any{{orgID, now, now, fmt.Sprintf("org-%d", orgIdx), "", int64(orgIdx + 1), fmt.Sprintf("Org %d", orgIdx)}})

	// One tag row per (key, value); remember its id so dashboards can link to it.
	tagID := map[[2]string]string{}
	var tagRows [][]any
	for _, kv := range allTags() {
		id := uuid.NewString()
		tagID[kv] = id
		tagRows = append(tagRows, []any{id, kv[0], kv[1], orgID, tagKind, now, now})
	}
	bulkCopy(ctx, conn, "tag",
		[]string{"id", "key", "value", "org_id", "kind", "created_at", "updated_at"}, tagRows)

	var dashRows, relRows [][]any
	for i := 0; i < dashPerOrg; i++ {
		id := uuid.NewString()
		team, env, tier := teams[i%len(teams)], envs[i%len(envs)], tiers[i%len(tiers)]

		name := fmt.Sprintf("%s %s %d", capitalize(team), nouns[i%len(nouns)], i)
		desc := fmt.Sprintf("%s environment, %s tier, owned by %s", env, tier, team)
		data := fill(template, name, desc)

		dashRows = append(dashRows, []any{
			id, now, now, "loadtest@signoz.io", "loadtest@signoz.io",
			data, false, orgID, "user", fmt.Sprintf("dash-%d-%d", orgIdx, i)})

		for _, kv := range [][2]string{{"team", team}, {"env", env}, {"tier", tier}} {
			relRows = append(relRows, []any{uuid.NewString(), tagKind, id, tagID[kv], now})
		}
	}
	bulkCopy(ctx, conn, "dashboard",
		[]string{"id", "created_at", "updated_at", "created_by", "updated_by", "data", "locked", "org_id", "source", "name"}, dashRows)
	bulkCopy(ctx, conn, "tag_relation",
		[]string{"id", "kind", "resource_id", "tag_id", "created_at"}, relRows)
}

// allTags is the fixed per-org tag set: every (key, value) across team/env/tier.
func allTags() [][2]string {
	var out [][2]string
	for _, group := range []struct {
		key    string
		values []string
	}{{"team", teams}, {"env", envs}, {"tier", tiers}} {
		for _, v := range group.values {
			out = append(out, [2]string{group.key, v})
		}
	}
	return out
}

// dataTemplate is the stored `data` blob (perses.json wrapped as {metadata, spec})
// with __NAME__/__DESC__ placeholders, so each row is a cheap substitution rather
// than a 35 KB re-marshal. display.name/description are what the list query reads.
func dataTemplate() string {
	path := env("PERSES_JSON", "pkg/types/dashboardtypes/testdata/perses.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("read perses.json (%s): %v — set PERSES_JSON", path, err)
	}
	var spec map[string]any
	if err := json.Unmarshal(raw, &spec); err != nil {
		log.Fatalf("parse perses.json: %v", err)
	}
	spec["display"] = map[string]any{"name": "__NAME__", "description": "__DESC__"}

	out, err := json.Marshal(map[string]any{
		"metadata": map[string]any{"schemaVersion": "v6"},
		"spec":     spec,
	})
	if err != nil {
		log.Fatalf("marshal data template: %v", err)
	}
	return string(out)
}

// ─── timing ──────────────────────────────────────────────────────────────────

func timeQueries(ctx context.Context, pool *pgxpool.Pool) {
	const runs = 7

	orgID := pickOrg(ctx, pool)
	var orgTotal int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM dashboard WHERE org_id = $1`, orgID).Scan(&orgTotal)

	// A phrase is split into words that are AND'd, matching how `storage prod`
	// compiles — so the label shows "storage AND prod", not a quoted phrase.
	label := func(phrase string) string {
		return "free-text: " + strings.Join(strings.Fields(phrase), " AND ")
	}
	search := env("SEARCH", "storage")
	search2 := env("SEARCH2", "storage prod")
	queries := []struct{ name, sql string }{
		{"plain list (no search)", listQuery(orgID, "")},
		{label(search), listQuery(orgID, freeTextWhere(strings.Fields(search)...))},
		{label(search2), listQuery(orgID, freeTextWhere(strings.Fields(search2)...))},
	}

	fmt.Printf("\nsample org %s — %d dashboards, %d runs each\n\n", orgID, orgTotal, runs)
	fmt.Printf("%-32s %9s %9s %9s %8s\n", "query", "min", "median", "max", "matched")
	fmt.Println(strings.Repeat("─", 70))
	for _, q := range queries {
		min, med, max, matched := timeQuery(ctx, pool, q.sql, runs)
		fmt.Printf("%-32s %9s %9s %9s %8d\n", q.name, ms(min), ms(med), ms(max), matched)
	}
	fmt.Println()
}

// listQuery is the list the endpoint issues: filter by org, sort pinned-first
// then by name, first page. count(*) OVER () yields the full match total.
func listQuery(orgID, extraWhere string) string {
	userID := uuid.NewString() // no pins seeded; the LEFT JOIN just has to run
	return fmt.Sprintf(`
SELECT count(*) OVER () AS total, dashboard.id
FROM dashboard
LEFT JOIN user_dashboard_preference AS pref
       ON pref.user_id = '%s' AND pref.dashboard_id = dashboard.id
WHERE dashboard.org_id = '%s' AND dashboard.source <> 'system'%s
ORDER BY (CASE WHEN pref.is_pinned THEN 1 ELSE 0 END) DESC, lower(%s) ASC
LIMIT 30 OFFSET 0`, userID, orgID, extraWhere, nameJSON)
}

// freeTextWhere ANDs one predicate per term, matching how a multi-word search
// like `storage prod` compiles to contains(storage) AND contains(prod).
func freeTextWhere(terms ...string) string {
	var where string
	for _, term := range terms {
		where += " AND " + termPredicate(term)
	}
	return where
}

// termPredicate matches one term as a case-insensitive substring of the name,
// description, or any tag key/value.
func termPredicate(term string) string {
	pat := "%" + term + "%"
	return "(" +
		contains(nameJSON, pat) + " OR " + contains(descJSON, pat) + " OR EXISTS (" +
		"SELECT 1 FROM tag_relation tr JOIN tag t ON t.id = tr.tag_id " +
		"WHERE tr.kind = '" + tagKind + "' AND tr.resource_id = dashboard.id " +
		"AND (" + contains("t.key", pat) + " OR " + contains("t.value", pat) + ")))"
}

const (
	nameJSON = `dashboard.data::jsonb->'spec'->'display'->>'name'`
	descJSON = `dashboard.data::jsonb->'spec'->'display'->>'description'`
)

func contains(expr, pattern string) string {
	return fmt.Sprintf(`lower(%s) LIKE lower('%s') ESCAPE '\'`, expr, pattern)
}

// timeQuery runs sql once to warm up, then runs times more, draining every row,
// and returns min/median/max latency and the full match total.
func timeQuery(ctx context.Context, pool *pgxpool.Pool, sql string, runs int) (min, med, max time.Duration, matched int64) {
	var durations []time.Duration
	for i := 0; i <= runs; i++ {
		start := time.Now()
		rows, err := pool.Query(ctx, sql)
		if err != nil {
			log.Fatalf("query: %v", err)
		}
		var total int64
		for rows.Next() {
			var id string
			if err := rows.Scan(&total, &id); err != nil {
				log.Fatalf("scan: %v", err)
			}
		}
		rows.Close()
		if i > 0 { // skip warm-up
			durations = append(durations, time.Since(start))
			matched = total
		}
	}
	sort.Slice(durations, func(i, j int) bool { return durations[i] < durations[j] })
	return durations[0], durations[len(durations)/2], durations[len(durations)-1], matched
}

func pickOrg(ctx context.Context, pool *pgxpool.Pool) string {
	var orgID string
	// A middle-ish org, so it's not whatever happens to sort first.
	err := pool.QueryRow(ctx, `SELECT org_id FROM dashboard ORDER BY org_id
		LIMIT 1 OFFSET (SELECT count(DISTINCT org_id)/2 FROM dashboard)`).Scan(&orgID)
	if err != nil {
		log.Fatalf("pick org: %v", err)
	}
	return orgID
}

// ─── small helpers ─────────────────────────────────────────────────────────

func bulkCopy(ctx context.Context, conn *pgxpool.Conn, table string, cols []string, rows [][]any) {
	if _, err := conn.Conn().CopyFrom(ctx, pgx.Identifier{table}, cols, pgx.CopyFromRows(rows)); err != nil {
		log.Fatalf("copy %s: %v", table, err)
	}
}

func exec(ctx context.Context, pool *pgxpool.Pool, sql string) {
	if _, err := pool.Exec(ctx, sql); err != nil {
		log.Fatalf("exec %.60q: %v", sql, err)
	}
}

// fill substitutes the two display placeholders. Generated values are
// alphanumeric + spaces, so they need no JSON escaping.
func fill(template, name, desc string) string {
	template = strings.Replace(template, "__NAME__", name, 1)
	return strings.Replace(template, "__DESC__", desc, 1)
}

func capitalize(s string) string { return strings.ToUpper(s[:1]) + s[1:] }

func ms(d time.Duration) string { return fmt.Sprintf("%.1fms", float64(d.Microseconds())/1000) }

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func envInt(k string, def int) int {
	if v := os.Getenv(k); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			log.Fatalf("env %s: %v", k, err)
		}
		return n
	}
	return def
}
