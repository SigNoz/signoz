function cleanLines(log) {
	return log.split('\n').map((line) =>
		line
			// eslint-disable-next-line no-control-regex
			.replace(/\x1b\[[0-9;]*m/g, '')
			.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z /, ''),
	);
}

const firstLineAfter = (lines, index) =>
	lines
		.slice(index + 1, index + 8)
		.map((next) => next.trim())
		.find(Boolean) ?? '';

// Storybook's test runner prints `FAIL  browser: chromium  <file>`, then repeats
// the file with a `frontend/` prefix in its closing summary.
export function parseJest(log) {
	const lines = cleanLines(log);
	const failures = new Map();
	let file = null;
	lines.forEach((line, index) => {
		const failedFile = line.match(
			/^\s*FAIL\s+(?:browser: \S+\s+)?(?:frontend\/)?(\S+)/,
		);
		if (failedFile) {
			[, file] = failedFile;
			return;
		}
		const failedTest = line.match(/^\s*● (.+ › .+)$/);
		if (!failedTest || !file) {
			return;
		}
		const test = failedTest[1].trim();
		const key = `${file}\0${test}`;
		if (!failures.has(key)) {
			failures.set(key, {
				file,
				test,
				error: firstLineAfter(lines, index),
				retried: false,
			});
		}
	});
	return [...failures.values()];
}

// Playwright's list reporter numbers each failure (`1) [chromium] › <file>:<line>:<col> › <title>`)
// and closes with `N failed` and `N flaky` sections listing the same tests.
// A flaky test failed and then passed on one of Playwright's own retries.
export function parsePlaywright(log) {
	const lines = cleanLines(log);
	const testLine = /\[[^\]]+\] › (\S+?):\d+:\d+ › (.+?)\s*$/;
	const errors = new Map();
	const failures = [];
	let section = null;
	lines.forEach((line, index) => {
		const header = line.match(/^\s*\d+\) /) && line.match(testLine);
		if (header) {
			errors.set(`${header[1]}\0${header[2]}`, firstLineAfter(lines, index));
			return;
		}
		const count = line.match(
			/^\s*\d+ (failed|flaky|passed|skipped|interrupted|did not run)\b/,
		);
		if (count) {
			[, section] = count;
			return;
		}
		const listed =
			section === 'failed' || section === 'flaky' ? line.match(testLine) : null;
		if (listed) {
			const [, file, title] = listed;
			failures.push({
				file,
				test: title,
				error: errors.get(`${file}\0${title}`) ?? '',
				retried: section === 'flaky',
			});
		}
	});
	return failures;
}
