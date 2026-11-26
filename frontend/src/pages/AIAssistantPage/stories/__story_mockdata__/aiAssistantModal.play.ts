/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { openAIAssistantModal } from 'container/AIAssistant/store/useAIAssistantStore';
import { screen } from 'storybook/test';

import type { AIAssistantArgs } from '../AIAssistantPage.stories.mocks';
import * as page from './aiAssistant.play';

interface PlayContext {
	canvasElement: HTMLElement;
	args: AIAssistantArgs;
}

type Play = (context: PlayContext) => Promise<void>;

const untilLoaded = { timeout: 15_000 };

const modal = (): Promise<HTMLElement> =>
	screen.findByTestId('ai-assistant-modal', undefined, untilLoaded);

/** ⌘J and ⌘K start a new conversation; this opens the modal on the thread the story seeded. */
export const openModal = async (): Promise<void> => {
	openAIAssistantModal();
	await modal();
};

const inModal =
	(play: Play): Play =>
	async (context) => {
		await openModal();
		await play({ ...context, canvasElement: await modal() });
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
