import type { Locator, Page } from '@playwright/test';

export function toastByText(page: Page, text: string | RegExp): Locator {
	return page.locator('[data-slot="toast"]').filter({ hasText: text });
}
