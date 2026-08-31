import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { ingestionMocks } from './Ingestion.stories.mocks';

import SettingsPage from '../Settings';

type IngestionArgs = PageStoryArgs<typeof ingestionMocks>;

const pageStory = storyMocks(ingestionMocks);

/**
 * Ingestion keys, their expiry and their per signal limits, against the gateway
 * that owns them.
 *
 * Route: `/settings/ingestion-settings`.
 */
const meta = {
	title: 'Pages/Settings/Ingestion',
	tags: ['play'],
	component: SettingsPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<IngestionArgs>;

export default meta;

type Story = StoryObj<IngestionArgs>;

/** The list fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

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

/**
 * The same tab on a workspace without the gateway: the ingestion URL, key and
 * region it was handed, and nothing to manage.
 */
export const WithoutGateway: Story = {
	args: { gateway: false },
};

/** A key opened up: the caps per signal, and the usage against each. */
export const KeyLimits: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/production-us-east/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/logs/i, undefined, untilLoaded);
	},
};

/** The form a new key is named and dated in. */
export const CreateKey: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'create-new-key',
				undefined,
				untilLoaded,
			),
		);
	},
};
