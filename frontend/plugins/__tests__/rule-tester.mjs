/**
 * Test harness for oxlint JS plugins.
 *
 * Rules are exercised through the real `oxlint` binary rather than a hand-rolled
 * AST walker, so what the tests assert is exactly what CI enforces. oxlint's JS
 * plugin AST is close to ESTree but not identical, and it exposes no type
 * information, so any in-process fake would drift from the real runtime.
 *
 * All cases in a suite are written to one temp directory and linted in a single
 * oxlint invocation, then mapped back by filename. Spawning per case costs ~80ms
 * each; batching keeps a full suite under a second.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FRONTEND_DIR = path.resolve(fileURLToPath(import.meta.url), '../../..');
const OXLINT_BIN = path.join(FRONTEND_DIR, 'node_modules/.bin/oxlint');

// oxlint enables its default categories unless every one is switched off, and a
// stray builtin diagnostic would be indistinguishable from the rule under test.
const CATEGORIES_OFF = {
	correctness: 'off',
	suspicious: 'off',
	pedantic: 'off',
	perf: 'off',
	style: 'off',
	restriction: 'off',
	nursery: 'off',
};

function normaliseCase(entry, index) {
	const testCase = typeof entry === 'string' ? { code: entry } : entry;
	const extension = testCase.filename
		? path.extname(testCase.filename).slice(1)
		: 'tsx';
	return {
		...testCase,
		index,
		basename: `case-${String(index).padStart(3, '0')}.${extension}`,
	};
}

function diagnosticFilename(diagnostic) {
	const raw = diagnostic.filename ?? '';
	const asPath = raw.startsWith('file://') ? fileURLToPath(raw) : raw;
	return path.basename(asPath);
}

function toError(diagnostic) {
	const span = diagnostic.labels?.[0]?.span;
	return {
		message: diagnostic.message,
		line: span?.line,
		column: span?.column,
	};
}

function runOxlint(dir, configPath, extraArgs = []) {
	const args = ['--config', configPath, '--format', 'json', ...extraArgs, '.'];
	try {
		return execFileSync(OXLINT_BIN, args, {
			cwd: dir,
			encoding: 'utf8',
			// A rule that reports on every case can produce a lot of output.
			maxBuffer: 64 * 1024 * 1024,
		});
	} catch (error) {
		// oxlint exits non-zero whenever it reports a diagnostic, which is the
		// expected outcome for every `invalid` case.
		if (typeof error.stdout === 'string' && error.stdout.trim() !== '') {
			return error.stdout;
		}
		throw new Error(`oxlint failed to run:\n${error.stderr || error.message}`, {
			cause: error,
		});
	}
}

function writeSuite(dir, cases, { pluginPath, ruleId }) {
	for (const testCase of cases) {
		const target = path.join(dir, testCase.basename);
		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, testCase.code);
	}

	const configPath = path.join(dir, '.oxlintrc.json');
	writeFileSync(
		configPath,
		JSON.stringify({
			jsPlugins: [pluginPath],
			categories: CATEGORIES_OFF,
			rules: { [ruleId]: 'error' },
		}),
	);
	return configPath;
}

/**
 * Lints every case in one pass, and applies suggestions in a second pass over an
 * untouched copy when any case declares `output`.
 *
 * @returns {{errors: Map<string, object[]>, outputs: Map<string, string>}}
 */
