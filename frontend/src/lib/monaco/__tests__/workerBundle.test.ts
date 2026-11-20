import { execFileSync } from 'child_process';
import { resolve } from 'path';

const READ_WORKER_FORMAT = `
(async () => {
	const { resolveConfig } = await import('vite');
	const config = await resolveConfig(
		{ configFile: process.argv[1], mode: 'production' },
		'build',
	);
	process.stdout.write(JSON.stringify(config.worker.format));
})();
`;

describe('Monaco worker bundle', () => {
	// An iife worker runs as a sloppy script: the minifier renames on the
	// assumption of strict mode, and Annex B hoisting then lets the JSON worker's
	// block-level `hasDuplicates` replace the schema collector, so validating any
	// non-empty array threw `Cannot read properties of undefined (reading 'include')`.
	it('ships workers as ES modules, which always run in strict mode', () => {
		const output = execFileSync(
			process.execPath,
			['--eval', READ_WORKER_FORMAT, resolve(process.cwd(), 'vite.config.ts')],
			{ cwd: process.cwd(), encoding: 'utf8' },
		);

		const format: unknown = JSON.parse(output);

		expect(format).toBe('es');
	}, 60_000);
});
