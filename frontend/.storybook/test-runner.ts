import { getStoryContext } from '@storybook/test-runner';
import type { TestRunnerConfig } from '@storybook/test-runner';
import type { Page, Request } from 'playwright';

const IGNORED_MESSAGES = [
	// `preview-head.html` swaps a local stylesheet in for Google Fonts, but the
	// browser still warns on the real cross-origin one it briefly requests
	// before msw starts (no CORS headers), regardless of story content.
	/Can't access cssRules/,
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
	// The filter editor's ANTLR parser reports every syntax error through
	// `console.error` (`line 1:14 missing ...`), so each partial expression
	// typed into it logs one; the editor shows the same errors on screen.
	/^line \d+:\d+ /,
	// Chromium's echo of a 4xx/5xx response, which the `[response]` entry below
	// already reports with its URL and the time its request left.
	/^Failed to load resource: the server responded with a status of /,
];

interface CapturedMessage {
	at: number;
	text: string;
}

const messagesByPage = new WeakMap<Page, CapturedMessage[]>();

const SETTLE_TIMEOUT_MS = 1_000;

const SETTLE_POLL_MS = 25;

const requestsByPage = new WeakMap<Page, Set<Request>>();

/**
 * The runner opens the next story in this page as soon as the previous one has
 * rendered, so what that one still has in flight answers into state both share:
 * the Noz store holds a single thread id. Requests held open on purpose never
 * end, so the wait gives up and forgets them.
 */
const settleRequests = async (page: Page): Promise<void> => {
	const pending = requestsByPage.get(page);
	if (!pending) {
		return;
	}

	const deadline = Date.now() + SETTLE_TIMEOUT_MS;
	while (pending.size > 0 && Date.now() < deadline) {
		await new Promise((resolve) => {
			setTimeout(resolve, SETTLE_POLL_MS);
		});
	}
	pending.clear();
};

/**
 * When the story under test started rendering, stamped by the preview's
 * `beforeEach`. Messages captured before it belong to the previous story: the
 * runner clears this buffer ahead of the navigation, so whatever that story
 * still had in flight lands here.
 */
const storyStartedAt = (page: Page): Promise<number> =>
	page
		.evaluate(() => Number(document.body.dataset.signozStoryStartedAt ?? 0))
		.catch(() => 0);

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
		await settleRequests(page);

		const existing = messagesByPage.get(page);
		if (existing) {
			existing.length = 0;
			return;
		}

		const messages: CapturedMessage[] = [];
		messagesByPage.set(page, messages);
		const pending = new Set<Request>();
		requestsByPage.set(page, pending);
		page.on('request', (request) => pending.add(request));
		page.on('requestfinished', (request) => pending.delete(request));
		page.on('requestfailed', (request) => pending.delete(request));
		page.on('console', (message) => {
			if (
				message.type() === 'error' &&
				!IGNORED_MESSAGES.some((pattern) => pattern.test(message.text()))
			) {
				messages.push({ at: Date.now(), text: `[error] ${message.text()}` });
			}
		});
		// The console message alone ("Failed to load resource") doesn't name the
		// URL; pairing it with the response is what makes a missing mock
		// actionable instead of just a status code.
		page.on('response', (response) => {
			if (response.status() >= 400) {
				messages.push({
					// The browser's clock, when the request left: a busy runner receives
					// the outgoing story's responses after the next story has started.
					at: response.request().timing().startTime,
					text: `[response] ${response.status()} ${response.url()}`,
				});
			}
		});
	},
	async postVisit(page, context): Promise<void> {
		const captured = messagesByPage.get(page) ?? [];
		if (captured.length === 0) {
			return;
		}

		const startedAt = await storyStartedAt(page);
		const messages = captured
			.filter((message) => message.at >= startedAt)
			.map((message) => message.text);
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
