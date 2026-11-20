import path from 'node:path';

import type { FrontendGraph } from './graph.mts';
import { SPEC_DATA, SPEC_PAGES } from './spec-pages.mts';

export type Verdict =
	| { kind: 'all'; reason: string }
	| { kind: 'folders'; folders: string[]; reason: string }
	| { kind: 'playwright'; reason: string }
	| { kind: 'none'; reason: string };

// Same paths as the `changes` job in `.github/workflows/e2eci.yaml`.
const E2E_TRIGGER =
	/^(frontend\/|tests\/|\.github\/workflows\/e2eci\.yaml$|cmd\/enterprise\/Dockerfile\.with-web\.integration$)/;

const E2E_INERT =
	/^tests\/e2e\/(.*\.md$|docs\/|specs\/|scripts\/|\.oxlintrc\.json$|\.oxfmtrc\.json$)/;
const FRONTEND_INERT =
	/^frontend\/(.*\.md$|docs\/|\.storybook\/|\.cursor\/|__mocks__\/|plugins\/|scripts\/(geo-outlines|test-storybook|post-types-generation)|.*\.(test|spec|stories)\.[jt]sx?$|jest\.config\.|knip\.jsonc$|\.oxlintrc|\.oxfmtrc|\.eslintrc)/;

export function classify(
	file: string,
	repoRoot: string,
	graph: FrontendGraph,
): Verdict {
	for (const [folder, prefixes] of Object.entries(SPEC_DATA)) {
		if (prefixes.some((prefix) => file.startsWith(prefix))) {
			return { kind: 'folders', folders: [folder], reason: 'runtime data' };
		}
	}
	if (!E2E_TRIGGER.test(file) || file.startsWith('tests/integration/')) {
		return { kind: 'none', reason: 'outside the e2e trigger' };
	}
	if (/^tests\/e2e\/(tests|drivers|testdata)\//.test(file)) {
		return { kind: 'playwright', reason: 'spec code, --only-changed' };
	}
	if (E2E_INERT.test(file)) {
		return { kind: 'none', reason: 'not loaded by the suite' };
	}
	if (!file.startsWith('frontend/')) {
		return { kind: 'all', reason: 'suite, stack or workflow' };
	}

	const absolute = path.join(repoRoot, file);
	const pages = [...graph.pageReach]
		.filter(([, reach]) => reach.has(absolute))
		.map(([page]) => page);
	if (pages.length > 0) {
		const folders = Object.entries(SPEC_PAGES)
			.filter(([, specPages]) => specPages.some((page) => pages.includes(page)))
			.map(([folder]) => folder);
		const reason = pages.length > 3 ? `${pages.length} pages` : pages.join(', ');
		return folders.length > 0
			? { kind: 'folders', folders, reason }
			: { kind: 'none', reason: `no spec opens ${reason}` };
	}
	if (graph.shell.has(absolute)) {
		return { kind: 'all', reason: 'app shell' };
	}
	if (file.startsWith('frontend/src/') || FRONTEND_INERT.test(file)) {
		return { kind: 'none', reason: 'not loaded by the app' };
	}
	return { kind: 'all', reason: 'frontend build input' };
}
