import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

import Spinner from '../components/Spinner';

export default {
	title: 'Components/Common',
	component: Spinner,
} as ComponentMeta<typeof Spinner>;

const Template: ComponentStory<typeof Spinner> = (args) => (
	<Spinner {...args} />
);

export const DefaultSpinner = Template.bind({});

DefaultSpinner.args = {
	tip: 'Loading...',
	size: 'default',
	height: '40vh',
};
