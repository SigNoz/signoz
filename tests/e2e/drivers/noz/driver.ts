import type { Locator, Page } from '@playwright/test';

import { LOGS_EXPLORER_PATH } from '../logs/explorer';

import { installFakeAssistant, type FakeAssistant } from './fake';

export const NOZ_NEW_PATH = '/ai-assistant/new';

const THREAD_PATH = /^\/ai-assistant\/([^/]+)$/;

export interface Noz {
	/** Turns Noz on for this page against a fake AI service; call before the first navigation. */
	enable(): Promise<FakeAssistant>;
	gotoHome(): Promise<void>;
	gotoNew(): Promise<void>;
	gotoLogsExplorer(): Promise<void>;
	reload(): Promise<void>;
	navItem(): Locator;
	/** "Ask Noz" in the bottom strip; opens the Noz drawer over the current page. */
	askNozButton(): Locator;
	newChatButton(): Locator;
	/** A thread's row in the history list. */
	historyItem(threadId: string): Locator;
	input(): Locator;
	/** Text in the open conversation, from either side. */
	message(text: string): Locator;
	/** Types `text` and presses Enter, as a user sends. */
	send(text: string): Promise<void>;
	/** The id in `/ai-assistant/:id`, `null` off the page. */
	conversationId(): string | null;
}

export function nozDriver(page: Page): Noz {
	const conversation = (): Locator => page.getByTestId('conversation-view');
	const input = (): Locator => page.getByTestId('ai-chat-input-textarea');

	return {
		enable: () => installFakeAssistant(page),
		gotoHome: async () => {
			await page.goto('/home');
		},
		gotoNew: async () => {
			await page.goto(NOZ_NEW_PATH);
		},
		gotoLogsExplorer: async () => {
			await page.goto(LOGS_EXPLORER_PATH);
		},
		reload: async () => {
			await page.reload();
		},
		navItem: () => page.getByTestId('nav-item-ai-assistant'),
		askNozButton: () => page.getByTestId('bottom-strip-ask-noz-button'),
		newChatButton: () => page.getByTestId('ai-assistant-new-conversation'),
		historyItem: (threadId) =>
			page.getByTestId(`ai-conversation-item-${threadId}`),
		input,
		message: (text) => conversation().getByText(text, { exact: true }),
		send: async (text) => {
			await input().fill(text);
			await input().press('Enter');
		},
		conversationId: () =>
			new URL(page.url()).pathname.match(THREAD_PATH)?.[1] ?? null,
	};
}
