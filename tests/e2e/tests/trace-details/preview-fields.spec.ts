import { test, expect } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	gotoTraceUntilLoaded,
	hoverFlamegraphSpan,
	loadLargeTrace,
	resetTracePreferences,
	seedTracesViaSeeder,
	setPreviewFieldsPreference,
} from '../../helpers/trace-details';

// §6 — preview fields. A configured preview field appears as a row in the span
// hover card (SpanTooltipContent, testid span-hover-card-preview-<key>). The
// waterfall variant is covered at the unit/integration level; this spec keeps
// the flamegraph (canvas) case, which can't run in jsdom.
//
// Preview fields are a server-side, per-user preference, so each test seeds them
// via the API before navigating; afterAll resets them so the state doesn't leak
// into other specs run by the same admin user.
const trace = loadLargeTrace();

// The db landmark span carries db.system="redis"; seed db.system as a preview
// field so its value renders in the hover card.
const PREVIEW_FIELD = 'db.system';
const PREVIEW_VALUE = 'redis';
const PREVIEW_TESTID = `span-hover-card-preview-${PREVIEW_FIELD}`;

// Skipped wholesale until the flamegraph preview-fields fetch race (FE bug, see
// the TC-01 FIXME + sprint task) is fixed — the only case here is that flamegraph
// hover test, which can't pass reliably yet. The waterfall variant moved to
// unit/integration. Re-enable (and un-fixme TC-01) once the flamegraph
// gates/refetches on previewFields.
test.describe.skip('Trace details — preview fields in the hover card', () => {
	// Run serially in one worker: preview fields are a per-user preference, so
	// the afterAll reset must not race a sibling test still using them on another
	// worker (which intermittently wiped the preview row mid-test).
	test.describe.configure({ mode: 'serial' });

	test.beforeAll(async ({ playwright }) => {
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
	});

	test.afterAll(async ({ browser }) => {
		// Reset prefs to defaults (afterAll can't use the authedPage fixture).
		const ctx = await newAdminContext(browser);
		const page = await ctx.newPage();
		await resetTracePreferences(page);
		await ctx.close();
	});

	test.beforeEach(async ({ authedPage: page }) => {
		// Seed the preview field BEFORE navigating so the on-mount prefs fetch
		// returns it and the hover card renders the row.
		// db.system is a span ATTRIBUTE (fieldContext 'attribute', not 'span') —
		// the flamegraph fetches fields selectively, so the wrong context means
		// the bar's span wouldn't carry the value and the hover row wouldn't render.
		await setPreviewFieldsPreference(page, [
			{ name: PREVIEW_FIELD, fieldContext: 'attribute', fieldDataType: 'string' },
		]);
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);
	});

	// FIXME: blocked by a frontend bug — the flamegraph fires its span fetch
	// (POST /flamegraph) with selectFields = color-by only, before previewFields
	// syncs into the store, and does NOT refetch when the preference lands. So the
	// flamegraph span never carries the preview attribute (e.g. db.system) and its
	// hover card can't render the row. Intermittent (passes only when prefs are
	// cache-warm before the first fetch). Re-enable once the flamegraph
	// gates/refetches on previewFields. See sprint task.
	test.fixme('TC-01 flamegraph hover card shows the configured preview field', async ({
		authedPage: page,
	}) => {
		const previewRow = page.getByTestId(PREVIEW_TESTID).first();
		await expect(async () => {
			await page.mouse.move(0, 0);
			await hoverFlamegraphSpan(page, trace.landmarks.db);
			await expect(previewRow).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		await expect(previewRow).toContainText(PREVIEW_VALUE);
	});
});
