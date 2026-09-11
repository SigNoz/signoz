import { getStoryContext } from '@storybook/test-runner';
import type { TestRunnerConfig } from '@storybook/test-runner';
import type { Page } from 'playwright';

const IGNORED_MESSAGES = [
	// `preview-head.html` swaps a local stylesheet in for Google Fonts, but the
	// browser still warns on the real cross-origin one it briefly requests
	// before msw starts (no CORS headers), regardless of story content.
	/Can't access cssRules/,
	// Pre-existing dev-server noise, unrelated to any story.
	/Couldn't load preload assets/,
	// Fires because a Jest-driven browser sets a global testing flag React
	// checks for; unrelated to anything a story does.
	/current testing environment is not configured to support act/,
	// React and antd route dev-only warnings (missing keys, DOM nesting, API
	// deprecations) through `console.error` under this prefix; app-wide and
	// tracked separately from story regressions.
	/^Warning: /,
	// msw's own warning when its response listener count grows across many
	// story visits in one browser session; not a story defect.
	/MaxListenersExceededWarning/,
	// `preview-head.html`'s CSP intentionally blocks third-party iframes
	// (YouTube embeds, the docs pane) so they hit the real network instead of
	// an unanswered msw request; the block is the point, not a bug.
	/violates the following Content Security Policy directive/,
];

const messagesByPage = new WeakMap<Page, string[]>();

/**
 * Only `console.error` fails a story. `console.warn` is dev-time advice from
 * app code (e.g. `aggregateData is null`) and from the runner itself; an
 * unmocked `/api/` call is a `console.error` in `src/storybook/msw/handlers.ts`.
 */
const config: TestRunnerConfig = {
	// msw logs every mocked request at `log`; keep it out of the failure dump
	// unless the job is re-run with debug logging (GitHub sets RUNNER_DEBUG=1).
	logLevel: process.env.RUNNER_DEBUG === '1' ? 'info' : 'warn',
	async preVisit(page): Promise<void> {
		const existing = messagesByPage.get(page);
		if (existing) {
			existing.length = 0;
			return;
		}

		const messages: string[] = [];
		messagesByPage.set(page, messages);
		page.on('console', (message) => {
			if (
				message.type() === 'error' &&
				!IGNORED_MESSAGES.some((pattern) => pattern.test(message.text()))
			) {
				messages.push(`[error] ${message.text()}`);
			}
		});
		// The console message alone ("Failed to load resource") doesn't name the
		// URL; pairing it with the response is what makes a missing mock
		// actionable instead of just a status code.
		page.on('response', (response) => {
			if (response.status() >= 400) {
				messages.push(`[response] ${response.status()} ${response.url()}`);
			}
		});
	},
	async postVisit(page, context): Promise<void> {
		const messages = messagesByPage.get(page) ?? [];
		if (messages.length === 0) {
			return;
		}

		// A story that deliberately mocks a failure response (e.g. a 500 to test
		// an error state) logs the error it's testing for; opt it out per-story
		// with `parameters: { allowConsoleErrors: true }`.
		const storyContext = await getStoryContext(page, context);
		if (storyContext.parameters?.allowConsoleErrors) {
			return;
		}

		throw new Error(
			`Story "${context.name}" logged console error/warning:\n${messages.join('\n')}`,
		);
	},
};

export default config;
