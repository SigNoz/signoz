import { fireEvent, screen, waitFor } from '@testing-library/react';
import { render as customRender } from 'tests/test-utils';
import { ProcessorData } from 'types/api/pipeline/def';

import { pipelineMockData } from '../mocks/pipeline';
import AddNewProcessor from '../PipelineListsView/AddNewProcessor';

// Mock the config module to set JSON parser as default
jest.mock('../PipelineListsView/AddNewProcessor/config', () => ({
	...jest.requireActual('../PipelineListsView/AddNewProcessor/config'),
	DEFAULT_PROCESSOR_TYPE: 'json_parser',
}));

const selectedProcessorData = {
	id: '1',
	orderId: 1,
	type: 'json_parser',
	name: 'json parser',
	output: 'jsonparser',
};

// Constants for repeated text
const ENABLE_PATHS_TEXT = 'Enable Paths';
const ENABLE_MAPPING_TEXT = 'Enable Mapping';
const PATH_PREFIX_LABEL = 'Path Prefix';

// Helper function to render AddNewProcessor with JSON parser type
const renderJsonProcessor = ({
	selectedProcessorData: processorData = selectedProcessorData,
	isActionType = 'add-processor',
}: {
	selectedProcessorData?: ProcessorData;
	isActionType?: 'add-processor' | 'edit-processor';
}): ReturnType<typeof customRender> => {
	const defaultProps = {
		isActionType,
		setActionType: jest.fn(),
		selectedProcessorData: processorData,
		setShowSaveButton: jest.fn(),
		expandedPipelineData: pipelineMockData[2],
		setExpandedPipelineData: jest.fn(),
	};

	// eslint-disable-next-line react/jsx-props-no-spreading
	return customRender(<AddNewProcessor {...defaultProps} />);
};

describe('JSON Flattening Processor Tests', () => {
	describe('Enable/Disable Flattening', () => {
		it('should display the form when enable flattening is turned on', async () => {
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: true,
				},
			});

			// Verify the JSON flattening form is displayed
			expect(screen.queryByText(ENABLE_PATHS_TEXT)).toBeInTheDocument();
			expect(screen.queryByText(ENABLE_MAPPING_TEXT)).toBeInTheDocument();
		});
		it('should not display the form when enable flattening is turned off', async () => {
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: false,
				},
			});

			// Verify the JSON flattening form is not displayed
			expect(screen.queryByText(ENABLE_PATHS_TEXT)).not.toBeInTheDocument();
			expect(screen.queryByText(ENABLE_MAPPING_TEXT)).not.toBeInTheDocument();
		});
		it('should display the form when enable flattening switch is toggled on', async () => {
			renderJsonProcessor({});

			// Wait for the component to render and find the enable flattening switch
			await waitFor(() => {
				expect(screen.getByRole('switch')).toBeInTheDocument();
			});

			// Find the enable flattening switch
			const enableFlatteningSwitch = screen.getByRole('switch');
			// Turn on the switch
			fireEvent.click(enableFlatteningSwitch);

			// Verify the JSON flattening form is displayed
			await waitFor(() => {
				expect(screen.getByText(ENABLE_PATHS_TEXT)).toBeInTheDocument();
				expect(screen.getByText(ENABLE_MAPPING_TEXT)).toBeInTheDocument();
			});
		});
		it('should hide the form when enable flattening switch is toggled off', async () => {
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: true,
				},
			});

			// Wait for the component to render and find the switches
			await waitFor(() => {
				expect(screen.getAllByRole('switch')[0]).toBeInTheDocument();
			});

			// Find the enable flattening switch
			const enableFlatteningSwitch = screen.getAllByRole('switch')[0];
			// Turn off the switch
			fireEvent.click(enableFlatteningSwitch);
			await waitFor(() => {
				expect(screen.queryByText(ENABLE_PATHS_TEXT)).not.toBeInTheDocument();
				expect(screen.queryByText(ENABLE_MAPPING_TEXT)).not.toBeInTheDocument();
			});
		});
	});

	describe('Enable/Disable Paths', () => {
		it('should toggle path prefix visibility when enable paths switch is toggled', async () => {
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: true,
					enable_paths: false,
				},
			});

			// Wait for the component to render and find the switches
			await waitFor(() => {
				expect(screen.getAllByRole('switch')[1]).toBeInTheDocument();
			});

			// In add mode, enable_paths is always true initially, so the path prefix should be visible
			await waitFor(() => {
				expect(screen.getByLabelText(PATH_PREFIX_LABEL)).toBeInTheDocument();
			});

			// Find the enable paths switch (second switch in the form) and turn it off
			const enablePathsSwitch = screen.getAllByRole('switch')[1];
			fireEvent.click(enablePathsSwitch);

			// Verify the path prefix field is now hidden
			await waitFor(() => {
				expect(screen.queryByLabelText(PATH_PREFIX_LABEL)).not.toBeInTheDocument();
			});

			// Turn the paths switch back on
			fireEvent.click(enablePathsSwitch);

			// Verify the path prefix field is displayed again
			await waitFor(() => {
				expect(screen.getByLabelText(PATH_PREFIX_LABEL)).toBeInTheDocument();
			});
		});
		it('should hide path prefix when enable paths switch is turned off', async () => {
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: true,
					enable_paths: true,
				},
			});

			// Wait for the component to render and find the switches
			await waitFor(() => {
				expect(screen.getAllByRole('switch')[1]).toBeInTheDocument();
			});

			// Verify the path prefix is initially visible
			await waitFor(() => {
				expect(screen.getByLabelText(PATH_PREFIX_LABEL)).toBeInTheDocument();
			});

			// Find the enable paths switch and turn it off
			const enablePathsSwitch = screen.getAllByRole('switch')[1];
			fireEvent.click(enablePathsSwitch);

			// Verify the path prefix field is now hidden
			await waitFor(() => {
				expect(screen.queryByLabelText(PATH_PREFIX_LABEL)).not.toBeInTheDocument();
			});
		});
	});

	describe('Enable/Disable Mapping', () => {
		it('should display the mapping fields when enable mapping is turned on', async () => {
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: true,
					enable_paths: true,
					mapping: {
						environment: ['existing.env'],
						host: ['existing.host'],
					},
				},
			});

			// Verify the mapping fields are displayed
			await waitFor(() => {
				expect(screen.getByText('environment')).toBeInTheDocument();
				expect(screen.getByText('host')).toBeInTheDocument();
			});
		});
	});

	describe('Edit Processor Flow', () => {
		it('should load existing processor data correctly when editing', async () => {
			const existingProcessorData = {
				id: '1',
				orderId: 1,
				type: 'json_parser',
				name: 'test json parser',
				output: 'testoutput',
				enable_flattening: true,
				enable_paths: true,
				path_prefix: 'existing.prefix',
				enable_mapping: true,
				mapping: {
					environment: ['existing.env'],
					host: ['existing.host'],
				},
			};

			renderJsonProcessor({
				selectedProcessorData: existingProcessorData,
				isActionType: 'edit-processor',
			});

			// Verify the form is displayed with existing data
			await waitFor(() => {
				expect(screen.getByDisplayValue('existing.prefix')).toBeInTheDocument();
			});

			// Verify flattening is enabled
			const enableFlatteningSwitch = screen.getAllByRole('switch')[0];
			expect(enableFlatteningSwitch).toBeChecked();

			// Verify paths is enabled
			const enablePathsSwitch = screen.getAllByRole('switch')[1];
			expect(enablePathsSwitch).toBeChecked();
		});
	});
});
