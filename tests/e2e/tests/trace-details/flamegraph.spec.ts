import {
	expect,
	loadLargeTrace,
	onAdminPage,
	seedTracesViaSeeder,
	test,
	traceDetailsDriver,
} from '../../drivers/traces';

// The flamegraph is canvas-rendered, so individual bars have no DOM nodes. These
// specs drive it through the window.__sigTraceFlame__ test hook (enabled by
// gotoTraceUntilLoaded) — see drivers/traces.ts — which resolves a span's
// on-canvas point from the live span→rect map and dispatches real mouse events.
//
// One shared trace for the file, seeded once. Random ids per run isolate it from
// other parallel specs; the global teardown clears the traces signal.
//
// Colour-by recolor is asserted via the hook's getSpanColor (the resting group
// color per bar), since canvas pixels aren't directly assertable.
//
// Deferred: sampled large trace — sampling needs >100k spans
// (FLAMEGRAPH_SPAN_LIMIT), which is the deferred large-trace work.
const trace = loadLargeTrace();

test.describe('Trace details — flamegraph', () => {
	test.beforeAll(async ({ playwright }) => {
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
	});

	test.afterAll(async ({ browser }) => {
		// TC-04 changes colour-by — a per-user pref. Reset it so it does not leak
		// into other specs; `afterAll` cannot use the test-scoped `authedPage`.
		await onAdminPage(browser, (page) =>
			traceDetailsDriver(page).prefs.colorBy(''),
		);
	});

	test.beforeEach(async ({ traces }) => {
		await traces.goto(
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);
	});

	test('TC-01 hovering an error bar opens its hover card with status/start/duration', async ({
		traces,
	}) => {
		await traces.flame.hover(trace.landmarks.errors[0]);

		// The status row only renders in the hover card (not in waterfall rows),
		// so it proves both that the card opened and that we hovered the right
		// (error) span — the bar was targeted by id via the span→rect map.
		await expect(traces.hoverCard.field('status')).toHaveText(/status\s*error/);
		await expect(traces.hoverCard.field('start')).toHaveText(/start\s*[\d.]+ ms/);
		await expect(traces.hoverCard.field('duration')).toHaveText(
			/duration\s*[\d.]+/,
		);
	});

	test('TC-02 clicking a bar selects the span, opens the drawer, and syncs the waterfall row', async ({
		authedPage: page,
		traces,
	}) => {
		await traces.flame.click(trace.landmarks.db);

		// selection is reflected in the shared URL state...
		await expect(page).toHaveURL(new RegExp(`spanId=${trace.landmarks.db}`));
		// ...the drawer opens (Overview tab is drawer-only)...
		await expect(traces.span.overviewTab()).toBeVisible();
		// ...and the same span's waterfall row is present (views share selection).
		await expect(traces.span.row(trace.landmarks.db)).toBeVisible();
	});

	test('TC-03 deep-linking a deeply-nested span scrolls it into view on the flamegraph', async ({
		traces,
	}) => {
		// Open pre-pointed at a deep (level ~34) span; useScrollToSpan should
		// center it, so its bar becomes drawn and inside the viewport container.
		await traces.goto(
			`/trace/${trace.traceId}?spanId=${trace.landmarks.deepLeaf}`,
			`cell-0-${trace.landmarks.deepLeaf}`,
		);

		await expect
			.poll(() => traces.flame.isInView(trace.landmarks.deepLeaf))
			.toBe(true);
	});

	test('TC-04 changing colour-by recolors the flamegraph bars', async ({
		traces,
	}) => {
		// colour-by persists per-user, so set an explicit baseline rather than
		// assuming the default. Root's color under service.name:
		await traces.changeColourBy('service.name');
		const colorByService = await traces.flame.color(trace.landmarks.root);
		expect(colorByService).not.toBeNull();

		// Switch to host.name → root groups by a different value → new color.
		await traces.changeColourBy('host.name');
		await expect
			.poll(() => traces.flame.color(trace.landmarks.root))
			.not.toBe(colorByService);
	});
});
