import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const E2E_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
);
export const REPO_DIR = path.resolve(E2E_DIR, '../..');

export const testKey = ({ file, titles }) => [file, ...titles].join(' › ');

export function listTests() {
	const output = execFileSync(
		path.join(E2E_DIR, 'node_modules/.bin/playwright'),
		['test', '--list', '--project=chromium', '--reporter=json'],
		{ cwd: E2E_DIR, maxBuffer: 64 * 1024 * 1024 },
	);
	const report = JSON.parse(output.toString());
	if (report.errors?.length) {
		throw new Error(report.errors.map((error) => error.message).join('\n'));
	}
	const tests = [];
	const walk = (suite, titles) => {
		for (const spec of suite.specs ?? []) {
			if (spec.tests.some((test) => test.projectName === 'chromium')) {
				tests.push({
					file: spec.file,
					titles: [...titles, spec.title],
					// The JSON reporter drops the leading @.
					tags: spec.tags.map((tag) => `@${tag}`),
				});
			}
		}
		for (const child of suite.suites ?? []) {
			walk(child, [...titles, child.title]);
		}
	};
	for (const fileSuite of report.suites) {
		walk(fileSuite, []);
	}
	return tests;
}
