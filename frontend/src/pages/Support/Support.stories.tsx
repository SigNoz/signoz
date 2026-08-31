import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import Support from './Support';
import { supportMocks } from './Support.stories.mocks';

type SupportArgs = PageStoryArgs<typeof supportMocks>;

const pageStory = storyMocks(supportMocks);

/**
 * The support page: the channels the plan includes, and the way to premium
 * support.
 *
 * Route: `/support`.
 */
const meta = {
	title: 'Pages/System/Support',
	tags: ['play'],
	component: Support,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<SupportArgs>;

export default meta;

type Story = StoryObj<SupportArgs>;

/** Every way to reach the team or the community, in one place. */
export const Default: Story = {};

/** A plan without chat: the card asks for billing details before the widget. */
export const AddCreditCard: Story = {
	args: { premiumSupport: false },
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByRole('button', { name: /launch chat/i }),
		);
		await within(document.body).findByText(/add a credit card/i);
	},
};
