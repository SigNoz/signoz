# Plugin rule tests

Tests for the custom oxlint rules in `plugins/rules/`.

```bash
pnpm test:plugins
```

Runs on `node --test` rather than jest. The jest config is built for application
code — jsdom, ts-jest ESM transforms, a large `transformIgnorePatterns` wall —
and none of it applies to a suite whose only job is to shell out to the linter.

## Why it drives the real binary

Each case is written to a temp file and linted by the actual `oxlint` binary,
with every builtin category switched off so the only diagnostics that can appear
belong to the rule under test. Assertions therefore describe what CI enforces.

The alternative — walking the AST in-process — would need a stand-in for
oxlint's JS plugin AST. That AST is ESTree-shaped but not ESTree, and it carries
no type information, so a stand-in would drift from the runtime it claims to
model and the tests would certify behaviour that never happens.

All cases in a suite share one `oxlint` invocation and are mapped back by
filename. Per-case spawning costs roughly 80ms each; batching keeps both suites
together at around 250ms.

## Adding a suite

```js
import { ruleTester } from './rule-tester.mjs';

await ruleTester({
	rule: 'no-navigator-clipboard',
	valid: ['const x = 1;'],
	invalid: [
		{
			code: 'navigator.clipboard.writeText("x");',
			errors: [{ message: 'useCopyToClipboard', line: 1, column: 1 }],
		},
	],
});
```

`ruleTester` must be awaited at the top level — it loads the plugin and runs
`oxlint` before declaring the tests.

- `rule` — the key the plugin exports it under. `plugin` defaults to
  `plugins/signoz.mjs`; pass a path relative to `frontend/` for another plugin.
- Cases are `.tsx` unless a `filename` gives another extension.
- `errors` takes a count or an array. Each entry may assert `message` (substring
  or `RegExp`), `line` and `column`; omitted fields are not checked.
- `name` labels the case in the output and defaults to its first line of code.
- `output` asserts the source after suggestions are applied — see below.
- `todo` marks a case as a known defect — see below.

## Suggestions

Both Google Translate rules attach their wrap as a *suggestion*, not a fix, so
`--fix` leaves the code alone and `--fix-suggestions` applies it. The wrap is
`<span className="translate-safe">`, and `.translate-safe` is `display: contents`
in `src/styles.scss`: React owns an element that absorbs Translate's `<font>`
swap, while the box tree stays as it was, so a flex or grid parent still sees one
contiguous text run rather than a new item with its own `gap`.

It stays a suggestion because the element is still a DOM child even with no box:
`> *`, `:nth-child` and sibling selectors still count it, and a component that
inspects its children — `React.Children.map`, antd `Tooltip`, `Space` — sees an
element where a string used to be. That is what oxlint means by "May change
program behavior" in `--fix-suggestions --help`.

An invalid case carrying `output` is linted twice: once for diagnostics, and
once with `--fix-suggestions` over an untouched copy of the same files. The
second run costs one extra `oxlint` spawn per suite and only happens when at
least one case asks for it.

```js
{
	code: "export const A = () => <div>{f ? 'a' : 'b'}<b/></div>;",
	errors: 2,
	output:
		'export const A = () => <div>{f ? <span className="translate-safe">a</span> : <span className="translate-safe">b</span>}<b/></div>;',
}
```

Suggestions do not reformat, so a real run is `oxlint --fix-suggestions` then
`oxfmt`.

## Known defects

A case carrying `todo` asserts what the rule *should* do. It still runs, but a
failure is reported as a todo rather than failing the suite, so a bug can be
pinned as an executable spec instead of prose. Fixing the rule turns the todo
green; deleting the flag then makes it a regression guard.

Cases are prefixed `FP:` where the rule reports something it should not, `GAP:`
where it misses something it should catch, and `TYPE-AWARE:` where the miss is
only fixable once the linter can resolve types. Everything without a flag is a
characterisation test recording current behaviour.

The current todos:

**Gaps — constructs the rules never visit.** `isProblematicConditional` requires
a `JSXElement` parent, so a conditional inside a fragment is never inspected even
though the failure does not care about the parent's kind. `no-return-text-nodes`
listens only for `FunctionDeclaration` and reads the name off `node.id`, so
arrow-function components and anonymous default exports are invisible — this
codebase writes components as arrow functions, which is why that rule reports
nothing across `src`.

Class components are left out deliberately rather than pinned as a gap: there
are none in `src`.

**Type-aware gaps.** Upstream resolves branch types through
`@typescript-eslint/utils` and reports anything typed `string` or `number`.
oxlint's JS plugin runtime exposes no type information — `sourceCode.parserServices`
is always `{}` — so those code paths were removed rather than left dormant. The
`TYPE-AWARE:` todos record what they used to catch, and become the acceptance
criteria if oxlint ever hands types to JS plugins.

## Not a defect

Without types, `no-conditional-text-nodes-with-siblings` falls back to a callee
allowlist (`t`, `formatMessage`, `toString`, `toLocaleString`). Cases around
that allowlist pin its edges; widening it is the supported way to catch more
call expressions.

Both branches of a ternary are reported separately, so one fix can clear two
diagnostics. That inflates the count but every reported node is genuinely a text
node, so the cases assert both.
