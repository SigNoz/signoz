import { expect, within } from 'storybook/test';

import { ANTD_LIST_TEST_ID, LOCAL_LIST_TEST_ID } from './ListComparison';

const STYLE_PROPERTIES = [
	'display',
	'position',
	'box-sizing',
	'float',
	'margin-top',
	'margin-right',
	'margin-bottom',
	'margin-left',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'border-top-width',
	'border-top-style',
	'border-right-width',
	'border-right-style',
	'border-bottom-width',
	'border-bottom-style',
	'border-left-width',
	'border-left-style',
	'border-radius',
	'font-size',
	'line-height',
	'text-decoration-line',
	'cursor',
	'transition',
	'list-style-type',
	'text-align',
	'flex-grow',
	'flex-shrink',
	'flex-basis',
	'align-items',
	'justify-content',
	'transform',
] as const;

/** SVG geometry differs past the 5th decimal between otherwise equal panels. */
function round(value: number): number {
	return Math.round(value * 100) / 100;
}

interface Snapshot {
	tag: string;
	x: number;
	y: number;
	width: number;
	height: number;
	styles: Record<string, string>;
}

function snapshotOf(list: HTMLElement): Snapshot[] {
	const origin = list.getBoundingClientRect();
	const elements = [
		list,
		...Array.from(list.querySelectorAll<Element>('*')),
	].filter((element) => !element.closest('defs'));
	return elements.map((element) => {
		const rect = element.getBoundingClientRect();
		const computed = getComputedStyle(element);
		return {
			tag: element.tagName,
			x: round(rect.left - origin.left),
			y: round(rect.top - origin.top),
			width: round(rect.width),
			height: round(rect.height),
			styles: Object.fromEntries(
				STYLE_PROPERTIES.map((property) => [
					property,
					computed.getPropertyValue(property),
				]),
			),
		};
	});
}

/** Fails unless both renders produce the same elements, computed styles and boxes. */
export async function assertListParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	// Text boxes differ while the web font loads: each side falls back differently.
	await document.fonts.ready;
	const canvas = within(canvasElement);
	const antd = snapshotOf(canvas.getByTestId(ANTD_LIST_TEST_ID));
	const local = snapshotOf(canvas.getByTestId(LOCAL_LIST_TEST_ID));

	await expect(local.length).toBe(antd.length);
	for (const [index, expected] of antd.entries()) {
		await expect({ index, ...local[index] }).toEqual({ index, ...expected });
	}
}
