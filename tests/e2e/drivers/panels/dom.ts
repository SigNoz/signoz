/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

export async function boxOf(
	locator: Locator,
	description: string,
): Promise<Box> {
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	expect(box, `expected a bounding box for ${description}`).not.toBeNull();
	return box as Box;
}

/** The extra pre-mousedown move gives uPlot a cursor anchor to drag from. */
export async function dragHorizontally(
	page: Page,
	box: Box,
	fromFraction: number,
	toFraction: number,
): Promise<void> {
	const y = box.y + box.height / 2;
	const startX = box.x + box.width * fromFraction;
	await page.mouse.move(startX, y);
	await page.mouse.move(startX, y);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * toFraction, y, { steps: 16 });
	await page.mouse.up();
}

export async function dragBy(
	page: Page,
	from: { x: number; y: number },
	to: { x: number; y: number },
	steps: number,
): Promise<void> {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	await page.mouse.move(to.x, to.y, { steps });
	await page.mouse.up();
}

/** A visible option of whichever antd Select is open. */
export function openSelectOption(page: Page, label: string): Locator {
	return page
		.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
		.getByText(label, { exact: true });
}
