import { expect, within } from 'storybook/test';

import {
	ANTD_COL_TEST_ID,
	ANTD_ROW_TEST_ID,
	LOCAL_COL_TEST_ID,
	LOCAL_ROW_TEST_ID,
} from './ColComparison';

const LAYOUT_PROPERTIES = [
	'display',
	'position',
	'box-sizing',
	'flex-grow',
	'flex-shrink',
	'flex-basis',
	'max-width',
	'min-width',
	'min-height',
	'margin-left',
	'margin-right',
	'padding-left',
	'padding-right',
	'left',
	'right',
	'order',
] as const;

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

// A hidden column (`span={0}`) has no box.
function boxesOf(row: HTMLElement): (Box | null)[] {
	const origin = row.getBoundingClientRect();
	return [row, ...Array.from(row.children)].map((element) => {
		if (element.getClientRects().length === 0) {
			return null;
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

/** Fails unless both columns compute the same layout styles and boxes. */
export async function assertColParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	const canvas = within(canvasElement);
	const antdStyle = getComputedStyle(canvas.getByTestId(ANTD_COL_TEST_ID));
	const localStyle = getComputedStyle(canvas.getByTestId(LOCAL_COL_TEST_ID));

	for (const property of LAYOUT_PROPERTIES) {
		await expect({
			property,
			value: localStyle.getPropertyValue(property),
		}).toEqual({ property, value: antdStyle.getPropertyValue(property) });
	}
	await expect(boxesOf(canvas.getByTestId(LOCAL_ROW_TEST_ID))).toEqual(
		boxesOf(canvas.getByTestId(ANTD_ROW_TEST_ID)),
	);
}
