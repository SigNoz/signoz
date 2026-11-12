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
	'line-height',
	'box-sizing',
	'font-size',
] as const;

const LINK_PROPERTIES = [
	'text-decoration-line',
	'cursor',
	'transition',
] as const;

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

async function expectSameLinks(local: Element, antd: Element): Promise<void> {
	const antdLinks = Array.from(antd.querySelectorAll('a'));
	const localLinks = Array.from(local.querySelectorAll('a'));
	await expect(localLinks.length).toBe(antdLinks.length);
	for (const [index, antdLink] of antdLinks.entries()) {
		const antdStyle = getComputedStyle(antdLink);
		const localStyle = getComputedStyle(localLinks[index]);
		for (const property of LINK_PROPERTIES) {
			await expect({
				link: index,
				property,
				value: localStyle.getPropertyValue(property),
			}).toEqual({
				link: index,
				property,
				value: antdStyle.getPropertyValue(property),
			});
		}
	}
}

/** Fails unless both renders compute the same styles for every part and link, and the same boxes. */
export async function assertLayoutParity({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	// Text boxes differ while the web font loads: each side falls back differently.
	await document.fonts.ready;
	const canvas = within(canvasElement);
	const antdRoot = canvas.getByTestId(
		layoutPartTestId(ANTD_LAYOUT_TEST_ID, 'root'),
	);
	const localRoot = canvas.getByTestId(
		layoutPartTestId(LOCAL_LAYOUT_TEST_ID, 'root'),
	);
	await expectSameLinks(localRoot, antdRoot);

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
		for (const property of STYLE_PROPERTIES) {
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
