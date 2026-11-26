import { expect, test } from '../../drivers/funnels';

test.describe('Trace funnels, list', () => {
	test('TC-01 funnels list renders and a funnel is created through the modal', async ({
		funnels,
		funnelSpans,
		noise,
	}) => {
		const name = `${funnelSpans.stamp}-new`;
		await funnels.gotoList();
		const id = await funnels.create(name);

		await expect(funnels.title()).toHaveText(name);

		await funnels.gotoList();
		await funnels.search(funnelSpans.stamp);
		await expect(funnels.item(name)).toBeVisible();
		await expect(funnels.item(name)).toHaveAttribute(
			'data-testid',
			`funnel-item-${id}`,
		);

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 a duplicate name is rejected inline', async ({
		funnels,
		funnelSpans,
	}) => {
		const name = `${funnelSpans.stamp}-dup`;
		await funnels.seed.create(name);

		await funnels.gotoList();
		expect(await funnels.submitCreate(name)).toBe(400);

		await expect(funnels.createError()).toBeVisible();
		await expect(funnels.createModal()).toBeVisible();
		await expect(funnels.title()).toHaveCount(0);
		await expect(funnels.newFunnelButton()).toBeVisible();
	});

	test('TC-03 rename from the list persists', async ({
		funnels,
		funnelSpans,
	}) => {
		const from = `${funnelSpans.stamp}-rename-a`;
		const to = `${funnelSpans.stamp}-rename-b`;
		const { funnel_id: id } = await funnels.seed.create(from);

		await funnels.gotoList();
		await funnels.search(funnelSpans.stamp);
		await funnels.rename(from, to);

		await funnels.gotoList();
		await funnels.search(funnelSpans.stamp);
		await expect(funnels.item(to)).toBeVisible();
		await expect(funnels.item(from)).toHaveCount(0);
		expect((await funnels.seed.get(id)).funnel_name).toBe(to);
	});

	test('TC-04 delete from the detail page returns to the list', async ({
		funnels,
		funnelSpans,
	}) => {
		const name = `${funnelSpans.stamp}-delete`;
		const { funnel_id: id } = await funnels.seed.create(name);

		await funnels.goto(id);
		await funnels.removeFromDetail();

		await expect(funnels.newFunnelButton()).toBeVisible();
		expect(funnels.pathname()).toBe('/traces/funnels');
		await funnels.gotoList();
		await funnels.search(funnelSpans.stamp);
		await expect(funnels.item(name)).toHaveCount(0);
		const remaining = await funnels.seed.list();
		expect(remaining.map((funnel) => funnel.funnel_id)).not.toContain(id);
	});
});
