import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import OnboardingPageV2 from '../OnboardingPageV2';
import { onboardingV2Mocks } from './OnboardingPageV2.stories.mocks';
import {
	openAddCreditCard,
	openInviteModal,
	searchWithoutResults,
	sendInvite,
	walkToStep,
} from './__story_mockdata__/onboardingV2.play';

type OnboardingV2Args = PageStoryArgs<typeof onboardingV2Mocks>;

const pageStory = storyMocks(onboardingV2Mocks, { layout: 'app' });

/**
 * The add data source flow: pick a source, then walk its steps, with the ingestion
 * key the snippets carry.
 *
 * Route: `/get-started-with-signoz-cloud`.
 */
const meta = {
	title: 'Pages/Onboarding/Add Data Source',
	tags: ['play'],
	component: OnboardingPageV2,
	play: walkToStep,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<OnboardingV2Args>;

export default meta;

type Story = StoryObj<OnboardingV2Args>;

/** Everything a new workspace can send data from, grouped by signal. */
export const Default: Story = {};

/** A language picked, which is where the catalogue asks what it is written with. */
export const FrameworkQuestion: Story = {
	args: { step: 'select-framework' },
};

/** The last question a source asks: where the instrumented service runs. */
export const EnvironmentQuestion: Story = {
	args: { step: 'select-environment' },
};

/** Every question answered, with the setup instructions one click away. */
export const ReadyToConfigure: Story = {
	args: { step: 'ready-to-configure' },
};

/** The setup instructions for the answered source, next to the ingestion key. */
export const ConfigureProduct: Story = {
	args: { step: 'configure-product' },
};

/** Arrived on a source already picked, which is what a docs link does. */
export const SourcePreselected: Story = {
	args: { source: 'java' },
};

/** The one thing the header offers besides support: bringing the team along. */
export const InviteTeammate: Story = {
	play: openInviteModal,
};

/** A search nothing answers, where the catalogue offers to add the source instead. */
export const NoSearchResults: Story = {
	play: searchWithoutResults,
};

/**
 * Inviting a teammate from the header: an email and a role, then Send Invites.
 * The modal closes and "Invites sent successfully" is raised once the request
 * is accepted; Invite result changes how it answers.
 */
export const InvitesSentToast: Story = {
	play: sendInvite,
};

/**
 * A cloud trial without premium support, whose Contact Support in the header asks
 * for a card to unlock chat support instead of opening the chat.
 */
export const FacingIssuesAddCard: Story = {
	args: { support: 'add-card' },
	play: openAddCreditCard,
};
