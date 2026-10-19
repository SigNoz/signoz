import {
	expect,
	servicePipeline,
	sideService,
	test,
	type LogsSeed,
} from '../../drivers/logs';

// Pipelines are one org-wide list that every save replaces, so this is the only
// spec that touches them, and it runs serially.
test.describe.configure({ mode: 'serial' });

// The backend stores the alias (the name without spaces) as varchar(20).
const pipelineName = (seed: LogsSeed, tag: string): string =>
	`pl-${tag}-${seed.service.slice(-6)}`;

test.describe('Logs Pipelines', () => {
	test.afterEach(async ({ pipelines }) => {
		await pipelines.reset();
	});

	test('TC-01 the pipelines page loads empty, then lists a seeded pipeline', async ({
		logsSeed,
		pipelines,
		noise,
	}) => {
		await pipelines.reset();
		await pipelines.goto();
		await expect(pipelines.emptyState()).toBeVisible();
		await expect(pipelines.newPipelineButton()).toBeVisible();

		const pipeline = servicePipeline(
			pipelineName(logsSeed, 'tc01'),
			logsSeed.service,
		);
		await pipelines.seed([pipeline]);
		await pipelines.goto();

		await expect(pipelines.row(pipeline.name)).toBeVisible();
		await expect(pipelines.row(pipeline.name)).toContainText(logsSeed.service);
		await expect(pipelines.editModeButton()).toBeVisible();
		await pipelines.openChangeHistory();
		await expect(pipelines.changeHistoryRows().first()).toBeVisible();
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 a pipeline built in the UI persists after a reload', async ({
		logsSeed,
		pipelines,
	}) => {
		const name = pipelineName(logsSeed, 'tc02');
		await pipelines.reset();
		await pipelines.goto();

		await pipelines.createThroughUi({
			name,
			filter: `service.name = ${logsSeed.service}`,
			processor: {
				type: 'Add',
				name: 'tag',
				field: 'attributes.e2e_pipeline',
				value: 'yes',
			},
		});

		await pipelines.goto();
		await expect(pipelines.row(name)).toBeVisible();
		await pipelines.expand(name);
		await expect(pipelines.row('tag')).toBeVisible();
		const saved = await pipelines.latest();
		expect(saved.map((p) => p.name)).toEqual([name]);
		expect(saved[0]?.config[0]?.type).toBe('add');
	});

	test('TC-03 renaming a pipeline persists', async ({ logsSeed, pipelines }) => {
		const pipeline = servicePipeline(
			pipelineName(logsSeed, 'tc03'),
			logsSeed.service,
		);
		const renamed = `${pipeline.name}-v2`;
		await pipelines.seed([pipeline]);
		await pipelines.goto();

		await pipelines.rename(pipeline.name, renamed);

		await pipelines.goto();
		await expect(pipelines.row(renamed)).toBeVisible();
		await expect(pipelines.row(pipeline.name)).toHaveCount(0);
		expect((await pipelines.latest()).map((p) => p.name)).toEqual([renamed]);
	});

	test('TC-04 deleting a pipeline persists', async ({ logsSeed, pipelines }) => {
		const first = servicePipeline(
			pipelineName(logsSeed, 'tc04-a'),
			logsSeed.service,
			1,
		);
		const second = servicePipeline(
			pipelineName(logsSeed, 'tc04-b'),
			logsSeed.service,
			2,
		);
		await pipelines.seed([first, second]);
		await pipelines.goto();

		await pipelines.remove(first.name);

		await pipelines.goto();
		await expect(pipelines.row(first.name)).toHaveCount(0);
		await expect(pipelines.row(second.name)).toBeVisible();
		expect((await pipelines.latest()).map((p) => p.name)).toEqual([second.name]);
	});

	test('TC-05 the preview simulates the pipeline against seeded logs', async ({
		logs,
		logsSeed,
		pipelines,
	}) => {
		// Fresh rows of their own: the preview samples the last hour only.
		const service = sideService(logsSeed, `pl-${Date.now()}`);
		const sample = `${service} sample`;
		await logs.seedRow(service, sample, -30_000);
		const pipeline = servicePipeline(pipelineName(logsSeed, 'tc05'), service);
		await pipelines.seed([pipeline]);
		await pipelines.goto();

		await pipelines.openPreviewUntil(pipeline.name, sample);
		await pipelines.simulate();

		await expect(pipelines.previewOutput().first()).toContainText(sample);
		await pipelines.expandFirstOutput();
		await expect(pipelines.outputDetail()).toContainText('e2e_pipeline');
	});
});
