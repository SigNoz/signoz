import type { Meta, StoryObj } from '@storybook/react-vite';
import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { ingestionMocks } from './Ingestion.stories.mocks';
import {
	addDuplicateTag,
	addLongTag,
	addTags,
	openCreateForm,
	openExpiration,
	showKeyLimits,
	submitHeldKey,
	submitInvalidKey,
	submitRejectedKey,
	typeNewTag,
} from './__story_mockdata__/ingestion.play';

import SettingsPage from '../../Settings';

type IngestionArgs = PageStoryArgs<typeof ingestionMocks>;

const pageStory = storyMocks(ingestionMocks, { layout: 'app' });

/**
 * Ingestion keys, their expiry and their per signal limits, against the gateway
 * that owns them. Every action on it is gated on an `ingestion-key` or
 * `ingestion-limit` permission, one story per permission under `Ingestion/Authz`.
 *
 * Route: `/settings/ingestion-settings`.
 */
const meta = {
	title: 'Pages/Settings/Ingestion/Overview',
	tags: ['authz', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<IngestionArgs>;

export default meta;

type Story = StoryObj<IngestionArgs>;

/**
 * The keys collectors send data with, and how much each one is allowed to send
 * per signal before the gateway starts rejecting.
 */
export const Default: Story = {};

/** A workspace that has not been given a key yet. */
export const NoKeys: Story = {
	args: { keys: 0 },
};

/** Keys the org has to rotate before their collectors stop being accepted. */
export const ExpiringKeys: Story = {
	args: { expiry: 'soon' },
};

/** Keys with no cap on any signal, which is what a fresh workspace looks like. */
export const NoLimits: Story = {
	args: { limits: [] },
};

/** A key opened up: the caps per signal, and the usage against each. */
export const KeyLimits: Story = {
	play: showKeyLimits,
};

/** The form a new key is named and dated in. */
export const CreateKey: Story = {
	play: openCreateForm,
};

/** A tag typed on the new key and not confirmed yet. */
export const CreateKeyAddingTag: Story = {
	play: typeNewTag,
};

/** The new key with its tags confirmed, each one removable. */
export const CreateKeyTagsAdded: Story = {
	play: addTags,
};

/**
 * A tag typed again while the key already has it: Enter keeps the input open
 * and adds nothing, with no message saying why.
 */
export const CreateKeyDuplicateTag: Story = {
	play: addDuplicateTag,
};

/** A tag longer than its pill, cut short with an ellipsis. */
export const CreateKeyLongTag: Story = {
	play: addLongTag,
};

/** A name with a space and no expiration, submitted: each field names its rule. */
export const CreateKeyInvalid: Story = {
	// The page logs the rejected validation through `console.error`.
	parameters: { allowConsoleErrors: true },
	play: submitInvalidKey,
};

/** The expiration calendar, where today and every day before it are disabled. */
export const CreateKeyExpirationOpen: Story = {
	play: openExpiration,
};

/** The new key sent, with the create still in flight. */
export const CreateKeySubmitting: Story = {
	args: { create: 'hangs' },
	play: submitHeldKey,
};

/**
 * A create the gateway rejects: the notification names the conflict and the
 * form keeps what was typed.
 */
export const CreateKeyFailed: Story = {
	args: { create: 'fails' },
	// The deliberate 409 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: submitRejectedKey,
};
