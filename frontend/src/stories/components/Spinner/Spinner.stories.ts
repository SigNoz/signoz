import type { Meta, StoryObj } from '@storybook/react';
import Spinner from 'components/Spinner';

const meta: Meta<typeof Spinner> = {
	title: 'Documentation/Components/Spinner',
	component: Spinner,
	tags: ['autodocs'],
	argTypes: {},
};

export default meta;

type Story = StoryObj<typeof Spinner>;

export const Size: Story = {
	args: {
		size: 'large',
	},
};

export const CustomStyled: Story = {
	storyName: 'Custom Styled',
	args: {
		size: 'large',
		style: {
			border: '2px solid red',
		},
	},
};

export const Tip: Story = {
	args: {
		size: 'large',
		tip: 'Loading...',
	},
};

export const Height: Story = {
	args: {
		height: '25vh',
	},
};
