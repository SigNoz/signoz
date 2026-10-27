/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator, type Page } from '@playwright/test';

import { boxOf, dragBy } from './dom';

/**
 * react-grid-layout exposes no testids; `.panel-drag-handle` and
 * `.react-resizable-handle` are the class contract it is configured with
 * (draggableHandle / draggableCancel in SectionGrid).
 */
export interface PanelGrid {
	/** The grid item's rendered size in px. */
	size(): Promise<{ width: number; height: number }>;
	/** The grid item's rendered top-left corner in px. */
	position(): Promise<{ x: number; y: number }>;
	/** Drags RGL's south-east grip by the given offset. */
	resize(dx: number, dy: number): Promise<void>;
	/** Drags the header handle across its own width. */
	dragByHeader(): Promise<void>;
	/** The same drag, started on the ⋮ actions button inside the handle. */
	dragByActionsButton(): Promise<void>;
}

export function gridAt(page: Page, root: () => Locator): PanelGrid {
	// RGL appends the resize grip to its grid item, a sibling of the panel root.
	const gridItem = (): Locator =>
		root().locator('xpath=ancestor::div[contains(@class,"react-grid-item")][1]');
	return {
		async size() {
			const { width, height } = await boxOf(gridItem(), 'the grid item');
			return { width, height };
		},
		async position() {
			const { x, y } = await boxOf(gridItem(), 'the grid item');
			return { x, y };
		},
		async resize(dx, dy) {
			const grip = await boxOf(
				gridItem().locator('.react-resizable-handle'),
				'the resize handle',
			);
			await dragBy(
				page,
				{ x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 },
				{ x: grip.x + dx, y: grip.y + dy },
				12,
			);
		},
		async dragByHeader() {
			const bar = await boxOf(
				root().locator('.panel-drag-handle').first(),
				'the drag handle',
			);
			const y = bar.y + bar.height / 2;
			await dragBy(
				page,
				{ x: bar.x + bar.width / 4, y },
				{ x: bar.x + bar.width, y },
				15,
			);
		},
		async dragByActionsButton() {
			const bar = await boxOf(
				root().locator('.panel-drag-handle').first(),
				'the drag handle',
			);
			// The trigger only appears on hover.
			await root().hover();
			const button = await boxOf(
				root().locator('[data-testid^="panel-actions-"]'),
				'the actions button',
			);
			const from = {
				x: button.x + button.width / 2,
				y: button.y + button.height / 2,
			};
			await dragBy(page, from, { x: from.x + bar.width, y: from.y }, 15);
		},
	};
}
