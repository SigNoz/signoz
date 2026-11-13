/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, waitFor, within } from 'storybook/test';

const TRACES_ADD_ONS = [
	'group-by-content',
	'having-content',
	'order-by-content',
	'limit-content',
	'legend-format-content',
];

const groupByTags = (scope: HTMLElement): string[] =>
	Array.from(
		within(scope)
			.getByTestId('group-by')
			.querySelectorAll('.ant-select-selection-item'),
	).map((tag) => tag.textContent ?? '');

/** Every add-on the seeded query fills opens on mount, group by with all its keys. */
export const expectTracesAddOnsOpen =
	(groupByCount: number) =>
	async ({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> => {
		const query = within(canvasElement).getByTestId('query-A');
		await waitFor(async () => {
			for (const testId of TRACES_ADD_ONS) {
				await expect(within(query).getByTestId(testId)).toBeVisible();
			}
		});
		const groupBy = within(query).getByTestId('group-by-content');
		await waitFor(() => expect(groupByTags(groupBy)).toHaveLength(groupByCount));
	};

/** The aggregation row's group by shows every seeded key. */
export const expectMetricsGroupBy =
	(groupByCount: number) =>
	async ({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> => {
		const query = within(canvasElement).getByTestId('query-A');
		await waitFor(() => expect(groupByTags(query)).toHaveLength(groupByCount));
	};
