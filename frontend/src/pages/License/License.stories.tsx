import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import LicensePage from './index';
import { licenseMocks } from './License.stories.mocks';

type LicenseArgs = PageStoryArgs<typeof licenseMocks>;

const pageStory = storyMocks(licenseMocks);

/**
 * Licence keys applied to the workspace, and the form that applies another.
 *
 * Route: `/licenses`.
 */
const meta = {
	title: 'Pages/System/License',
	tags: ['play'],
	component: LicensePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LicenseArgs>;

export default meta;

type Story = StoryObj<LicenseArgs>;

const applyKey = async (canvasElement: HTMLElement): Promise<void> => {
	const canvas = within(canvasElement);

	await userEvent.type(
		await canvas.findByRole('textbox'),
		'96a1c6a4-3f1e-4b7d-9f2a-8c0d5e6f7a8b',
	);
	await userEvent.click(canvas.getByRole('button', { name: /apply/i }));
};

/** Where a self-hosted deployment puts the key it was sold. */
export const Default: Story = {};

/** A key the backend will not take, which the form reports where it stands. */
export const KeyRejected: Story = {
	args: { apply: 'rejected' },
	play: async ({ canvasElement }): Promise<void> => {
		await applyKey(canvasElement);
	},
};
