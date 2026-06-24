# PR self-review checklist

Built from ~940 substantive review comments by @therealpandey (679 PRs, Jun 2024 – Jun 2026).
These are not todos — walk the list and ask "does this apply to my diff?" If an item doesn't
apply, skip it. Items marked 🔁 are the ones that come up in review most often; items in the
last section are subjective, meaning there's no written rule but the question will likely be
asked anyway — it's cheaper to have thought about it (or pre-empted it in the PR description)
than to discover it in review.

## Diff hygiene — read your own diff first

- [ ] Is every changed file actually needed for this PR? Formatting-only and IDE-drift
      changes get "please revert, out of scope" — even when they're harmless.
- [ ] Did anything sneak in from another branch (go.mod bumps, lockfiles, test configs)?
- [ ] Are pinned versions (ClickHouse, frontend deps, schema-migrator) untouched? Version
      bumps have their own release plan; don't ride them along.
- [ ] Is there leftover dead code: unused fields, unused functions, commented-out blocks,
      structs parsed but never read? "Where is this being used?" is a standard review question.
- [ ] If you kept something for a follow-up, did you say so in the PR description instead of
      leaving it silently?

## Types layer (`docs/contributing/go/types.md`, `go/abstractions.md`)

- [ ] 🔁 Does each new flavor type earn its place? If `StorableX == X` or
      `GettableX == X`, keep only `X`. ("Since StorableUser == User, just keep User.")
- [ ] 🔁 Do validation and `New*` constructors live in the types package, on the core type —
      not in the handler, module, or store?
- [ ] Is the types package free of imports from other `pkg/` packages — no store interfaces
      in signatures, no slog/logger calls?
- [ ] Is anything new sitting in the root of `pkg/types/` that belongs in a domain sub-package?
- [ ] If you added a wrapper/adapter/intermediate type: what does it add that the underlying
      type doesn't have? (abstractions.md's four questions — put the answers in the PR description.)

## Strong typing with valuer (no doc yet — most-repeated review comment in the dataset)

- [ ] 🔁 Are you extracting org ID as `orgID := valuer.MustNewUUID(claims.OrgID)` rather than
      passing the raw string? (15+ verbatim suggestions in review history.)
- [ ] 🔁 Do interface/store signatures take `valuer.UUID` (and `valuer.Email`, etc.), not `string`?
- [ ] Are enums built as `struct{ valuer.String }` with `<Type><Variant>` variable names and
      an `Enum()` method — not raw string constants?

## Errors (`docs/contributing/go/errors.md`)

- [ ] 🔁 Every new error uses `errors.New/Newf` with a *correct* Type and Code — InvalidInput
      for bad input, NotFound for missing rows, Internal for DB scans. No `fmt.Errorf`,
      no `github.com/pkg/errors`.
- [ ] 🔁 Are you wrapping only with purpose? Wrap exists to (1) hide sensitive/internal detail
      or (2) keep the original err in the chain for `errors.Ast/Is` checks. If the wrapped
      message just restates the inner one, return the error as-is.
- [ ] Specific codes via `errors.MustNewCode("...")` instead of matching on error strings?
- [ ] Store `Get` paths convert `sql.ErrNoRows` into a typed NotFound (`sqlstore.WrapNotFoundf`)?
- [ ] No `nil, nil` returns — a `(T, error)` contract means error when there's no T. And no
      blanket-ignoring of errors: ignore only the specific type you mean to ignore.

## Layering (handler.md covers handlers; store/module split is enforced but unwritten)

- [ ] 🔁 Handler does only: claims from context → `binding` decode → module call →
      `render.Error/Success`. No orchestration, no business decisions.
- [ ] 🔁 Store is dumb: no validation, no business logic, no cross-entity orchestration.
- [ ] Module owns the logic. Cross-module needs → hook-style inputs, not whole-module dependencies.
- [ ] Interface and implementation in separate packages (`x` vs `implx`); mocks in `xtest`.
- [ ] Does the new code reuse existing infrastructure (sqlstore, config, instrumentation
      registry, urljoin, binding) instead of hand-rolling a parallel version?

## API surface (`docs/contributing/go/endpoint.md`, `go/handler.md`)

- [ ] Routes: plural resources, snake_case (underscores, never hyphens), `/orgs/me/...` pattern,
      correct version prefix.
- [ ] OpenAPI `ID` equals the handler function name; superseded endpoints get a `*Deprecated` ID.
- [ ] `required:"true"` on keys that must be present; `nullable:"true"` on any slice/map that
      can serialize as `null` — or initialize it so it can't.
