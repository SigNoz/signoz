import { expect, within } from 'storybook/test';

import {
	ANTD_LAYOUT_TEST_ID,
	LAYOUT_PARTS,
	layoutPartTestId,
	LOCAL_LAYOUT_TEST_ID,
} from './layoutTestIds';

const STYLE_PROPERTIES = [
	'display',
	'flex-direction',
	'flex-grow',
	'flex-shrink',
	'flex-basis',
	'min-height',
	'width',
	'height',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'color',
	'background-color',
	'line-height',
	'box-sizing',
] as const;

// antd's shared reset sets every part's font, which is out of scope; only the
// footer sets its own size.
function propertiesOf(part: string): readonly string[] {
	return part === 'footer'
		? [...STYLE_PROPERTIES, 'font-size']
		: STYLE_PROPERTIES;
}

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

function boxOf(element: HTMLElement, origin: DOMRect): Box {
	const rect = element.getBoundingClientRect();
	return {
		x: rect.left - origin.left,
		y: rect.top - origin.top,
		width: rect.width,
		height: rect.height,
	};
}

/** Fails unless every part of both renders computes the same styles and box. */
export async function assertLayoutParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	const canvas = within(canvasElement);
	const antdRoot = canvas.getByTestId(
		layoutPartTestId(ANTD_LAYOUT_TEST_ID, 'root'),
	);
	const localRoot = canvas.getByTestId(
		layoutPartTestId(LOCAL_LAYOUT_TEST_ID, 'root'),
	);
	const antdOrigin = antdRoot.getBoundingClientRect();
	const localOrigin = localRoot.getBoundingClientRect();

	for (const part of LAYOUT_PARTS) {
		const antd = canvas.queryByTestId(
			layoutPartTestId(ANTD_LAYOUT_TEST_ID, part),
		);
		const local = canvas.queryByTestId(
			layoutPartTestId(LOCAL_LAYOUT_TEST_ID, part),
		);
		await expect(local === null).toBe(antd === null);
		if (!antd || !local) {
			continue;
		}

		await expect(local.tagName).toBe(antd.tagName);
		const antdStyle = getComputedStyle(antd);
		const localStyle = getComputedStyle(local);
		for (const property of propertiesOf(part)) {
			await expect({
				part,
				property,
				value: localStyle.getPropertyValue(property),
			}).toEqual({ part, property, value: antdStyle.getPropertyValue(property) });
		}
		await expect({ part, box: boxOf(local, localOrigin) }).toEqual({
			part,
			box: boxOf(antd, antdOrigin),
		});
	}
}
