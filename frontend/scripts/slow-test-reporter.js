import fs from 'node:fs';
import path from 'node:path';

const budgetMs = Number(process.env.SLOW_TEST_MS ?? 2000);

class SlowTestReporter {
	constructor() {
		this.slow = [];
	}

	onTestResult(_test, result) {
		const file = path.relative(process.cwd(), result.testFilePath);
		result.testResults.forEach((test) => {
			if ((test.duration ?? 0) > budgetMs) {
				this.slow.push({ file, name: test.fullName, ms: test.duration });
			}
		});
	}

	onRunComplete() {
		const summaryFile = process.env.GITHUB_STEP_SUMMARY;
		if (!summaryFile || this.slow.length === 0) {
			return;
		}
		const rows = this.slow
			.sort((a, b) => b.ms - a.ms)
			.map(
				(test) =>
					`| ${test.name.replace(/\|/g, '\\|')} | \`${test.file}\` | ${(test.ms / 1000).toFixed(1)} s |`,
			);
		fs.appendFileSync(
			summaryFile,
			[
				`### Jest tests over ${budgetMs / 1000} s`,
				'',
				'| Test | File | Time |',
				'| --- | --- | --- |',
				...rows,
				'',
			].join('\n'),
		);
	}
}

export default SlowTestReporter;