- [ ] Status codes: 201 on create, and is the access level (ViewAccess/EditAccess/AdminAccess)
      actually right for each route?
- [ ] Everything org-scoped: list/delete/update queries filtered by org_id; metrics namespaced
      per org.

## SQL & migrations (`docs/contributing/go/sql.md`)

- [ ] 🔁 Migration is idempotent — safe to run twice (check-before-insert, alreadyExists handled).
- [ ] `Down` is empty. Types are redefined inside the migration package, never imported from
      `pkg/types`.
- [ ] Old migrations untouched. If a type changed, shadow-copy the old shape into the old
      migration rather than editing it.
- [ ] New tables: `id` PK, `created_at`/`updated_at`, `org_id` FK. Foreign keys yes,
      `ON CASCADE` no — deletes happen in application code.
- [ ] Unique constraints expressed in the bun model so bun creates the index.

## Tests (`docs/contributing/tests/integration.md`; testify/table conventions unwritten)

- [ ] 🔁 Does the new behavior have a test at all? "Unit test please. Otherwise this will fail
      at runtime."
- [ ] `require` for setup, `assert` for the actual assertions.
- [ ] Similar cases collapsed into table-driven/parameterized tests instead of copy-pasted funcs.
- [ ] Asserting on real state (actual SQL emitted, actual DB row counts) rather than on mocks
      echoing back what you told them?
- [ ] Integration tests: reuse `tests/fixtures/`, never import another test suite, run
      `make py-fmt && make py-lint`.
- [ ] Any test that asserts nothing meaningful, or duplicates another test, deleted?

## Sync & docs

- [ ] Config field added/changed → `conf/example.yaml` updated to match.
- [ ] OpenAPI spec regenerated (`go run cmd/enterprise/*.go generate openapi`) if routes/types changed.
- [ ] Comments/docs you touched won't drift: avoid restating exact values/lists the code already
      owns; delete outdated comments instead of leaving them.
- [ ] Feature flags: registered in the flagger registry, name is action-oriented and consistent
      with existing flags (`use_...`, `get_x_from_y`).

## Mechanical polish

- [ ] gofmt/IDE format-on-save run on every touched file.
- [ ] Factory/registration one-liners kept on a single line (`factory.NewProviderFactory(...)`,
      `router.Handle(...)` chains) like neighboring code.
- [ ] Imports in three groups: stdlib / external / internal.
- [ ] Public functions above private ones in the file; blank line between methods.
- [ ] Bounds checks before indexing (`userRoles[0]` with no length check = guaranteed comment),
      nil checks first.

## Subjective — no rule, but expect the question

These are taste, and the reviewer knows it. You don't have to "fix" anything — but if your PR
trips one, decide *before* opening it whether you'd defend the choice or change it. A sentence
of rationale in the PR description converts most of these from a review round-trip into a nod.

- [ ] **Names**: say each new exported name out loud. Would you defend it against "better name
      here please"? Does it stutter with the package name? Is it consistent with the nearest
      existing concept instead of inventing a new word for an old thing?
- [ ] **Nesting & size**: any function where the happy path is buried three indents deep, or
      that a reviewer would call out for cyclomatic complexity? Early returns are cheap.
- [ ] **File organization**: did you create a new file (or package) where the contents would sit
      fine in an existing one? Tiny single-struct files attract "no need for a separate file".
- [ ] **Ordering as communication**: struct fields and functions in an order that means
      something (e.g. matching the spec/OTel ordering, public→private), not insertion order.
- [ ] **Is each new module/abstraction necessary**, or could it club with an existing one?
      ("Does it make sense to have a dedicated module for this? Please evaluate.") Pre-empt by
      stating the alternative you rejected.
- [ ] **Status-code judgment calls** (504 vs 503 vs 408 and friends): pick deliberately and be
      ready to justify against HTTP semantics.
- [ ] **Test volume**: would any of your tests be called "redundant — we already have one for
      expiry"? More tests isn't more better; each should cover a distinct behavior.
- [ ] **AI-generated tells**: leftover over-generic helpers, boilerplate comments, missing blank
      lines between logical blocks, code that doesn't match house idiom. The reviewer notices
      and says so ("AI Generated. There was no need to keep this.").
- [ ] **Pointer vs value**: every `*T` field/param deliberate? "Why is X a pointer?" is a
      recurring question — pointers should signal mutation or optionality, not habit.
- [ ] **Defensive trimming vs information loss**: when redacting/sanitizing (errors, logs, auth
      responses), are you stripping anything that's actually sensitive — or just making
      debugging harder? Over-redaction gets pushback too ("Revert this. err.Error() contains
      nothing sensitive.").
