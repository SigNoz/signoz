import { expect, within } from 'storybook/test';

import { ANTD_SPACE_TEST_ID, LOCAL_SPACE_TEST_ID } from './SpaceComparison';

const LAYOUT_PROPERTIES = [
	'display',
	'flex-direction',
	'flex-wrap',
	'align-items',
	'justify-content',
	'row-gap',
	'column-gap',
	'box-sizing',
	'width',
] as const;

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

const HIDDEN: Box = { x: 0, y: 0, width: 0, height: 0 };

/** The container, its items and splits, and what each item holds. Hidden ones get no position. */
function boxesOf(container: HTMLElement): Box[] {
	const origin = container.getBoundingClientRect();
	const children = Array.from(container.children);
	return [
		container,
		...children,
		...children.flatMap((child) => Array.from(child.children)),
	].map((element) => {
		if (element.getClientRects().length === 0) {
			return HIDDEN;
		}
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
export async function assertSpaceParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	const canvas = within(canvasElement);
	const antd = canvas.queryByTestId(ANTD_SPACE_TEST_ID);
	const local = canvas.queryByTestId(LOCAL_SPACE_TEST_ID);
	await expect(Boolean(local)).toBe(Boolean(antd));
	if (!antd || !local) {
		return;
	}
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
