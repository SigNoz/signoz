import type { Meta, StoryObj } from '@storybook/react';

import { Header } from './Header';

const meta: Meta<typeof Header> = {
	title: 'Tutorial/Header',
	component: Header,
	// This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
	tags: ['autodocs'],
	parameters: {
		// More on Story layout: https://storybook.js.org/docs/react/configure/story-layout
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<typeof Header>;

export const LoggedIn: Story = {
	args: {
		user: {
			name: 'Jane Doe',
		},
	},
};

export const LoggedOut: Story = {};
