import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { ingestionMocks } from '../Ingestion.stories.mocks';
import {
	expectCreateDenied,
	expectDeleteDenied,
	expectLimitDeleteDenied,
	expectLimitUpdateDenied,
	expectListDenied,
	expectNewLimitDenied,
	expectUpdateDenied,
} from '../__story_mockdata__/ingestion.authz.play';

import SettingsPage from '../../../Settings';

type IngestionArgs = PageStoryArgs<typeof ingestionMocks>;

const pageStory = storyMocks(ingestionMocks, { layout: 'app' });

/**
 * The ingestion keys tab with one permission missing at a time. Every story here
 * is an admin who is denied exactly what its name says, so what goes with a
 * permission is what the story shows.
 *
 * Route: `/settings/ingestion-settings`.
 */
const meta = {
	title: 'Pages/Settings/Ingestion/Authz',
	tags: ['authz', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<IngestionArgs>;

export default meta;

type Story = StoryObj<IngestionArgs>;

const LIST_KEY = 'list:ingestion-key';
const CREATE_KEY = 'create:ingestion-key';
const UPDATE_KEY = 'update:ingestion-key';
const DELETE_KEY = 'delete:ingestion-key';
const ATTACH_KEY = 'attach:ingestion-key';
const DETACH_KEY = 'detach:ingestion-key';
const CREATE_LIMIT = 'create:ingestion-limit';
const UPDATE_LIMIT = 'update:ingestion-limit';
const DELETE_LIMIT = 'delete:ingestion-limit';

/**
 * Without it the keys are replaced by the permission callout, the search box is
 * locked and neither the list nor the search request is made.
 */
export const NoList: Story = {
	args: { revoked: [LIST_KEY] },
	play: expectListDenied,
};

/** The keys stay in view, with the button that adds one locked. */
export const NoCreate: Story = {
	args: { revoked: [CREATE_KEY] },
	play: expectCreateDenied,
};

/** The edit form opens, with its Update button locked. */
export const NoUpdate: Story = {
	args: { revoked: [UPDATE_KEY] },
	play: expectUpdateDenied,
};

/** The delete dialog opens, with the button that confirms it locked. */
export const NoDelete: Story = {
	args: { revoked: [DELETE_KEY] },
	play: expectDeleteDenied,
};

/**
 * A new limit is a create on the limit and an attach on its key, so losing the
 * limit half locks Save on a signal with no cap yet.
 */
export const NoLimitCreate: Story = {
	args: { revoked: [CREATE_LIMIT] },
	play: expectNewLimitDenied,
};

/** The other half of the same pair, which locks the same Save. */
export const NoAttach: Story = {
	args: { revoked: [ATTACH_KEY] },
	play: expectNewLimitDenied,
};

/** Changing a cap that is already set takes `update` on the limit alone. */
export const NoLimitUpdate: Story = {
	args: { revoked: [UPDATE_LIMIT] },
	play: expectLimitUpdateDenied,
};

/**
 * Removing a limit is a delete on the limit and a detach from its key, so losing
 * the limit half locks the button that confirms it.
 */
export const NoLimitDelete: Story = {
	args: { revoked: [DELETE_LIMIT] },
	play: expectLimitDeleteDenied,
};

/** The other half of the same pair, which locks the same button. */
export const NoDetach: Story = {
	args: { revoked: [DETACH_KEY] },
	play: expectLimitDeleteDenied,
};
