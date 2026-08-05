import { expect, test } from '../../../../fixtures/dashboards';
import { PanelKind } from '../../../../helpers/dashboard-v2-spec';
import {
	createDashboardV2ViaApi,
	getDashboardV2ViaApi,
	gotoEmptyDashboardV2,
} from '../../../../helpers/dashboards-v2';
import {
	capturePatchOps,
	editor,
	savePanel,
} from '../../../../helpers/panel-editor-v2';
import { panelRoot } from '../../../../helpers/panels-v2';
import {
	emptyDashboard,
	singlePanelDashboard,
	compactDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: creating a panel — the modal's two branches, the route it hands off
// to, and the JSON-Patch a save emits.
//
// The subtlety: one section means a tile click creates immediately; several
// means select-then-confirm. Backwards, and the user is stranded on a dialog.

const ALL_TILES: [PanelKind, string][] = [
	[PanelKind.TimeSeries, 'Time Series'],
	[PanelKind.Number, 'Number'],
	[PanelKind.Table, 'Table'],
	[PanelKind.BarChart, 'Bar Chart'],
	[PanelKind.PieChart, 'Pie Chart'],
	[PanelKind.Histogram, 'Histogram'],
	[PanelKind.List, 'List'],
];

test.describe('Dashboards V2 — panel creation', () => {
	test('TC-01 the New Panel modal lists every panel kind', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seed(emptyDashboard());
		await gotoEmptyDashboardV2(page, id);

		await page.getByTestId('add-panel').click();
		const dialog = page.getByRole('dialog', { name: 'New Panel' });
		await expect(dialog).toBeVisible();

		for (const [kind, label] of ALL_TILES) {
			const tile = page.getByTestId(`panel-type-${kind}`);
			await expect(tile).toBeVisible();
			await expect(tile).toContainText(label);
		}
	});

	test('TC-02 with one section a tile click creates immediately', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());

		await page.getByTestId('add-panel-header').click();
		await expect(page.getByRole('dialog', { name: 'New Panel' })).toBeVisible();

		// One section: no footer, no picker, no confirm.
		await expect(page.getByTestId('panel-type-confirm')).toHaveCount(0);

		await page.getByTestId(`panel-type-${PanelKind.Table}`).click();
		await page.waitForURL(/\/panel\/new\?/);

		const params = new URL(page.url()).searchParams;
		expect(params.get('panelKind')).toBe(PanelKind.Table);
		await expect(editor.root(page)).toBeVisible();
	});

	test('TC-03 with several sections the modal requires an explicit confirm', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await page.getByTestId('add-panel-header').click();
		await expect(page.getByRole('dialog', { name: 'New Panel' })).toBeVisible();

		const confirm = page.getByTestId('panel-type-confirm');
		await expect(confirm).toBeVisible();

		await expect(confirm).toBeDisabled();
		await expect(page.getByTestId('panel-section-select')).toBeVisible();

		await page.getByTestId(`panel-type-${PanelKind.Number}`).click();
		await expect(confirm).toBeEnabled();
		await confirm.click();

		await page.waitForURL(/\/panel\/new\?/);
		expect(new URL(page.url()).searchParams.get('panelKind')).toBe(
			PanelKind.Number,
		);
	});

	test('TC-04 the chosen section becomes the new panel layoutIndex', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await page.getByTestId('add-panel-header').click();
		await page.getByTestId(`panel-type-${PanelKind.Number}`).click();
		await page.getByTestId('panel-section-select').click();
		await page.getByTestId('panel-section-option-1').click();
		await page.getByTestId('panel-type-confirm').click();

		await page.waitForURL(/\/panel\/new\?/);
		expect(new URL(page.url()).searchParams.get('layoutIndex')).toBe('1');
	});

	test('TC-05 creating from an empty section targets that section', async ({
		authedPage: page,
		dashboards,
	}) => {
		const dashboard = compactDashboard();

		dashboard.spec.layouts.push({
			kind: 'Grid',
			spec: { display: { title: 'Empty' }, items: [] },
		});
		await dashboards.seedAndOpen(dashboard);

		const sectionCta = page.locator('[data-testid^="section-add-panel-"]');
		await sectionCta.first().scrollIntoViewIfNeeded();
		await sectionCta.first().click();

		await expect(page.getByRole('dialog', { name: 'New Panel' })).toBeVisible();
		await page.getByTestId(`panel-type-${PanelKind.TimeSeries}`).click();
		await page.getByTestId('panel-type-confirm').click();
		await page.waitForURL(/\/panel\/new\?/);
		expect(new URL(page.url()).searchParams.get('layoutIndex')).toBe('2');
	});

	test('TC-06 saving a new panel emits add-panel and add-layout-item ops', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());

		const patches = capturePatchOps(page);

		await page.getByTestId('add-panel-header').click();
		// List: its seeded query passes validation (see TC-07).
		await page.getByTestId(`panel-type-${PanelKind.List}`).click();
		await expect(editor.root(page)).toBeVisible();

		await editor.title(page).fill('Created from the modal');
		await savePanel(page);

		// Targeted adds for panel AND grid item — a replace would clobber edits.
		expect(patches.length).toBeGreaterThan(0);
		const ops = patches[patches.length - 1];
		const panelAdd = ops.find((op) => /^\/spec\/panels\/[^/]+$/.test(op.path));
		expect(panelAdd?.op).toBe('add');
		expect(
			ops.some((op) => /^\/spec\/layouts\/\d+\/spec\/items\/-$/.test(op.path)),
		).toBe(true);
	});

	test('TC-07 the created panel lands on the dashboard and persists', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());

		const before = await getDashboardV2ViaApi(page, id);
		const beforeCount = Object.keys(before.spec.panels).length;

		await page.getByTestId('add-panel-header').click();
		// List is the one kind whose seeded query saves as-is (logs `count()`);
		// metrics kinds are rejected until a metric is chosen — see TC-09.
		await page.getByTestId(`panel-type-${PanelKind.List}`).click();
		await expect(editor.root(page)).toBeVisible();
		await editor.title(page).fill('Fresh list panel');
		await savePanel(page);

		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));
		await expect(
			page.getByTestId('panel-title').filter({ hasText: 'Fresh list panel' }),
		).toBeVisible();

		const after = await getDashboardV2ViaApi(page, id);
		expect(Object.keys(after.spec.panels)).toHaveLength(beforeCount + 1);
	});

	test('TC-09 saving a metrics panel with no metric chosen is rejected', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());

		await page.getByTestId('add-panel-header').click();
		await page.getByTestId(`panel-type-${PanelKind.Number}`).click();
		await expect(editor.root(page)).toBeVisible();

		// Metrics kinds seed an empty aggregation, so the editor must stay open and
		// surface the reason rather than dropping the panel.
		const rejected = page.waitForResponse(
			(r) =>
				r.request().method() === 'PATCH' && /\/api\/v2\/dashboards\//.test(r.url()),
		);
		await editor.save(page).click();
		const response = await rejected;
		expect(response.status()).toBe(400);
		expect(await response.text()).toContain('metric name is required');

		await expect(editor.root(page)).toBeVisible();
	});

	test('TC-08 the editor route redirects when panelKind is missing', async ({
		authedPage: page,
	}) => {
		const id = await createDashboardV2ViaApi(page, singlePanelDashboard());

		// No kind to seed, so the page bounces back.
		await page.goto(`/dashboard/${id}/panel/new`);
		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));
		await expect(panelRoot(page, 'solo-panel')).toBeVisible();
	});
});
