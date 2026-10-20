import { expect, test } from '../../drivers/llm-o11y';

// The AI observability explorer: the traces explorer scoped to gen_ai spans.
// Column config, the view switcher and the empty state are covered by jest
// under `container/LLMObservability/Explorer/` and by its Storybook story; here
// a real gen_ai trace has to come back through `builder_ai_query`.

test.describe('LLM traces explorer', () => {
	test('TC-01 the page loads clean and lists a seeded LLM trace', async ({
		llm,
		noise,
	}) => {
		const seed = await llm.seedLlmTrace();

		await llm.gotoExplorer();
		await llm.waitForTraceRow(seed.traceId);

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 opening a trace row reaches trace details', async ({ llm }) => {
		const seed = await llm.seedLlmTrace();

		await llm.gotoExplorer();
		await llm.waitForTraceRow(seed.traceId);
		await llm.openTraceRow(seed);

		await expect(llm.waterfallRow(seed.rootSpanId)).toBeVisible();
	});

	test('TC-03 the quick-filter settings open', async ({ llm }) => {
		await llm.gotoExplorer();
		await llm.openQuickFilterSettings();

		await expect(llm.quickFilterSettings()).toBeVisible();
	});
});
