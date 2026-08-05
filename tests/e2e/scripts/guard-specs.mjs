// Keeps the suite honest: a spec is either running and complete, or parked in
// parked-specs.json with a reason. Fails on a skipped/fixme'd/only test in a spec that
// is not parked, and on a parked entry that no longer matches anything.
//
// Run: pnpm guard:specs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const parked = JSON.parse(
	readFileSync(join(root, 'parked-specs.json'), 'utf8'),
);

/** Every *.spec.ts under tests/, repo-relative with forward slashes. */
function specFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			return specFiles(full);
		}
		return entry.name.endsWith('.spec.ts') ? [full] : [];
	});
}

/** A parked glob (`**​/tests/x/y.spec.ts`) matched against an absolute path. */
function matchesGlob(glob, absolutePath) {
	const ANY_DIRS = '\u0000';
	const pattern = glob
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*\//g, ANY_DIRS)
		// Single `*` never crosses a path separator; do this before expanding ANY_DIRS,
		// whose replacement itself contains a `*`.
		.replace(/\*/g, '[^/]*')
		.split(ANY_DIRS)
		.join('(?:.*/)?');
	return new RegExp(`^${pattern}$`).test(absolutePath.split('\\').join('/'));
}

// Declaration form only — `test.skip(condition, reason)` inside a test body is a
// legitimate runtime guard, not a parked test.
const OFFENDERS = [
	{ label: 'test.skip', re: /(?<![\w.])test\.skip\(\s*['"`]/g },
	{ label: 'test.fixme', re: /(?<![\w.])test\.fixme\(\s*['"`]/g },
	{ label: 'describe.skip', re: /describe\.skip\(/g },
	{ label: 'describe.fixme', re: /describe\.fixme\(/g },
	{ label: 'test.only', re: /(?<![\w.])test\.only\(/g },
	{ label: 'describe.only', re: /describe\.only\(/g },
];

const testsDir = join(root, 'tests');
const files = statSync(testsDir, { throwIfNoEntry: false })
	? specFiles(testsDir)
	: [];
const failures = [];

for (const file of files) {
	if (parked.specs.some((glob) => matchesGlob(glob, file))) {
		continue;
	}
	const source = readFileSync(file, 'utf8');
	for (const { label, re } of OFFENDERS) {
		const hits = source.match(re);
		if (hits) {
			failures.push(
				`${relative(root, file)}: ${hits.length} × ${label} — finish it, or park the spec in parked-specs.json with a reason`,
			);
		}
	}
}

for (const glob of parked.specs) {
	if (!files.some((file) => matchesGlob(glob, file))) {
		failures.push(
			`parked-specs.json: "${glob}" matches no spec — drop the stale entry`,
		);
	}
}

if (failures.length > 0) {
	console.error(
		`\nguard:specs failed\n\n${failures.map((f) => `  ✗ ${f}`).join('\n')}\n`,
	);
	process.exit(1);
}

// eslint-disable-next-line no-console
console.log(
	`guard:specs ok — ${files.length - parked.specs.length}/${files.length} specs running, ${parked.specs.length} parked`,
);
