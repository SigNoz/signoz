import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { screen, userEvent } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { dashboardMocks } from '../DashboardPage.stories.mocks';
import {
	findPreviewValue,
	openNewVariable,
	openVariableSelect,
	pickVariableType,
	typeVariableName,
} from './settingsPlay';

import DashboardPage from '../../DashboardPage';

type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;

const pageStory = storyMocks(dashboardMocks, { layout: 'app' });

/**
 * The variable editor on a new variable, reached from Add variable in the
 * Variables tab: each type's own fields, the pickers they open, and the name
 * and attribute checks that keep Save disabled.
 *
 * Route: `/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Detail/New Variable',
	tags: ['authz', 'play'],
	component: DashboardPage as ComponentType<DashboardArgs>,
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD} component={DashboardPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DashboardArgs>;

export default meta;

type Story = StoryObj<DashboardArgs>;

/** The editor as it opens, on the Dynamic type with no field picked. */
export const Default: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
	},
};

/** The dynamic variable's field picker, open on the attributes it can read. */
export const FieldPickerOpen: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await openVariableSelect('variable-field-select');
		await screen.findByRole(
			'option',
			{ name: 'k8s.cluster.name' },
			{ timeout: 10000 },
		);
	},
};

/** The telemetry source the field is read from, open. */
export const SignalPickerOpen: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await openVariableSelect('variable-signal-select');
		await screen.findByTitle('Traces');
	},
};

/**
 * A field picked: the name follows it until typed over, and the values it
 * resolves to fill the preview and the default value.
 */
export const DynamicFieldPicked: Story = {
	play: async (context) => {
		await FieldPickerOpen.play?.(context);
		await userEvent.click(
			screen.getByRole('option', { name: 'k8s.cluster.name' }),
		);
		await findPreviewValue('prod-us-east-1');
	},
};

/** A field another dynamic variable already reads, which Save refuses. */
export const AttributeTaken: Story = {
	play: async (context) => {
		await FieldPickerOpen.play?.(context);
		await userEvent.click(
			screen.getByRole('option', { name: 'k8s.namespace.name' }),
		);
		await screen.findByText('A variable with this attribute key already exists');
	},
};

/** The panels the new filter can be added to, open. */
export const ApplyToPanelsOpen: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await openVariableSelect('variable-apply-panels');
		await screen.findByRole('listbox');
	},
};

/** A name typed and cleared again. */
export const NameRequired: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await userEvent.type(screen.getByTestId('variable-name'), 'x{Backspace}');
		await screen.findByText('Variable name is required');
	},
};

/** A name another variable on the dashboard has. */
export const NameTaken: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await typeVariableName('environment');
		await screen.findByText('Variable name already exists');
	},
};

/** A name with a space in it, which a `$name` reference could not spell. */
export const NameWithSpaces: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await typeVariableName('build id');
		await screen.findByText('Variable name cannot contain whitespaces');
	},
};

/** A Textbox variable: a free-text value with an optional default. */
export const Textbox: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await typeVariableName('region');
		await pickVariableType('textbox');
		await userEvent.type(
			await screen.findByTestId('variable-text-input'),
			'us-east-1',
		);
	},
};

/**
 * A Custom variable with its options typed in, previewed as they are parsed,
 * and multiple values on, which adds the ALL option toggle.
 */
export const Custom: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await typeVariableName('region');
		await pickVariableType('custom');
		await userEvent.type(
			await screen.findByTestId('variable-custom-input'),
			'us-east-1,eu-west-1,ap-south-1',
		);
		await userEvent.click(screen.getByTestId('variable-multi-switch'));
		await screen.findByText('Include an option for ALL values');
	},
};

/** The Custom variable's default value picker, open on the parsed options. */
export const CustomDefaultOpen: Story = {
	play: async (context) => {
		await Custom.play?.(context);
		await openVariableSelect('variable-default-select');
		await screen.findByRole('option', { name: 'eu-west-1' });
	},
};

/** A Query variable before its query is written: Test Run waits for one. */
export const Query: Story = {
	play: async ({ canvasElement }) => {
		await openNewVariable(canvasElement);
		await pickVariableType('query');
		await screen.findByText('Test Run Query');
	},
};
