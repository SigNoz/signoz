import { expect, within } from 'storybook/test';

import { ANTD_FLEX_TEST_ID, LOCAL_FLEX_TEST_ID } from './FlexComparison';

const LAYOUT_PROPERTIES = [
	'display',
	'flex-direction',
	'flex-wrap',
	'align-items',
	'justify-content',
	'row-gap',
	'column-gap',
	'flex-grow',
	'flex-shrink',
	'flex-basis',
	'box-sizing',
] as const;

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

function boxesOf(container: HTMLElement): Box[] {
	const origin = container.getBoundingClientRect();
	return [container, ...Array.from(container.children)].map((element) => {
		const rect = element.getBoundingClientRect();
		return {
			x: rect.left - origin.left,
			y: rect.top - origin.top,
			width: rect.width,
			height: rect.height,
		};
	});
}

/** Fails unless both renders compute the same layout styles and boxes. */
export async function assertFlexParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	const canvas = within(canvasElement);
	const antd = canvas.getByTestId(ANTD_FLEX_TEST_ID);
	const local = canvas.getByTestId(LOCAL_FLEX_TEST_ID);
	const antdStyle = getComputedStyle(antd);
	const localStyle = getComputedStyle(local);

	for (const property of LAYOUT_PROPERTIES) {
		await expect({
			property,
			value: localStyle.getPropertyValue(property),
		}).toEqual({ property, value: antdStyle.getPropertyValue(property) });
	}
	await expect(boxesOf(local)).toEqual(boxesOf(antd));
}
