import { expect, waitFor, within } from 'storybook/test';

import { ANTD_ROW_TEST_ID, LOCAL_ROW_TEST_ID } from './RowComparison';

const LAYOUT_PROPERTIES = [
	'display',
	'flex-direction',
	'flex-wrap',
	'align-items',
	'justify-content',
	'row-gap',
	'column-gap',
	'margin-left',
	'margin-right',
	'min-width',
	'box-sizing',
] as const;

const PSEUDO_PROPERTIES = ['display', 'box-sizing'] as const;

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

function boxesOf(row: HTMLElement): Box[] {
	const origin = (row.parentElement ?? row).getBoundingClientRect();
	return [row, ...Array.from(row.children)].map((element) => {
		const rect = element.getBoundingClientRect();
		return {
			x: rect.left - origin.left,
			y: rect.top - origin.top,
			width: rect.width,
			height: rect.height,
		};
	});
}

function layoutOf(row: HTMLElement): Record<string, string> {
	const layout: Record<string, string> = {};
	const style = getComputedStyle(row);
	LAYOUT_PROPERTIES.forEach((property) => {
		layout[property] = style.getPropertyValue(property);
	});
	(['::before', '::after'] as const).forEach((pseudo) => {
		const pseudoStyle = getComputedStyle(row, pseudo);
		PSEUDO_PROPERTIES.forEach((property) => {
			layout[`${pseudo} ${property}`] = pseudoStyle.getPropertyValue(property);
		});
	});
	return layout;
}

/** Fails unless both renders compute the same layout styles and boxes. */
export async function assertRowParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	const canvas = within(canvasElement);
	const antd = canvas.getByTestId(ANTD_ROW_TEST_ID);
	const local = canvas.getByTestId(LOCAL_ROW_TEST_ID);

	// antd resolves responsive props in an effect after the first paint.
	await waitFor(() => expect(layoutOf(local)).toEqual(layoutOf(antd)));
	await expect(boxesOf(local)).toEqual(boxesOf(antd));
}
