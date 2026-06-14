### Phases

1. **Pre-migration (dev)**: new tables `tag`, `tag_relations`, `pinned_dashboard`,  `dashboard_view`
2. **Validation**: run the migration script against a few prod snapshots locally. Verify counts match, spot-check shapes, time the run to estimate downtime.
3. **Dry-run in cloud prod (cloud only).** Ship a build that runs the migration script in read-only
mode against live prod data. Whenever the v1 get API is called for a dashboard, we dry-run the migration script for it in an async process. If there is a failure, schema mismatches, tag normalization rejections, etc, it is logged. Reach out to affected customers to fix their dashboards before the real migration. Re-run closer to migration day to confirm resolution.
4. **Migration deploy**: script runs, FF flips on. Integration dashboards materialized in the `dashboard` table using an internal system account with `Locked = true`.
5. **Post-migration**: v1 APIs deprecated but still respond.

#### **Rejected idea: dry run in a background job**

In the above plan, we only check the dashboards that the users access. However, that should be enough to cover enough dashboards to be able to find out possible issues. The extra effort of a background job doesn't have enough ROI.

### What gets migrated

Existing v1 dashboards → full v2 data shape (tags extracted from `data.tags` into `tag` and `tag_relations`; the field is removed from the blob). Integration dashboards → materialized rows. Pinned dashboards and saved views start empty.

### Tag normalization (v1 strings → v2 tag rows)

Each v1 dashboard `data.tags` is `[]string`. For every string `s`, derive `(key, value)`.

**Order of rules:**

1. **Trim** leading/trailing whitespace from `s`. If empty after trim → **skip silently** (log dashboard id + index, continue).
2. **If `s` contains `:`** → split at the **first** `:`. Let `k` = left side, `v` = right side.
    - If `k` is empty (input was `:val`) → `key = "tag"`, `value = val`.
    - If `v` is empty (input was `key:`) → `key = "tag"`, `value = k` (the literal left side becomes the value).
    - Otherwise → `key = k`, `value = v`.
    - Other `:` are replaced with `_`.
3. **Else if `s` contains `/`** → split at the **first** `/`. Let `k` = left side, `v` = right side.
    - Same empty-side handling: empty left → `key="tag", value=v`; empty right → `key="tag", value=k`. Otherwise → `key=k, value=v`.
4. **Else** (no separator) → `key = "tag"`, `value = s`.
5. Reserved-key collision. After steps 2–4, if the resulting key (case-insensitively) matches a reserved DSL key (name, description, created_at, updated_at, created_by, locked, public), prefix it with _ (e.g. name → _name). Silent — extremely unlikely in practice, but the rename keeps the dashboard alive without ambiguating the query DSL.
6. **`/` scrub.** Output tags must never contain `/` (input validation forbids it). After the above steps, replace any remaining `/` in `key` and `value` with `_`:
    - `a/b/c` → step 3 splits at first `/` → `key="a", value="b/c"` → after scrub → `key="a", value="b_c"`
    - `team/eng:prod` → step 2 splits at `:` → `key="team/eng", value="prod"` → after scrub → `key="team_eng", value="prod"`
    - `team/eng:my/path` → step 2 → `key="team/eng", value="my/path"` → scrub → `key="team_eng", value="my_path"`

Trailing/leading whitespace within `key` and `value` after split is also trimmed; if either side becomes empty after that, apply the empty-side rules above. If both sides are effectively empty (e.g. input was `:` or `/`), skip silently.

**Case-collision dedup:**

Multiple v1 strings can normalize to the same `(LOWER(key), LOWER(value))` across an org (e.g. `Env:Prod` and `env:PROD`). The functional unique index ensures only one row exists. Display casing is taken from the variant on the dashboard with the **earliest `created_at`** (ties broken by `dashboard.id`) — same rule as the previous spec, just applied to `(key, value)` instead of `name`.

**Tag relations:**

After tag rows are upserted, build `tag_relations` from each (dashboard, tag-id-after-dedup) pair. `ON CONFLICT` clause in the query makes this idempotent.

### Script properties

- Per-dashboard transactional. One failure logs the dashboard id and continues.
- Idempotent: `ON CONFLICT DO NOTHING` on tag and tag_relations upserts; dashboards already in v2 shape are skipped.
- Progress logged every N dashboards; final summary includes totals and failure list.

### Rollback

Forward-only — no v2→v1 reverse script. The FF is the kill-switch pre-frontend-cutover. After cutover, rollback = another deploy with the fix.

### What about dashboards that fail to migrate after all this?

In Get API (v2) there will be a check on the dashboard fetched.

- `v2` → normal flow.
- `v1` → return `422 Unprocessable Entity`.

The deprecated v1 APIs will still exist, so if any support ticket comes, we can check via the v1 API and see what’s wrong.