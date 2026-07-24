import fs from 'fs';
import path from 'path';

import type { BrowserContext } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import { authToken } from '../../helpers/dashboards';

// Verifies the v1→v2 dashboard migration by loading every migrated dashboard in
// the real V2 UI. Point PERSES_DASHBOARDS_DIR at the SigNoz dashboards repo
// after producing the `*-perses.json` files:
//
//   go run ./cmd/dashboardmigraterepo -out /path/to/dashboards
//
// Run it so you SEE progress per dashboard (one line each) + get screenshots:
//
//   pnpm exec playwright test --project=chromium --no-deps --workers=1 \
//     --reporter=list migrated-perses
//   pnpm exec playwright show-report artifacts/html   # screenshots
//
// Pre-req: the V2 renderer is behind the `use_dashboard_v2` flag — temporarily
// force `useIsDashboardV2()` to return true so `/dashboard/<id>` renders V2.
//
// What runs, and where the output goes:
//   • beforeAll logs in ONCE, then POSTs each `*-perses.json` to
//     /api/v2/dashboards — one "[seed]" line per file.
//   • one test per file opens /dashboard/<id>, attaches a full-page screenshot,
//     and fails on any JS pageerror — one "✓/✘" line per file (list reporter).
//   • afterAll DELETEs everything this run created (reusing the same login, so
//     cleanup can't be defeated by a re-login race) — one "[cleanup]" line each.
//   • a human-readable summary is written to
//     artifacts/migrated-perses-summary.md (open it in the editor).
//
// Data-level correctness (charts populated) is out of scope — that needs
// telemetry matching each dashboard's queries. This gate is "does it render
// without crashing", proven by the screenshot + the pageerror check.

const PERSES_DIR = process.env.PERSES_DASHBOARDS_DIR;

// In local dev the UI (baseURL, e.g. :3301) and the backend API (e.g. :8080)
// are separate origins, so seeding/cleanup targets the API base directly.
// page.request is Node-side (no CORS), so cross-origin calls are fine.
const API_URL = process.env.SIGNOZ_E2E_API_URL || 'http://localhost:8080';

const SUMMARY_PATH = path.join(
	__dirname,
	'../../artifacts/migrated-perses-summary.md',
);

function findPersesFiles(root: string): string[] {
	const out: string[] = [];
	const walk = (dir: string): void => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.name === '.git' || entry.name === 'node_modules') {
				continue;
			}
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (entry.name.endsWith('-perses.json')) {
				out.push(full);
			}
		}
	};
	walk(root);
	return out.sort();
}

const files = PERSES_DIR ? findPersesFiles(PERSES_DIR) : [];

// Shared across hooks + tests. Playwright registers tests synchronously, so ids
// can't be known at registration time — hence the module-scoped maps. All of
// this is single-worker state (run with --workers=1): one login, one context,
// one summary.
let adminContext: BrowserContext | undefined;
let adminToken = '';
const seeded = new Map<string, { id?: string; error?: string }>();
const createdIds: string[] = [];
// Per-dashboard render outcome, filled by each test, flushed to the summary
// file in afterAll.
type RenderResult = {
	name: string;
	id?: string;
	seedError?: string;
	jsErrors: string[];
	// Panel query_range calls that came back non-2xx. Noted, not failed: a broken
	// query is a migration-quality signal, but an empty/no-data 200 is expected
	// (no telemetry seeded) and is NOT recorded here.
	queryErrors: string[];
};
const renderResults: RenderResult[] = [];

