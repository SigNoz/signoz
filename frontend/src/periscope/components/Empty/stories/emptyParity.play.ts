import { expect, within } from 'storybook/test';

import { ANTD_EMPTY_TEST_ID, LOCAL_EMPTY_TEST_ID } from './EmptyComparison';

const STYLE_PROPERTIES = [
	'display',
	'box-sizing',
	'margin-top',
	'margin-right',
	'margin-bottom',
	'margin-left',
	'height',
	'max-width',
	'font-size',
	'line-height',
	'text-align',
	'opacity',
	'fill-opacity',
	'text-decoration-line',
	'cursor',
	'transition',
] as const;

/** SVG shapes pick up sub-pixel noise from where each panel sits on the page. */
const BOX_TOLERANCE_PX = 0.01;

type Box = [x: number, y: number, width: number, height: number];

function elementsOf(root: HTMLElement): Element[] {
	return [root, ...Array.from(root.querySelectorAll('*'))];
}

function boxesOf(root: HTMLElement): Box[] {
	const origin = root.getBoundingClientRect();
	return elementsOf(root).map((element) => {
		const rect = element.getBoundingClientRect();
		return [
			rect.left - origin.left,
			rect.top - origin.top,
			rect.width,
			rect.height,
		];
	});
}

function boxMismatches(local: Box[], antd: Box[]): string[] {
	return local
		.map((box, index) => ({ index, local: box, antd: antd[index] }))
		.filter(({ local: own, antd: theirs }) =>
			own.some(
				(value, axis) =>
					Math.abs(value - (theirs?.[axis] ?? NaN)) > BOX_TOLERANCE_PX,
			),
		)
		.map((mismatch) => JSON.stringify(mismatch));
}

function stylesOf(root: HTMLElement): Record<string, string>[] {
	return elementsOf(root).map((element) => {
		const computed = getComputedStyle(element);
		return Object.fromEntries(
			STYLE_PROPERTIES.map((property) => [
				property,
				computed.getPropertyValue(property),
			]),
		);
	});
}

/** Fails unless both renders compute the same styles and boxes, SVG paint and links included. */
export async function assertEmptyParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	// Text boxes differ while the web font loads: each side falls back differently.
	await document.fonts.ready;
	const canvas = within(canvasElement);
	const antd = canvas.getByTestId(ANTD_EMPTY_TEST_ID);
	const local = canvas.getByTestId(LOCAL_EMPTY_TEST_ID);

	await expect(stylesOf(local)).toEqual(stylesOf(antd));
	const localBoxes = boxesOf(local);
	const antdBoxes = boxesOf(antd);
	await expect(localBoxes).toHaveLength(antdBoxes.length);
	await expect(boxMismatches(localBoxes, antdBoxes)).toEqual([]);
}
