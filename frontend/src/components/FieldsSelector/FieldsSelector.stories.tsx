import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent } from 'storybook/test';
import { DataSource } from 'types/common/queryBuilder';

import FieldsSelector from './FieldsSelector';
import {
	fieldSuggestionsHandlers,
	noFieldSuggestionsHandlers,
} from './FieldsSelector.stories.mocks';

const meta = {
	title: 'Components/Fields Selector',
	component: FieldsSelector,
	tags: ['play'],
	args: {
		allowCustomFields: true,
		defaultPosition: { x: 40, y: 40 },
		fields: [
			{
				fieldContext: 'log',
				fieldDataType: 'string',
				name: 'timestamp',
				signal: 'logs',
			},
		],
		height: 560,
		isOpen: true,
		onClose: (): void => undefined,
		onFieldsChange: (): void => undefined,
		signal: DataSource.LOGS,
		title: 'Edit log columns',
		width: 420,
	},
	parameters: {
		msw: {
			handlers: fieldSuggestionsHandlers,
		},
	},
} satisfies Meta<typeof FieldsSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Open: the draggable field editor shows its selected and available columns. */
export const Open: Story = {};

/** Mutation: adding a suggested field exposes the real unsaved-change footer. */
export const UnsavedChanges: Story = {
	play: async (): Promise<void> => {
		// One Add per suggested field, so the first row's is the one clicked.
		const [addField] = await screen.findAllByRole('button', { name: 'Add' });

		await userEvent.click(addField);
		await screen.findByRole('button', { name: 'Save changes' });
	},
};

/** Empty: the suggestion request succeeds with no columns to add. */
export const NoResults: Story = {
	parameters: {
		msw: {
			handlers: noFieldSuggestionsHandlers,
		},
	},
};

/** Limit: available columns cannot be added once the configured maximum is reached. */
export const MaximumFields: Story = {
	args: {
		fields: [
			{
				fieldContext: 'log',
				fieldDataType: 'string',
				name: 'timestamp',
				signal: 'logs',
			},
			{
				fieldContext: 'log',
				fieldDataType: 'string',
				name: 'severity_text',
				signal: 'logs',
			},
		],
		maxFields: 2,
	},
};

/** Required: mandatory fields remain present without removal controls. */
export const RequiredFields: Story = {
	args: {
		fields: [
			{
				fieldContext: 'resource',
				fieldDataType: 'string',
				name: 'service.name',
				signal: 'logs',
			},
		],
		requiredFields: ['resource:service.name:string'],
	},
};
