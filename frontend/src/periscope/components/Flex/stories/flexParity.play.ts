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
	'font-family',
	'font-size',
] as const;

const LINK_PROPERTIES = [
	'color',
	'text-decoration-line',
	'background-color',
	'cursor',
	'transition',
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

async function expectSameStyle(
	local: Element,
	antd: Element,
	properties: readonly string[],
): Promise<void> {
	const localStyle = getComputedStyle(local);
	const antdStyle = getComputedStyle(antd);
	for (const property of properties) {
		await expect({
			property,
			value: localStyle.getPropertyValue(property),
		}).toEqual({ property, value: antdStyle.getPropertyValue(property) });
	}
}

/** Fails unless both renders compute the same styles, link styles and boxes. */
export async function assertFlexParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	const canvas = within(canvasElement);
	const antd = canvas.getByTestId(ANTD_FLEX_TEST_ID);
	const local = canvas.getByTestId(LOCAL_FLEX_TEST_ID);
	await expectSameStyle(local, antd, LAYOUT_PROPERTIES);

	const antdLink = antd.querySelector('a');
	const localLink = local.querySelector('a');
	await expect(Boolean(localLink)).toBe(Boolean(antdLink));
	if (antdLink && localLink) {
		await expectSameStyle(localLink, antdLink, LINK_PROPERTIES);
	}

	await expect(boxesOf(local)).toEqual(boxesOf(antd));
}
