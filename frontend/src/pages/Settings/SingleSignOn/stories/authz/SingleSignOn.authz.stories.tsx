import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	DELETE_AUTH_DOMAIN,
	LIST_AUTH_DOMAIN,
	READ_ORGANIZATION,
	UPDATE_ORGANIZATION,
} from '../__story_mockdata__/singleSignOnAuthz';
import {
	expectDeleteDenied,
	expectDisplayNameDenied,
	expectListDenied,
} from '../__story_mockdata__/singleSignOnAuthz.play';
import { singleSignOnMocks } from '../SingleSignOn.stories.mocks';

import SettingsPage from '../../../Settings';

type SingleSignOnArgs = PageStoryArgs<typeof singleSignOnMocks>;

const pageStory = storyMocks(singleSignOnMocks, { layout: 'app' });

/**
 * The single sign-on tab with one permission missing at a time. Every story here
 * is an admin denied exactly what its name says. `list` decides whether the
 * domain table renders and `delete` the confirm button of the removal modal.
 * Reading the organization replaces the display name with the denial, and
 * updating it locks the input. Saving a domain is not
 * checked in the page: the backend answers.
 *
 * Route: `/settings/org-settings`.
 */
const meta = {
	title: 'Pages/Settings/Single Sign-on/Authz',
	tags: ['authz', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<SingleSignOnArgs>;

export default meta;

type Story = StoryObj<SingleSignOnArgs>;

/**
 * The denial takes the place of the domain table. The display name above it and
 * the Add Domain button stay.
 */
export const NoList: Story = {
	args: { revoked: [LIST_AUTH_DOMAIN] },
	play: expectListDenied,
};

/**
 * The removal modal opens and its Delete Domain button is locked, naming the
 * missing permission.
 */
export const NoDelete: Story = {
	args: { revoked: [DELETE_AUTH_DOMAIN] },
	play: expectDeleteDenied,
};

/**
 * The denial takes the place of the display name input and its Submit button.
 * The domain table below is unaffected.
 */
export const NoReadOrganization: Story = {
	args: { revoked: [READ_ORGANIZATION] },
	play: expectDisplayNameDenied,
};

/** The display name input and its Submit button are locked. */
export const NoUpdateOrganization: Story = {
	args: { revoked: [UPDATE_ORGANIZATION] },
	play: expectDisplayNameDenied,
};
