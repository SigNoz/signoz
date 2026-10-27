/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator } from '@playwright/test';

/** A rendered Text panel body. */
export interface Markdown {
	root(): Locator;
	heading(name: string): Locator;
	/** "Nothing written yet", for a blank body. */
	empty(): Locator;
}

export function markdownAt(root: () => Locator): Markdown {
	return {
		root,
		heading: (name) => root().getByRole('heading', { name }),
		empty: () => root().getByTestId('text-panel-empty'),
	};
}