function lintCases(cases, options) {
	const root = mkdtempSync(path.join(tmpdir(), 'oxlint-rule-tester-'));
	try {
		const lintDir = path.join(root, 'lint');
		mkdirSync(lintDir);
		const report = JSON.parse(
			runOxlint(lintDir, writeSuite(lintDir, cases, options)),
		);

		const errors = new Map(cases.map((testCase) => [testCase.basename, []]));
		for (const diagnostic of report.diagnostics ?? []) {
			const bucket = errors.get(diagnosticFilename(diagnostic));
			// oxlint reports config-level problems without a filename; surfacing
			// them as a suite failure beats silently testing nothing.
			if (!bucket) {
				throw new Error(`Unexpected diagnostic: ${diagnostic.message}`);
			}
			bucket.push(toError(diagnostic));
		}

		const outputs = new Map();
		if (cases.some((testCase) => testCase.output !== undefined)) {
			const fixDir = path.join(root, 'fix');
			mkdirSync(fixDir);
			runOxlint(fixDir, writeSuite(fixDir, cases, options), ['--fix-suggestions']);
			for (const testCase of cases) {
				outputs.set(
					testCase.basename,
					readFileSync(path.join(fixDir, testCase.basename), 'utf8'),
				);
			}
		}

		return { errors, outputs };
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

function assertMessage(actual, expected, label) {
	if (expected instanceof RegExp) {
		assert.match(actual, expected, label);
	} else {
		assert.ok(
			actual.includes(expected),
			`${label}\n  expected message to contain: ${expected}\n  actual: ${actual}`,
		);
	}
}

function assertErrors(actual, expected, code) {
	const context = `\n--- code ---\n${code}\n--- reported ---\n${JSON.stringify(actual, null, 2)}`;

	if (typeof expected === 'number') {
		assert.equal(actual.length, expected, `error count${context}`);
		return;
	}

	assert.equal(actual.length, expected.length, `error count${context}`);
	expected.forEach((want, i) => {
		const got = actual[i];
		if (want.message !== undefined) {
			assertMessage(got.message, want.message, `error[${i}] message${context}`);
		}
		if (want.line !== undefined) {
			assert.equal(got.line, want.line, `error[${i}] line${context}`);
		}
		if (want.column !== undefined) {
			assert.equal(got.column, want.column, `error[${i}] column${context}`);
		}
	});
}

/**
 * Declares a suite for one rule.
 *
 * A case carrying `todo` asserts the behaviour the rule *should* have. It still
 * runs, but a failure is reported as a todo instead of failing the suite, so a
 * known bug can be pinned as an executable spec. Delete the flag once the rule
 * is fixed and the case starts guarding the fix.
 *
 * An invalid case carrying `output` also asserts the source after
 * `--fix-suggestions` has been applied.
 *
 * @param {object} options
 * @param {string} options.rule - rule name as exported by the plugin
 * @param {string} [options.plugin] - path to the plugin, relative to `frontend/`
 * @param {Array<string | {code: string, name?: string, filename?: string, todo?: string}>} options.valid
 * @param {Array<{code: string, name?: string, filename?: string, todo?: string, output?: string, errors: number | Array<{message?: string | RegExp, line?: number, column?: number}>}>} options.invalid
 */
export async function ruleTester({
	rule,
	plugin = 'plugins/signoz.mjs',
	valid = [],
	invalid = [],
}) {
	const pluginPath = path.join(FRONTEND_DIR, plugin);
	const { default: pluginModule } = await import(pathToFileURL(pluginPath));

	assert.ok(
		pluginModule.rules?.[rule],
		`plugin ${plugin} does not export a rule named "${rule}"`,
	);

	const ruleId = `${pluginModule.meta.name}/${rule}`;
	const validCases = valid.map(normaliseCase);
	const invalidCases = invalid.map((entry, i) =>
		normaliseCase(entry, valid.length + i),
	);
	const { errors, outputs } = lintCases([...validCases, ...invalidCases], {
		pluginPath,
		ruleId,
	});

	const declare = (t, testCase, expected) => {
		const label = testCase.name ?? testCase.code.trim().split('\n')[0];
		return t.test(label, { todo: testCase.todo }, () => {
			assertErrors(errors.get(testCase.basename), expected, testCase.code);
			if (testCase.output !== undefined) {
				assert.equal(
					outputs.get(testCase.basename),
					testCase.output,
					`suggestion output\n--- code ---\n${testCase.code}`,
				);
			}
		});
	};

	test(ruleId, async (t) => {
		await t.test('valid', async (t) => {
			for (const testCase of validCases) {
				await declare(t, testCase, 0);
			}
		});

		await t.test('invalid', async (t) => {
			for (const testCase of invalidCases) {
				await declare(t, testCase, testCase.errors);
			}
		});
	});
}
