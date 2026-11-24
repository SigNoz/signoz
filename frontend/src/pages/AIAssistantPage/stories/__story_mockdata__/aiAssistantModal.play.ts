/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, within } from 'storybook/test';

import type { AIAssistantArgs } from '../AIAssistantPage.stories.mocks';
import * as page from './aiAssistant.play';

interface PlayContext {
	canvasElement: HTMLElement;
	args: AIAssistantArgs;
}

type Play = (context: PlayContext) => Promise<void>;

const untilLoaded = { timeout: 15_000 };

const modal = (): Promise<HTMLElement> =>
	screen.findByRole('dialog', { name: 'Noz' }, untilLoaded);

const inModal =
	(play: Play): Play =>
	async (context) =>
		play({ ...context, canvasElement: await modal() });

export const openHistory = async (): Promise<void> => {
	const toggle = await within(await modal()).findByLabelText(
		'Toggle conversations',
	);
	await userEvent.click(toggle);
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
};

const inHistory =
	(play: Play): Play =>
	async (context) => {
		await openHistory();
		await inModal(play)(context);
	};

export const expandActivity = inModal(page.expandActivity);
export const openApprovalDiff = inModal(page.openApprovalDiff);
export const openNegativeFeedback = inModal(page.openNegativeFeedback);
export const openContextPicker = inModal(page.openContextPicker);
export const pickContexts = inModal(page.pickContexts);
export const expandSingleStep = inModal(page.expandSingleStep);
export const openLiveSteps = inModal(page.openLiveSteps);
export const scrollToTop = inModal(page.scrollToTop);
export const typeDraft = inModal(page.typeDraft);
export const openClarificationSelect = inModal(page.openClarificationSelect);

export const openConversationActions = inHistory(page.openConversationActions);
export const renameConversation = inHistory(page.renameConversation);
export const copyConversationLink = inHistory(page.copyConversationLink);
