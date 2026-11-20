import {
	render as customRender,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';
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
const PATH_PREFIX_TEST_ID = 'path-prefix-input';

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
			const user = userEvent.setup();
			renderJsonProcessor({});

			// Turn on the enable flattening switch
			await user.click(await screen.findByTestId('enable-flattening-switch'));

			// Verify the JSON flattening form is displayed
			await waitFor(() => {
				expect(screen.getByText(ENABLE_PATHS_TEXT)).toBeInTheDocument();
				expect(screen.getByText(ENABLE_MAPPING_TEXT)).toBeInTheDocument();
			});
		});
		it('should hide the form when enable flattening switch is toggled off', async () => {
			const user = userEvent.setup();
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: true,
				},
			});

			// Turn off the enable flattening switch
			await user.click(await screen.findByTestId('enable-flattening-switch'));
			await waitFor(() => {
				expect(screen.queryByText(ENABLE_PATHS_TEXT)).not.toBeInTheDocument();
				expect(screen.queryByText(ENABLE_MAPPING_TEXT)).not.toBeInTheDocument();
			});
		});
	});

	describe('Enable/Disable Paths', () => {
		it('should toggle path prefix visibility when enable paths switch is toggled', async () => {
			const user = userEvent.setup();
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: true,
					enable_paths: false,
				},
			});

			// In add mode, enable_paths is always true initially, so the path prefix should be visible
			await expect(
				screen.findByTestId(PATH_PREFIX_TEST_ID),
			).resolves.toBeInTheDocument();

			// Turn the enable paths switch off
			const enablePathsSwitch = screen.getByTestId('enable-paths-switch');
			await user.click(enablePathsSwitch);

			// Verify the path prefix field is now hidden
			await waitFor(() => {
				expect(screen.queryByTestId(PATH_PREFIX_TEST_ID)).not.toBeInTheDocument();
			});

			// Turn the paths switch back on
			await user.click(enablePathsSwitch);

			// Verify the path prefix field is displayed again
			await expect(
				screen.findByTestId(PATH_PREFIX_TEST_ID),
			).resolves.toBeInTheDocument();
		});
		it('should hide path prefix when enable paths switch is turned off', async () => {
			const user = userEvent.setup();
			renderJsonProcessor({
				selectedProcessorData: {
					...selectedProcessorData,
					enable_flattening: true,
					enable_paths: true,
				},
			});

			// Verify the path prefix is initially visible
			await expect(
				screen.findByTestId(PATH_PREFIX_TEST_ID),
			).resolves.toBeInTheDocument();

			// Turn the enable paths switch off
			await user.click(screen.getByTestId('enable-paths-switch'));

			// Verify the path prefix field is now hidden
			await waitFor(() => {
				expect(screen.queryByTestId(PATH_PREFIX_TEST_ID)).not.toBeInTheDocument();
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
			await expect(screen.findByTestId(PATH_PREFIX_TEST_ID)).resolves.toHaveValue(
				'existing.prefix',
			);

			// Verify flattening is enabled
			expect(screen.getByTestId('enable-flattening-switch')).toBeChecked();

			// Verify paths is enabled
			expect(screen.getByTestId('enable-paths-switch')).toBeChecked();
		});
	});
});
