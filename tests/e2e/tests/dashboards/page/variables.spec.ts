import {
	BAR_VALUES,
	BAR_VARIABLES as V,
	EMPTY_VARIABLE_QUERY,
	GOLDEN,
	PanelKind,
	textVariable,
	VARIABLE_NAMES,
	VARIABLE_PANEL_ID,
	variablesDashboard,
	expect,
	QUERY_CHILD_SUFFIX,
	test,
	variablesBarDashboard,
} from '../../../drivers/dashboard-settings';

// Scope: the runtime variables bar. Selections live in the dashboard's local
// store, not the URL: `?variables=` is read once from a share link and dropped,
// and the share dialog's "Include variables" is what serializes them again.

const ALL = '__ALL__';
const ORDER = Object.values(V);

test.describe('Dashboards — variables bar', () => {
	test('TC-01 the bar renders a control for every variable type', async ({
		dashboards,
		variablesBar,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());
		await variablesBar.expand();

		for (const name of ORDER) {
			await expect(variablesBar.label(name)).toBeVisible();
		}
		await expect(variablesBar.textbox(V.textEnv)).toHaveValue(BAR_VALUES.textEnv);
		await expect(variablesBar.textbox(V.textService)).toHaveValue(
			BAR_VALUES.textService,
		);
		for (const name of [V.single, V.all, V.multi, V.queryParent, V.dynamic]) {
			await expect(variablesBar.select(name)).toBeVisible();
		}
	});

	test('TC-02 picking a single value selects it and survives a reload', async ({
		dashboards,
		variablesBar,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());
		await variablesBar.expand();

		await variablesBar.pick(V.single, 'mq-kafka');
		await expect(variablesBar.select(V.single)).toContainText('mq-kafka');

		await variablesBar.open(V.single);
		await expect(variablesBar.option('mq-kafka')).toHaveAttribute(
			'aria-selected',
			'true',
		);

		await dashboards.reload();
		await expect(variablesBar.select(V.single)).toContainText('mq-kafka');
	});

	test('TC-03 a multi-select renders chips and shares its values as an array', async ({
		dashboards,
		variablesBar,
	}) => {
		const id = await dashboards.seed(variablesBarDashboard());
		await variablesBar.openWith(id, { [V.multi]: ['adservice', 'frontend'] });
		await variablesBar.expand();

		await expect(variablesBar.chip(V.multi, 'adservice')).toBeVisible();
		await variablesBar.open(V.multi);
		await expect(variablesBar.option('adservice')).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await expect(variablesBar.option('frontend')).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await variablesBar.close(V.multi);

		expect((await variablesBar.shared())[V.multi]).toEqual([
			'adservice',
			'frontend',
		]);
	});

	test('TC-04 removing a chip drops that value once the dropdown closes', async ({
		dashboards,
		variablesBar,
	}) => {
		const id = await dashboards.seed(variablesBarDashboard());
		await variablesBar.openWith(id, { [V.multi]: ['adservice', 'frontend'] });
		await variablesBar.expand();

		await variablesBar.chip(V.multi, 'adservice').click();
		await variablesBar.close(V.multi);

		await expect(variablesBar.chip(V.multi, 'adservice')).toHaveCount(0);
		await expect(variablesBar.chip(V.multi, 'frontend')).toBeVisible();
		expect((await variablesBar.shared())[V.multi]).toEqual(['frontend']);
	});

	test('TC-05 the ALL option selects every value', async ({
		dashboards,
		variablesBar,
	}) => {
		const id = await dashboards.seed(variablesBarDashboard());
		await variablesBar.openWith(id, { [V.all]: ['otel-demo'] });
		await variablesBar.expand();
		await expect(variablesBar.variable(V.all)).toContainText('otel-demo');

		await variablesBar.open(V.all);
		await variablesBar.option('ALL').click();
		for (const value of ['ALL', ...BAR_VALUES.envs]) {
			await expect(variablesBar.option(value)).toHaveAttribute(
				'aria-selected',
				'true',
			);
		}
		await variablesBar.close(V.all);

		await expect(variablesBar.variable(V.all)).toContainText('ALL');
		expect((await variablesBar.shared())[V.all]).toBe(ALL);
	});

	test('TC-06 a textbox commits its value on Enter', async ({
		dashboards,
		variablesBar,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());

		await variablesBar.type(V.textEnv, 'production');

		// Enter commits by blurring, so the field must lose focus without a click.
		await expect(variablesBar.textbox(V.textEnv)).not.toBeFocused();
		await expect(variablesBar.textbox(V.textEnv)).toHaveValue('production');
		expect((await variablesBar.shared())[V.textEnv]).toBe('production');
	});

	test('TC-07 a child query variable refetches after its parent changes', async ({
		dashboards,
		variablesBar,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());
		await variablesBar.expand();
		const [first, second] = BAR_VALUES.queryEnvs;
		await expect(variablesBar.variable(V.queryChild)).toContainText(
			`${first}${QUERY_CHILD_SUFFIX}`,
		);

		await variablesBar.pick(V.queryParent, second);

		await expect(variablesBar.variable(V.queryChild)).toContainText(
			`${second}${QUERY_CHILD_SUFFIX}`,
		);
		await variablesBar.open(V.queryChild);
		await expect(variablesBar.listbox().getByRole('option')).toHaveCount(1);
		await expect(
			variablesBar.option(`${second}${QUERY_CHILD_SUFFIX}`),
		).toBeVisible();
	});

	test('TC-08 a shared link seeds the selection, which outlives the reload', async ({
		dashboards,
		variablesBar,
		authedPage: page,
	}) => {
		const id = await dashboards.seed(variablesBarDashboard());
		await variablesBar.openWith(id, { [V.all]: ['mq-kafka'] });
		await variablesBar.expand();

		await expect(variablesBar.variable(V.all)).toContainText('mq-kafka');
		await expect(page).not.toHaveURL(/variables=/);

		await dashboards.reload();
		await expect(variablesBar.variable(V.all)).toContainText('mq-kafka');
	});

	test('TC-09 ALL to one value and back to ALL', async ({
		dashboards,
		variablesBar,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());
		await variablesBar.expand();
		await expect(variablesBar.variable(V.all)).toContainText('ALL');

		await variablesBar.open(V.all);
		await variablesBar.option('ALL').click();
		await variablesBar.option('mq-kafka').click();
		await variablesBar.close(V.all);
		await expect(variablesBar.variable(V.all)).toContainText('mq-kafka');

		await variablesBar.toggle(V.all, ['ALL']);
		await expect(variablesBar.variable(V.all)).toContainText('ALL');
		expect((await variablesBar.shared())[V.all]).toBe(ALL);
	});

	test('TC-10 changes to two variables are both kept', async ({
		dashboards,
		variablesBar,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());
		await variablesBar.expand();

		await variablesBar.pick(V.single, 'production');
		await variablesBar.toggle(V.multi, ['checkout']);

		const shared = await variablesBar.shared();
		expect(shared[V.single]).toBe('production');
		expect(shared[V.multi]).toEqual(['adservice', 'checkout']);
	});

	test('TC-11 leaving the dashboard and coming back keeps the selection', async ({
		dashboards,
		variablesBar,
		panels,
		authedPage: page,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());
		await variablesBar.expand();
		await variablesBar.pick(V.single, 'mq-kafka');

		await dashboards.visit('/dashboard');
		await expect(page).toHaveURL(/\/dashboard(\?|$)/);
		await panels.back();

		await expect(page).toHaveURL(new RegExp(`/dashboard/${id}`));
		await expect(variablesBar.select(V.single)).toContainText('mq-kafka');
	});

	test('TC-12 a query variable with no rows offers no options', async ({
		dashboards,
		variablesBar,
	}) => {
		const fetched = variablesBar.optionsFetched(EMPTY_VARIABLE_QUERY);
		await dashboards.seedAndOpen(variablesBarDashboard());
		await fetched;
		await variablesBar.expand();

		await variablesBar.open(V.queryEmpty);

		await expect(variablesBar.listbox().getByRole('option')).toHaveCount(0);
		await expect(variablesBar.select(V.queryEmpty)).toContainText('Select value');
	});

	test('TC-13 a dynamic variable resolves values from seeded telemetry', async ({
		dashboards,
		variablesBar,
	}) => {
		// Unique per test: seeded rows outlive it, and the list is virtualized.
		const label = `e2e_namespace_${Date.now()}_${process.pid}`;
		const namespaces = ['ns-alpha', 'ns-beta'];
		await variablesBar.seedMetricLabel(label, namespaces);
		await dashboards.seedAndOpen(
			variablesBarDashboard({ dynamicAttribute: label }),
		);
		await variablesBar.expand();

		await variablesBar.open(V.dynamic);

		for (const namespace of namespaces) {
			await expect(variablesBar.option(namespace)).toBeVisible();
		}
	});

	test('TC-14 the bar follows the spec order', async ({
		dashboards,
		variablesBar,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());

		expect(await variablesBar.names()).toEqual(ORDER.map((name) => `$${name}`));
	});

	test('TC-15 picking a value refetches the panel that uses it', async ({
		dashboards,
		panels,
		queryRange,
		variablesBar,
	}) => {
		await dashboards.seedAndOpen(variablesDashboard());
		const target = panels.panel(VARIABLE_PANEL_ID);
		await expect(
			target.renderer(PanelKind.TimeSeries).or(target.noData()).first(),
		).toBeVisible();
		const picked = GOLDEN.services[1];

		const refetch = queryRange.nextRequest();
		await variablesBar.pick(VARIABLE_NAMES.custom, picked);

		const body = (await refetch).postDataJSON() as {
			variables?: Record<string, { value?: unknown }>;
		};
		expect(body.variables?.[VARIABLE_NAMES.custom]?.value).toBe(picked);
	});

	test('TC-16 a variable description shows in its info tooltip', async ({
		dashboards,
		variablesBar,
	}) => {
		const documented = textVariable('tb_documented', 'x');
		documented.spec.display.description = 'Deployment environment';
		const fixture = variablesBarDashboard();
		fixture.spec.variables.push(documented);
		await dashboards.seedAndOpen(fixture);
		await variablesBar.expand();

		const tooltip = await variablesBar.info('tb_documented');

		await expect(tooltip).toContainText('Deployment environment');
	});

	test.fixme('TC-17 a first visit through a shared link applies its values', async ({
		dashboards,
		variablesBar,
	}) => {
		// Bug: the selectors' first auto-select batch (computed before the seed
		// commits) is flushed over the seeded link values, so they are lost.
		const id = await dashboards.seed(variablesBarDashboard());
		await variablesBar.firstVisitWith(id, {
			[V.multi]: ['adservice', 'frontend'],
		});

		expect((await variablesBar.shared())[V.multi]).toEqual([
			'adservice',
			'frontend',
		]);
	});
});
