import {
	expect,
	loadLargeTrace,
	seedTracesViaSeeder,
	test,
	TRACE_PREFERENCE,
} from '../../drivers/traces';

// One shared trace for the whole file, seeded once. Unique ids per run keep this
// isolated from other parallel specs; the global teardown clears the traces signal.
const trace = loadLargeTrace();

test.describe('Trace details — span details drawer', () => {
	test.beforeAll(async ({ playwright }) => {
		// Seed once via a disposable request context — no auth needed (direct
		// seeder call), and cheaper than spinning up a full browser page.
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
	});

	test.beforeEach(async ({ traces }) => {
		// open the trace, reloading until the waterfall renders (seed→query lag)
		await traces.goto(
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);
	});

	test('TC-01 the floating drawer can be dragged', async ({
		authedPage: page,
		traces,
	}) => {
		await traces.span.open(trace.landmarks.root);
		await traces.span.dock('dialog');

		const handle = traces.span.dragHandle();
		await expect(handle).toBeVisible();

		const zero = { x: 0, y: 0, width: 0, height: 0 };
		const before = (await handle.boundingBox()) ?? zero;
		// Drag from the left of the header (title area) to avoid the action buttons.
		const startX = before.x + 30;
		const startY = before.y + before.height / 2;
		await page.mouse.move(startX, startY);
		await page.mouse.down();
		await page.mouse.move(startX - 120, startY + 80, { steps: 8 });
		await page.mouse.up();

		await expect
			.poll(async () => Math.round(((await handle.boundingBox()) ?? before).x))
			.toBeLessThan(Math.round(before.x));
	});

	test('TC-02 a dock-mode change persists and is restored on reload', async ({
		authedPage: page,
		traces,
	}) => {
		// §0 prefs-boot, UI-first: switch to floating via the dock-mode UI (which
		// persists the variant), then reload and confirm it's restored — the drawer
		// boots floating, not the docked-right default.
		await traces.span.open(trace.landmarks.root);
		await traces.span.dock('dialog');
		await expect(traces.span.dragHandle()).toBeVisible();

		await page.reload();
		await traces.span.open(trace.landmarks.root);

		await expect(traces.span.dragHandle()).toBeVisible();
	});

	// Pins a leaf value: pinning an object node is a known, separately tracked
	// regression in the PrettyView nested-node menu.
	test('TC-03 a leaf attribute pinned from the docked panel moves into a pinned section', async ({
		traces,
	}) => {
		test.setTimeout(60_000);
		try {
			await traces.span.open(trace.landmarks.db);
			await traces.span.dock('docked');
			await expect(traces.span.dockOption('docked')).toHaveAttribute(
				'aria-pressed',
				'true',
			);

			await traces.span.openFieldMenu('db.system');
			await traces.span.menuItem('Pin field').click();

			await expect(traces.span.panelTitle()).toBeVisible();
			await expect(traces.span.pinnedSection()).toBeVisible();
			await expect(traces.span.pinnedField('attributes.db.system')).toBeVisible();

			await traces.span.openPinnedFieldMenu('attributes.db.system');
			await traces.span.menuItem('Unpin field').click();

			await expect(traces.span.pinnedSection()).toHaveCount(0);
			await expect(traces.span.panelTitle()).toBeVisible();
		} finally {
			await traces.prefs.set(TRACE_PREFERENCE.PINNED_ATTRIBUTES, []);
		}
	});
});
