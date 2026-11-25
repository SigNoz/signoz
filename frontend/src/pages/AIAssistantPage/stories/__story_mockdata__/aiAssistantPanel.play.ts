/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, within } from 'storybook/test';

import type { AIAssistantArgs } from '../AIAssistantPage.stories.mocks';
import * as page from './aiAssistant.play';

interface PlayContext {
	canvasElement: HTMLElement;
	args: AIAssistantArgs;
}

type Play = (context: PlayContext) => Promise<void>;

const untilLoaded = { timeout: 15_000 };

const panel = async (): Promise<HTMLElement> => {
	const close = await screen.findByTestId(
		'ai-assistant-panel-close',
		undefined,
		untilLoaded,
	);
	const root = close.closest<HTMLElement>('.floating-panel');
	if (!root) {
		throw new Error('The close button is outside the floating panel');
	}
	return root;
};

export const openPanel = async (): Promise<void> => {
	await userEvent.click(
		await screen.findByTestId(
			'bottom-strip-ask-noz-button',
			undefined,
			untilLoaded,
		),
	);
	await panel();
};

export const openHistory = async (): Promise<void> => {
	await openPanel();
	const scope = within(await panel());
	await userEvent.click(await scope.findByLabelText('Toggle conversations'));
	await scope.findByLabelText('Search conversations');
};

const inPanel =
	(play: Play): Play =>
	async (context) => {
		await openPanel();
		await play({ ...context, canvasElement: await panel() });
	};

const inHistory =
	(play: Play): Play =>
	async (context) => {
		await openHistory();
		await play({ ...context, canvasElement: await panel() });
	};

export const expandActivity = inPanel(page.expandActivity);
export const openApprovalDiff = inPanel(page.openApprovalDiff);
export const openNegativeFeedback = inPanel(page.openNegativeFeedback);
export const openContextPicker = inPanel(page.openContextPicker);
export const pickContexts = inPanel(page.pickContexts);
export const expandSingleStep = inPanel(page.expandSingleStep);
export const openLiveSteps = inPanel(page.openLiveSteps);
export const scrollToTop = inPanel(page.scrollToTop);
export const typeDraft = inPanel(page.typeDraft);
export const openClarificationSelect = inPanel(page.openClarificationSelect);

export const openConversationActions = inHistory(page.openConversationActions);
export const renameConversation = inHistory(page.renameConversation);
export const copyConversationLink = inHistory(page.copyConversationLink);
