/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { ownDropdown } from '../../helpers/alert-forms/shared';

import { editorAt } from './editor';
import type { AddOnField, AddOns, MetricControls } from './types';

/**
 * Opens the antd select inside `select` and returns its options. Scoped to the
 * list the select owns: a previous select's list can still be mid-close.
 */
export async function openSelect(
	page: Page,
	select: Locator,
): Promise<Locator> {
	await select.locator('.ant-select-selector').click();
	const list = await ownDropdown(page, select);
	await expect(list).toBeVisible();
	return list.locator('.ant-select-item-option');
}

/** antd renders select options with trailing whitespace ("Sum "). */
export const exactly = (label: string): RegExp =>
	new RegExp(`^\\s*${label}\\s*$`);

/** A reduce-to option or value by its operator: "Sum of values in timeframe". */
export const reduceToLabel = (operator: string): RegExp =>
	new RegExp(`^\\s*${operator} of values`);

const ADD_ON_CONTENT: Record<AddOnField, string> = {
	group_by: 'group-by-content',
	having: 'having-content',
	order_by: 'order-by-content',
	limit: 'limit-content',
	legend_format: 'legend-format-content',
	reduce_to: 'reduce-to-content',
};

export function addOnsAt(page: Page, root: () => Locator): AddOns {
	const content = (field: AddOnField): Locator =>
		root().getByTestId(ADD_ON_CONTENT[field]);
	const groupBy = (): Locator => root().getByTestId('group-by');
	const addOns: AddOns = {
		toggles: () => root().locator('[data-testid^="query-add-on-"]'),
		async open(field) {
			if (await content(field).isVisible()) {
				return;
			}
			await root().getByTestId(`query-add-on-${field}`).click();
			await expect(content(field)).toBeVisible();
		},
		content,
		groupBy: {
			async add(key) {
				const options = await openSelect(page, groupBy());
				await groupBy().locator('input').fill(key);
				await options
					.filter({ hasText: exactly(key) })
					.first()
					.click();
				await page.keyboard.press('Escape');
				await expect(
					groupBy().locator('.ant-select-selection-item', { hasText: key }),
				).toBeVisible();
			},
			async remove(key) {
				await groupBy()
					.locator('.ant-select-selection-item', { hasText: key })
					.locator('.ant-select-selection-item-remove')
					.click();
			},
			async values() {
				const texts = await groupBy()
					.locator('.ant-select-selection-item-content')
					.allTextContents();
				return texts.map((text) => text.trim());
			},
		},
		having: editorAt(page, () => root().getByTestId('having-editor')),
		limit: () => content('limit').getByTestId('input-Limit'),
		legend: () => content('legend_format').getByTestId('input-Legend format'),
		reduceTo: {
			value: () =>
				root().getByTestId('reduce-to').locator('.ant-select-selection-item'),
			// Labels read "<Op> of values in timeframe"; matched on the operator.
			async set(label) {
				const options = await openSelect(page, root().getByTestId('reduce-to'));
				await options.filter({ hasText: reduceToLabel(label) }).click();
				await expect(addOns.reduceTo.value()).toHaveText(reduceToLabel(label));
			},
		},
	};
	return addOns;
}

export function metricAt(page: Page, root: () => Locator): MetricControls {
	const picker = (): Locator =>
		root().locator('[data-testid^="metric-name-selector-"]');
	const time = (): Locator => root().getByTestId('metrics-time-aggregation');
	const space = (): Locator => root().getByTestId('metrics-space-aggregation');
	return {
		async select(name) {
			// An antd AutoComplete: the testid is on a wrapper.
			const field = picker();
			const options = await openSelect(page, field);
			await field.locator('input').fill(name);
			// Options carry the metric's type and unit next to its name.
			await options.filter({ hasText: name }).first().click();
		},
		// The selection item, not the root: these selects render their list
		// inside the root, so its text includes every option.
		input: () => picker().locator('input'),
		timeAggregation: () => time().locator('.ant-select-selection-item'),
		spaceAggregation: () => space().locator('.ant-select-selection-item'),
		async setTimeAggregation(label) {
			const options = await openSelect(page, time());
			await options.filter({ hasText: exactly(label) }).click();
			await expect(this.timeAggregation()).toHaveText(label);
		},
		async setSpaceAggregation(label) {
			const options = await openSelect(page, space());
			await options.filter({ hasText: exactly(label) }).click();
			await expect(this.spaceAggregation()).toHaveText(label);
		},
		async spaceOptions() {
			const options = await openSelect(page, space());
			const labels = await options.allTextContents();
			await page.keyboard.press('Escape');
			return labels.map((label) => label.trim());
		},
	};
}