test.describe('Migrated perses dashboards render in the V2 UI', () => {
	test.skip(
		!PERSES_DIR,
		'Set PERSES_DASHBOARDS_DIR to the dashboards repo (with *-perses.json from cmd/dashboardmigraterepo).',
	);

	// Opening a dashboard + waiting for panels to mount + screenshot can exceed
	// the 30s default on a cold V2 bundle.
	test.describe.configure({ timeout: 90_000 });

	test.beforeAll(async ({ browser }) => {
		// Seeding 100+ dashboards over the API is well past the default hook budget.
		test.setTimeout(300_000);
		// Log in ONCE. The context + token are reused for cleanup in afterAll, so
		// cleanup never depends on a second (flaky) login.
		adminContext = await newAdminContext(browser);
		const page = await adminContext.newPage();
		adminToken = await authToken(page);
		await page.close();

		// eslint-disable-next-line no-console
		console.log(`\n[seed] ${files.length} dashboard(s) → ${API_URL}`);
		for (let i = 0; i < files.length; i += 1) {
			const file = files[i];
			const rel = PERSES_DIR ? path.relative(PERSES_DIR, file) : file;
			const body = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<
				string,
				unknown
			>;
			// eslint-disable-next-line no-await-in-loop
			const res = await adminContext.request.post(`${API_URL}/api/v2/dashboards`, {
				data: body,
				headers: { Authorization: `Bearer ${adminToken}` },
			});
			const n = `${i + 1}/${files.length}`;
			if (!res.ok()) {
				// eslint-disable-next-line no-await-in-loop
				const error = `POST ${res.status()}: ${await res.text()}`;
				seeded.set(file, { error });
				// eslint-disable-next-line no-console
				console.log(`[seed ${n}] ✘ ${rel} — ${error}`);
				continue;
			}
			// eslint-disable-next-line no-await-in-loop
			const json = (await res.json()) as { data: { id: string } };
			seeded.set(file, { id: json.data.id });
			createdIds.push(json.data.id);
			// eslint-disable-next-line no-console
			console.log(`[seed ${n}] ✔ ${rel} → ${json.data.id}`);
		}
	});

	test.afterAll(async () => {
		test.setTimeout(300_000);
		// Reuse the beforeAll login — no re-login, so cleanup can't be defeated by
		// a login race. Delete everything this run created and report each result
		// so a leftover is visible, not silent.
		let deleted = 0;
		const failures: string[] = [];
		if (adminContext && createdIds.length > 0) {
			// eslint-disable-next-line no-console
			console.log(`\n[cleanup] deleting ${createdIds.length} dashboard(s)`);
			for (const id of createdIds) {
				// eslint-disable-next-line no-await-in-loop
				const res = await adminContext.request
					.delete(`${API_URL}/api/v2/dashboards/${id}`, {
						headers: { Authorization: `Bearer ${adminToken}` },
					})
					.catch((e: Error) => ({ ok: () => false, status: () => e.message }));
				if (res.ok()) {
					deleted += 1;
				} else {
					failures.push(`${id} (${res.status()})`);
				}
			}
			// eslint-disable-next-line no-console
			console.log(
				`[cleanup] deleted ${deleted}/${createdIds.length}` +
					(failures.length ? ` — FAILED: ${failures.join(', ')}` : ''),
			);
		}

		// Surface dashboards whose panels returned query errors (noted, not failed).
		const queryFails = renderResults.filter((r) => r.queryErrors.length > 0);
		if (queryFails.length > 0) {
			// eslint-disable-next-line no-console
			console.log(`\n[query] ${queryFails.length} dashboard(s) with panel query errors:`);
			for (const r of queryFails) {
				// eslint-disable-next-line no-console
				console.log(`  ✘ ${r.name} — ${r.queryErrors.join('; ')}`);
			}
		}

		// Write a human-readable summary into the repo (artifacts/ is gitignored
		// but visible in the editor).
		writeSummary(deleted, failures);

		await adminContext?.close();
	});

	function writeSummary(deleted: number, cleanupFailures: string[]): void {
		const seedFails = renderResults.filter((r) => r.seedError);
		const jsCrashes = renderResults.filter((r) => r.jsErrors.length > 0);
		const queryFails = renderResults.filter((r) => r.queryErrors.length > 0);
		const lines: string[] = [];
		lines.push('# Migrated perses dashboards — render verification');
		lines.push('');
		lines.push(`- Dashboards: **${files.length}**`);
		lines.push(`- Seed failures: **${seedFails.length}**`);
		lines.push(`- JS crashes (pageerror): **${jsCrashes.length}**`);
		lines.push(`- Dashboards with panel query errors: **${queryFails.length}**`);
		lines.push(
			`- Cleanup: deleted **${deleted}/${createdIds.length}**` +
				(cleanupFailures.length ? ` (FAILED: ${cleanupFailures.join(', ')})` : ''),
		);
		lines.push('');
		lines.push('| # | Dashboard | Seeded | JS errors | Query errors |');
		lines.push('|---|---|---|---|---|');
		renderResults.forEach((r, i) => {
			const seededCell = r.seedError ? `✘ ${r.seedError}` : '✔';
			const errCell = r.jsErrors.length
				? r.jsErrors.map((e) => e.split('\n')[0]).join('<br>')
				: '—';
			const queryCell = r.queryErrors.length ? r.queryErrors.join('<br>') : '—';
			lines.push(
				`| ${i + 1} | ${r.name} | ${seededCell} | ${errCell} | ${queryCell} |`,
			);
		});
		lines.push('');
		fs.mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
		fs.writeFileSync(SUMMARY_PATH, lines.join('\n'));
		// eslint-disable-next-line no-console
		console.log(`\n[summary] ${path.resolve(SUMMARY_PATH)}`);
	}

	if (PERSES_DIR && files.length === 0) {
		test('perses files present', () => {
			expect(
				files.length,
				`No *-perses.json found under ${PERSES_DIR}. Run: go run ./cmd/dashboardmigraterepo -out ${PERSES_DIR}`,
			).toBeGreaterThan(0);
		});
	}

	for (const file of files) {
		const title = PERSES_DIR ? path.relative(PERSES_DIR, file) : file;

		test(title, async ({ authedPage: page }, testInfo) => {
			const result = seeded.get(file);
			const errors: Error[] = [];
			// Record the outcome even if an assertion below throws, so the summary
			// file and cleanup reflect reality.
			const record: RenderResult = {
				name: title,
				id: result?.id,
				seedError: result?.error,
				jsErrors: [],
				queryErrors: [],
			};
			renderResults.push(record);

			expect(result, 'dashboard should have been seeded in beforeAll').toBeDefined();
			expect(
				result?.error,
				`POST /api/v2/dashboards failed: ${result?.error ?? ''}`,
			).toBeFalsy();
			const id = result?.id;
			expect(id, 'created dashboard id').toBeTruthy();

			page.on('pageerror', (err) => {
				errors.push(err);
				record.jsErrors.push(err.message);
			});

			// Watch panel query_range calls. Non-2xx = the migrated query is
			// structurally broken (bad PromQL/ClickHouse, malformed aggregation);
			// only those are parsed + recorded. Empty 200s (no telemetry) are fine.
			const queryErrorParses: Promise<void>[] = [];
			page.on('response', (res) => {
				if (!/\/query_range/.test(res.url()) || res.ok()) {
					return;
				}
				queryErrorParses.push(
					(async () => {
						let detail = '';
						try {
							const body = (await res.json()) as {
								error?: { message?: string; code?: string };
							};
							detail = body?.error?.message || body?.error?.code || '';
						} catch {
							// Non-JSON / aborted body — status alone is the signal.
						}
						record.queryErrors.push(`${res.status()} ${detail}`.trim());
					})(),
				);
			});

			await page.goto(`/dashboard/${id}`);

			// V2 page chrome — the breadcrumb nav renders for every dashboard (root
			// "Dashboard" link → current dashboard crumb), so it's a reliable "the V2
			// detail page mounted for this id" signal. If it never appears, either the
			// dashboard failed to load or the use_dashboard_v2 flag isn't forced on.
			await expect(
				page.getByRole('navigation', { name: 'breadcrumb' }),
			).toBeVisible();

			// Best-effort: give panels time to mount so the screenshot is meaningful.
			// A dashboard with no renderable panel still counts as "no crash".
			await page
				.locator('[data-testid$="-renderer"]')
				.first()
				.waitFor({ state: 'visible', timeout: 20_000 })
				.catch(() => undefined);

			await testInfo.attach('render', {
				body: await page.screenshot({ fullPage: true }),
				contentType: 'image/png',
			});

			// Let any in-flight query_range error bodies finish parsing before we
			// report. Deduped so N failing panels of the same shape read as one note.
			// The per-dashboard breakdown is printed in afterAll + written to the
			// summary file (a conditional here trips playwright/no-conditional-in-test).
			await Promise.all(queryErrorParses);
			record.queryErrors = [...new Set(record.queryErrors)];

			expect(errors, `JS pageerror(s) while rendering ${title}`).toHaveLength(0);
		});
	}
});
