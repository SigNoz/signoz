import {
	allowFor,
	expect,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	test,
} from '../../drivers/funnels';

test.describe('Trace funnels, steps', () => {
	test('TC-01 configuring two steps validates against seeded traces and shows results', async ({
		funnels,
		funnelSpans,
	}) => {
		allowFor(SEEDED_TEST_BUDGET);
		const { funnel_id: id } = await funnels.seed.create(
			`${funnelSpans.stamp}-config`,
		);
		const { services, spans } = funnelSpans;

		await funnels.goto(id);
		await funnels.setStep(0, services.a, spans.a);
		await funnels.setStep(1, services.b, spans.b);

		await expect(funnels.validStatus()).toHaveText('Valid traces found', {
			timeout: SEEDED_DATA_TIMEOUT,
		});
		await expect(funnels.results()).toContainText('Overall Funnel Metrics', {
			timeout: SEEDED_DATA_TIMEOUT,
		});

		await expect(funnels.slowTraceIdCells().first()).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
		const slow = await funnels.traceIdsIn(funnels.slowTraces());
		expect(slow.length).toBeGreaterThanOrEqual(1);
		for (const traceId of slow) {
			expect(funnelSpans.traceIds).toContain(traceId);
		}
		await expect(funnels.errorTrace(funnelSpans.errorTraceId)).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
	});

	test('TC-02 saving steps persists across reload', async ({
		funnels,
		funnelSpans,
	}) => {
		const { funnel_id: id } = await funnels.seed.create(
			`${funnelSpans.stamp}-save`,
		);
		const { services, spans } = funnelSpans;

		await funnels.goto(id);
		await funnels.setStep(0, services.a, spans.a);
		await funnels.setStep(1, services.b, spans.b);
		await funnels.save();

		const saved = await funnels.seed.get(id);
		expect(
			saved.steps?.map((step) => [step.service_name, step.span_name]),
		).toEqual([
			[services.a, spans.a],
			[services.b, spans.b],
		]);

		// `goto` clears the unsaved-steps key, so the reload reads the server copy.
		await funnels.goto(id);
		await expect(funnels.stepSelect(0, 'service')).toContainText(services.a);
		await expect(funnels.stepSelect(0, 'span')).toContainText(spans.a);
		await expect(funnels.stepSelect(1, 'service')).toContainText(services.b);
		await expect(funnels.stepSelect(1, 'span')).toContainText(spans.b);
		await expect(funnels.saveButton()).toBeDisabled();
	});

	test('TC-03 latency pointer choice persists', async ({
		funnels,
		funnelSpans,
	}) => {
		const { services, spans } = funnelSpans;
		const { funnel_id: id } = await funnels.seed.create(
			`${funnelSpans.stamp}-pointer`,
		);
		await funnels.seed.setSteps(id, [
			{ service: services.a, span: spans.a },
			{ service: services.b, span: spans.b },
		]);

		await funnels.goto(id);
		await expect(funnels.latencyPointer(1)).toContainText('End of span');
		await funnels.setLatencyPointer(1, 'Start of span');
		await funnels.save();

		await funnels.goto(id);
		await expect(funnels.latencyPointer(1)).toContainText('Start of span');
		expect((await funnels.seed.get(id)).steps?.[1].latency_pointer).toBe('start');
	});

	test('TC-04 add a third step and delete it', async ({
		funnels,
		funnelSpans,
	}) => {
		const { services, spans } = funnelSpans;
		const { funnel_id: id } = await funnels.seed.create(
			`${funnelSpans.stamp}-add-step`,
		);
		await funnels.seed.setSteps(id, [
			{ service: services.a, span: spans.a },
			{ service: services.b, span: spans.b },
		]);

		await funnels.goto(id);
		await expect(funnels.stepsCount()).toHaveText('2 steps');
		await funnels.openStepActions(0);
		await expect(funnels.stepDeleteAction()).toBeDisabled();
		// The trigger toggles the popover closed again.
		await funnels.stepActionsTrigger(0).click();

		await funnels.addStep();
		await expect(funnels.stepsCount()).toHaveText('3 steps');
		await expect(funnels.step(2)).toBeVisible();

		await funnels.deleteStep(2);
		await expect(funnels.stepsCount()).toHaveText('2 steps');
		await expect(funnels.step(2)).toHaveCount(0);
	});

	test('TC-05 adding a span to a funnel from trace details', async ({
		funnels,
		funnelSpans,
	}) => {
		allowFor(SEEDED_TEST_BUDGET);
		const { services, spans } = funnelSpans;
		const { funnel_id: id } = await funnels.seed.create(
			`${funnelSpans.stamp}-from-trace`,
		);
		await funnels.seed.setSteps(id, [
			{ service: services.a, span: spans.a },
			{ service: services.b, span: spans.b },
		]);

		const traceId = funnelSpans.traceIds[0];
		const spanId = funnelSpans.rootSpanIds[traceId];
		await funnels.traces.goto(
			`/trace/${traceId}?spanId=${spanId}`,
			`cell-0-${spanId}`,
		);
		await funnels.addSpanModal.open(spanId);
		await funnels.addSpanModal.pickFunnel(id);
		await funnels.addSpanModal.addForNewStep();
		await funnels.addSpanModal.save();

		const steps = (await funnels.seed.get(id)).steps ?? [];
		expect(steps).toHaveLength(3);
		expect([steps[2].service_name, steps[2].span_name]).toEqual([
			services.a,
			spans.a,
		]);
	});
});
