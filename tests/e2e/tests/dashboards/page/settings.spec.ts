import {
	BAR_VALUES,
	BAR_VARIABLES as V,
	type Dashboards,
	emptyDashboard,
	expect,
	test,
	variablesBarDashboard,
} from '../../../drivers/dashboard-settings';

// Scope: the Configure drawer — Overview, Variables and Publish tabs.

function savedNames(
	dashboards: Dashboards,
	id: string,
): () => Promise<string[]> {
	return async () =>
		(await dashboards.get(id)).spec.variables.map(
			(variable) => variable.spec.name,
		);
}

test.describe('Dashboards — settings drawer', () => {
	test('TC-01 Configure opens on Overview with every tab', async ({
		dashboards,
		settings,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();

		await expect(settings.heading()).toBeVisible();
		for (const tab of ['Overview', 'Variables', 'Publish'] as const) {
			await expect(settings.tab(tab)).toBeVisible();
		}
		await expect(settings.tab('Overview')).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await expect(settings.overview.name()).toBeVisible();

		await settings.close();
	});

	test('TC-02 name, description and tag save and survive a reload', async ({
		dashboards,
		settings,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());
		const name = `e2e-configured-${Date.now()}`;

		await settings.open();
		await settings.overview.name().fill(name);
		await settings.overview.description().fill('Configured by e2e');
		await settings.overview.addTag('team:e2e');
		await expect(settings.overview.unsaved()).toHaveText('3 unsaved changes');
		await settings.overview.save().click();
		await expect(settings.overview.unsaved()).toBeHidden();
		await settings.close();

		await dashboards.reload();
		await expect(dashboards.title()).toHaveText(name);
		const saved = await dashboards.get(id);
		expect(saved.spec.display.description).toBe('Configured by e2e');
		expect(saved.tags).toContainEqual({ key: 'team', value: 'e2e' });
	});

	test('TC-03 Discard reverts unsaved Overview changes', async ({
		dashboards,
		settings,
	}) => {
		const dashboard = variablesBarDashboard();
		await dashboards.seedAndOpen(dashboard);
		await settings.open();
		const original = dashboard.spec.display.name;
		await expect(settings.overview.name()).toHaveValue(original);

		await settings.overview.name().fill('Temporary name');
		await settings.overview.discard().click();

		await expect(settings.overview.name()).toHaveValue(original);
		await expect(settings.overview.save()).toBeHidden();
	});

	test('TC-04 the Variables tab lists every variable', async ({
		dashboards,
		settings,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();
		await settings.openTab('Variables');

		for (const name of Object.values(V)) {
			await expect(settings.variables.row(name)).toBeVisible();
		}
	});

	test('TC-05 an added textbox variable joins the bar and takes a value', async ({
		dashboards,
		settings,
		variablesBar,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());
		const name = 'tb_added';

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.add().click();
		await settings.form.name().fill(name);
		await settings.form.type('textbox').click();
		await expect(settings.form.save()).toBeEnabled();
		await settings.form.save().click();
		await expect(settings.variables.row(name)).toBeVisible();
		await settings.close();
		// The save is optimistic, so the row alone does not prove the PATCH.
		await expect.poll(savedNames(dashboards, id)).toContain(name);

		await variablesBar.expand();
		await expect(variablesBar.label(name)).toBeVisible();
		await variablesBar.type(name, 'test-value');
		await expect(variablesBar.textbox(name)).toHaveValue('test-value');
	});

	test('TC-06 an added custom variable joins the list and the bar', async ({
		dashboards,
		settings,
		variablesBar,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());
		const name = 'cu_added';

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.add().click();
		await settings.form.name().fill(name);
		await settings.form.type('custom').click();
		await settings.form.customValues().fill('east,west');
		await settings.form.save().click();
		await expect(settings.variables.row(name)).toBeVisible();
		await settings.close();
		await expect.poll(savedNames(dashboards, id)).toContain(name);

		await variablesBar.expand();
		await expect(variablesBar.select(name)).toContainText('east');
	});

	test('TC-07 the Query type renders the query editor', async ({
		dashboards,
		settings,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.add().click();
		await settings.form.name().fill('query_added');
		await settings.form.type('query').click();

		await expect(settings.form.queryEditor()).toBeVisible();
		await settings.form.discard().click();
		await expect(settings.variables.row('query_added')).toHaveCount(0);
	});

	test('TC-08 Save Variable stays disabled without a name', async ({
		dashboards,
		settings,
	}) => {
		const id = await dashboards.seed(emptyDashboard());
		await dashboards.openEmpty(id);

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.add().click();

		await expect(settings.form.name()).toHaveValue('');
		await expect(settings.form.save()).toBeDisabled();
	});

	test('TC-09 the Publish tab offers to publish a private dashboard', async ({
		dashboards,
		settings,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();
		await settings.openTab('Publish');

		await expect(
			settings.publish.text('This dashboard is private'),
		).toBeVisible();
		await expect(settings.publish.timeRange()).toBeVisible();
		await expect(
			settings.publish.text(
				"Dashboard variables aren't supported on public links.",
			),
		).toBeVisible();
		await expect(settings.publish.publish()).toBeVisible();
	});

	test('TC-10 renaming a variable renames it in the bar', async ({
		dashboards,
		settings,
		variablesBar,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());
		const renamed = `${V.textEnv}_renamed`;

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.edit(V.textEnv);
		await expect(settings.form.name()).toHaveValue(V.textEnv);
		await settings.form.name().fill(renamed);
		await settings.form.save().click();
		await expect(settings.variables.row(renamed)).toBeVisible();
		await settings.close();

		await expect(variablesBar.label(renamed)).toBeVisible();
		await expect(variablesBar.label(V.textEnv)).toHaveCount(0);
		await expect.poll(savedNames(dashboards, id)).toContain(renamed);
	});

	test('TC-11 switching a custom variable to Query swaps the form', async ({
		dashboards,
		settings,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.edit(V.single);
		await expect(settings.form.customValues()).toBeVisible();
		await settings.form.type('query').click();

		await expect(settings.form.queryEditor()).toBeVisible();
		await expect(settings.form.customValues()).toHaveCount(0);
		await settings.form.discard().click();
	});

	test('TC-12 a textbox default saved in Configure survives a reload', async ({
		dashboards,
		settings,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.edit(V.textService);
		await expect(settings.form.textDefault()).toHaveValue(BAR_VALUES.textService);
		await settings.form.textDefault().fill('new-default');
		await settings.form.save().click();
		await expect(settings.variables.row(V.textService)).toBeVisible();
		await expect
			.poll(async () => {
				const saved = (await dashboards.get(id)).spec.variables.find(
					(v) => v.spec.name === V.textService,
				);
				return saved?.kind === 'TextVariable' ? saved.spec.value : undefined;
			})
			.toBe('new-default');
		await settings.close();

		await dashboards.reload();
		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.edit(V.textService);
		await expect(settings.form.textDefault()).toHaveValue('new-default');
	});

	test('TC-13 a deleted variable leaves the bar, its siblings stay', async ({
		dashboards,
		settings,
		variablesBar,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());
		await expect(variablesBar.label(V.textEnv)).toBeVisible();

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.remove(V.textEnv);
		await settings.close();

		await expect(variablesBar.label(V.textEnv)).toHaveCount(0);
		await expect(variablesBar.label(V.textService)).toBeVisible();
		// The bar drops the label before the PATCH lands.
		await expect.poll(savedNames(dashboards, id)).not.toContain(V.textEnv);
	});

	test('TC-14 a duplicate name keeps Save Variable disabled', async ({
		dashboards,
		settings,
	}) => {
		await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.add().click();
		await settings.form.name().fill(V.textEnv);
		await settings.form.type('textbox').click();

		await expect(
			settings.form.error('Variable name already exists'),
		).toBeVisible();
		await expect(settings.form.save()).toBeDisabled();
	});

	test('TC-15 discarding an edit persists nothing', async ({
		dashboards,
		settings,
		variablesBar,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.edit(V.textEnv);
		await settings.form.name().fill('SHOULD_NOT_PERSIST');
		await settings.form.discard().click();
		await expect(settings.variables.row(V.textEnv)).toBeVisible();
		await settings.close();

		await expect(variablesBar.label(V.textEnv)).toBeVisible();
		await expect(variablesBar.label('SHOULD_NOT_PERSIST')).toHaveCount(0);
		const saved = await dashboards.get(id);
		expect(saved.spec.variables.map((v) => v.spec.name)).not.toContain(
			'SHOULD_NOT_PERSIST',
		);

		await settings.open();
		await settings.openTab('Variables');
		await expect(settings.variables.row(V.textEnv)).toBeVisible();
	});

	test('TC-16 dragging a variable reorders the list, the bar and the spec', async ({
		dashboards,
		settings,
		variablesBar,
	}) => {
		const id = await dashboards.seedAndOpen(variablesBarDashboard());
		const before = await savedNames(dashboards, id)();
		const [first, second] = before;

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.reorder(second, first);

		const after = [second, first, ...before.slice(2)];
		await expect.poll(savedNames(dashboards, id)).toEqual(after);
		await settings.close();
		expect(await variablesBar.names()).toEqual(after.map((name) => `$${name}`));
	});

	test('TC-17 a dynamic variable created in Configure lists the field values', async ({
		dashboards,
		settings,
		variablesBar,
	}) => {
		// Unique per test: seeded rows outlive it.
		const label = `e2e_created_${Date.now()}_${process.pid}`;
		await variablesBar.seedMetricLabel(label, ['ns-one', 'ns-two']);
		const id = await dashboards.seed(emptyDashboard());
		await dashboards.openEmpty(id);
		const name = 'd_created';

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.add().click();
		await settings.form.name().fill(name);
		await settings.form.type('dynamic').click();
		await settings.form.dynamicField(label);
		await settings.form.save().click();
		await expect(settings.variables.row(name)).toBeVisible();
		await settings.close();

		await expect
			.poll(async () => {
				const saved = (await dashboards.get(id)).spec.variables.find(
					(variable) => variable.spec.name === name,
				);
				return saved?.kind === 'ListVariable' ? saved.spec.plugin : undefined;
			})
			.toMatchObject({ kind: 'signoz/DynamicVariable', spec: { name: label } });
		await variablesBar.open(name);
		await expect(variablesBar.option('ns-one')).toBeVisible();
		await expect(variablesBar.option('ns-two')).toBeVisible();
	});

	test.fixme('TC-18 the bar picks up a changed textbox default', async ({
		dashboards,
		settings,
		variablesBar,
	}) => {
		// Bug: the bar's selection, seeded from the old default on first open, is
		// persisted locally and outranks the new default on every later visit.
		await dashboards.seedAndOpen(variablesBarDashboard());

		await settings.open();
		await settings.openTab('Variables');
		await settings.variables.edit(V.textService);
		await settings.form.textDefault().fill('new-default');
		await settings.form.save().click();
		await settings.close();
		await dashboards.reload();

		await expect(variablesBar.textbox(V.textService)).toHaveValue('new-default');
	});
});
