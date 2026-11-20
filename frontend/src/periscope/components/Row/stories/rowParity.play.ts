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
	'font-size',
] as const;

const LINK_PROPERTIES = [
	'text-decoration-line',
	'cursor',
	'transition',
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

function stylesOf(
	element: Element,
	properties: readonly string[],
): Record<string, string> {
	const style = getComputedStyle(element);
	return Object.fromEntries(
		properties.map((property) => [property, style.getPropertyValue(property)]),
	);
}

function layoutOf(row: HTMLElement): Record<string, string> {
	const layout = stylesOf(row, LAYOUT_PROPERTIES);
	(['::before', '::after'] as const).forEach((pseudo) => {
		const pseudoStyle = getComputedStyle(row, pseudo);
		PSEUDO_PROPERTIES.forEach((property) => {
			layout[`${pseudo} ${property}`] = pseudoStyle.getPropertyValue(property);
		});
	});
	return layout;
}

/** Fails unless both renders compute the same styles, link styles and boxes. */
export async function assertRowParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	// Text boxes differ while the web font loads: each side falls back differently.
	await document.fonts.ready;
	const canvas = within(canvasElement);
	const antd = canvas.getByTestId(ANTD_ROW_TEST_ID);
	const local = canvas.getByTestId(LOCAL_ROW_TEST_ID);

	// antd resolves responsive props in an effect after the first paint.
	await waitFor(() => expect(layoutOf(local)).toEqual(layoutOf(antd)));

	const antdLink = antd.querySelector('a');
	const localLink = local.querySelector('a');
	await expect(Boolean(localLink)).toBe(Boolean(antdLink));
	if (antdLink && localLink) {
		await expect(stylesOf(localLink, LINK_PROPERTIES)).toEqual(
			stylesOf(antdLink, LINK_PROPERTIES),
		);
	}

	await expect(boxesOf(local)).toEqual(boxesOf(antd));
}
