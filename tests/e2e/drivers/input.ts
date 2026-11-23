import type { Locator, Page } from '@playwright/test';

/**
 * The native control of a `@signozhq/ui` Input. Its `testId` lands on the
 * frame `<div>`, which `fill` and `toHaveValue` reject; the control carries
 * `${testId}-field`.
 */
export function inputField(scope: Page | Locator, testId: string): Locator {
	return scope.getByTestId(`${testId}-field`);
}

/** The fields of every input whose `testId` starts with `prefix`, in DOM order. */
export function inputFieldsStartingWith(
	scope: Page | Locator,
	prefix: string,
): Locator {
	return scope.locator(`[data-testid^="${prefix}"][data-testid$="-field"]`);
}
