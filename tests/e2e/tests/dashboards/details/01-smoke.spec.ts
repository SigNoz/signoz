import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import { authToken } from '../../../helpers/dashboards';
import {
	createDashboardV2ViaApi,
	dashboardV2Path,
	deleteDashboardV2ViaApi,
	pickVariableValues,
	readVariableSelection,
	variablePill,
	variablesBar,
	variableTextInput,
	WIDE_VIEWPORT,
} from '../../../helpers/dashboards-v2';
import customVariables from '../../../testdata/variables-dashboard-v2.json';

// The foundation the other dashboards specs build on: seeding a V2 spec through the
// v2 API, opening it, and driving the variables bar. Everything here is deterministic
// — custom and text variables need no telemetry, so this spec cannot go red because
// of what the stack happens to hold.

test.use({ viewport: WIDE_VIEWPORT });

const seedIds = new Set<string>();
let dashboardId = '';

// Per worker: `beforeAll` runs once in each, and the v2 API rejects a duplicate name.
const SUITE_TITLE = `detail-smoke-suite-${process.env.TEST_WORKER_INDEX ?? '0'}`;

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		dashboardId = await createDashboardV2ViaApi(
			page,
			SUITE_TITLE,
			customVariables.spec,
		);
		seedIds.add(dashboardId);
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) {
		return;
	}
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of seedIds) {
			await deleteDashboardV2ViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Dashboard detail — V2 foundation', () => {
	test('TC-01 a seeded V2 dashboard opens with its title and variables bar', async ({
		authedPage: page,
	}) => {
		await page.goto(dashboardV2Path(dashboardId));

		await expect(page.getByTestId('dashboard-title')).toContainText(SUITE_TITLE);
		await expect(variablesBar(page)).toBeVisible();
		for (const name of ['tb_env', 'cu_service', 'cu_region']) {
			await expect(variablePill(page, name)).toBeVisible();
		}
	});

	test('TC-02 a text variable renders the value it was seeded with', async ({
		authedPage: page,
	}) => {
		await page.goto(dashboardV2Path(dashboardId));

		await expect(variableTextInput(page, 'tb_env')).toHaveValue('prod');
	});

	test('TC-03 an ALL-enabled multi-select reads ALL until a value is picked', async ({
		authedPage: page,
	}) => {
		await page.goto(dashboardV2Path(dashboardId));

		// Seeded with allowAllValue and no default, so it resolves to ALL.
		await expect
			.poll(() => readVariableSelection(page, 'cu_service'))
			.toBe('ALL');

		// A multi-select commits when the dropdown closes, not per toggle.
		await pickVariableValues(page, 'cu_service', ['checkout']);

		await expect
			.poll(() => readVariableSelection(page, 'cu_service'))
			.toContain('checkout');
	});

	test('TC-04 a single-select renders its configured default', async ({
		authedPage: page,
	}) => {
		await page.goto(dashboardV2Path(dashboardId));

		await expect
			.poll(() => readVariableSelection(page, 'cu_region'))
			.toContain('eu-west');
	});
});
