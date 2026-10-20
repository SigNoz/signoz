import { test as playwright, type Page } from '@playwright/test';

import { savedViewsDriver, type SavedViews } from '../savedviews';

/** Saved views for the logs explorer, on the shared saved-views driver. */

export interface LogsViews extends SavedViews {
	/** Stamp shared by every view this test creates; `removeByPrefix` takes it. */
	prefix: string;
	/** A fresh view name under {@link LogsViews.prefix}. */
	name(tag: string): string;
	names(): Promise<string[]>;
}

export function logsViewsDriver(page: Page): LogsViews {
	const shared = savedViewsDriver(page, 'logs');
	const prefix = `e2e-logs-view-w${playwright.info().workerIndex}-${Date.now()}`;

	return {
		...shared,
		prefix,
		name: (tag) => `${prefix}-${tag}`,
		names: async () => (await shared.list()).map((view) => view.spec.displayName),
	};
}
