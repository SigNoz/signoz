#!/usr/bin/env node
/**
 * Prints the story files a change can affect, one per line, relative to
 * `frontend/`. Reads changed paths (relative to the repo root) on stdin and the
 * module graph `storybook build --stats-json` writes.
 *
 *   git diff --name-only main...HEAD | node scripts/select-stories.mjs <preview-stats.json>
 *   node scripts/select-stories.mjs --all <preview-stats.json>
 *
 * A story is selected when it imports a changed file, directly or through other
 * modules. Every story is selected when a changed file reaches
 * `.storybook/` (it renders around every story) or the graph cannot see it.
 */
import { readFileSync } from 'node:fs';

const FULL_RUN_PATHS = [
	/^\.github\/workflows\/jsci\.yaml$/,
	/^frontend\/\.storybook\//,
	/^frontend\/public\//,
	/^frontend\/(package\.json|pnpm-lock\.yaml|tsconfig\.json)$/,
	/^frontend\/scripts\/(test-storybook\.sh|select-stories\.mjs)$/,
];
// Sass partials are compiled inside the `.scss` that uses them, so the graph
// never lists them.
const STYLE_FILE = /\.(scss|sass|css)$/;
const STORY_FILE = /\.stories\.tsx?$/;

const args = process.argv.slice(2);
const selectAllFlag = args.includes('--all');
const statsPath = args.find((arg) => arg !== '--all');
if (!statsPath) {
	console.error('Usage: select-stories.mjs [--all] <preview-stats.json>');
	process.exit(2);
}

const { modules } = JSON.parse(readFileSync(statsPath, 'utf8'));
const importersById = new Map(
	modules.map((module) => [
		module.id,
		module.reasons.map((reason) => reason.moduleName),
	]),
);
const allStories = [...importersById.keys()].filter((id) =>
	STORY_FILE.test(id),
);

function selectAll(reason) {
	console.error(`Selecting every story: ${reason}`);
	return allStories;
}

/**
 * Walks importers up from `id`. Returns the stories reached, or the module
 * under `.storybook/` that imports it, which means every story is affected.
 */
function findImportingStories(id) {
	const stories = [];
	const pending = [id];
	const seen = new Set(pending);
	while (pending.length > 0) {
		const current = pending.pop();
		if (current.startsWith('./.storybook/')) {
			return { storybookModule: current, stories };
		}
		if (STORY_FILE.test(current)) {
			stories.push(current);
		}
		const importers = (importersById.get(current) ?? []).filter(
			(importer) => !seen.has(importer) && !importer.startsWith('/virtual:'),
		);
		importers.forEach((importer) => seen.add(importer));
		pending.push(...importers);
	}
	return { stories };
}

function select(changedFiles) {
	const fullRunFile = changedFiles.find((file) =>
		FULL_RUN_PATHS.some((pattern) => pattern.test(file)),
	);
	if (fullRunFile) {
		return selectAll(`${fullRunFile} changed`);
	}

	const selected = new Set();
	const ids = changedFiles
		.filter((file) => file.startsWith('frontend/'))
		.map((file) => `./${file.slice('frontend/'.length)}`);
	for (const id of ids) {
		if (!importersById.has(id)) {
			if (STYLE_FILE.test(id)) {
				return selectAll(`${id} is not in the module graph`);
			}
			continue;
		}
		const { storybookModule, stories } = findImportingStories(id);
		if (storybookModule) {
			return selectAll(`${id} is imported by ${storybookModule}`);
		}
		stories.forEach((story) => selected.add(story));
	}
	return [...selected];
}

const changedFiles = selectAllFlag
	? []
	: readFileSync(0, 'utf8')
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
const stories = selectAllFlag ? selectAll('--all') : select(changedFiles);

const lines = [...stories]
	.sort((a, b) => a.localeCompare(b))
	.map((story) => `${story.slice('./'.length)}\n`);
process.stdout.write(lines.join(''));
