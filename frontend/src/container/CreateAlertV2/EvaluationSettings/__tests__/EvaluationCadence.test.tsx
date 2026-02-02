import { fireEvent, render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';
import { INITIAL_ADVANCED_OPTIONS_STATE } from 'container/CreateAlertV2/context/constants';

import { TIMEZONE_DATA } from '../constants';
import EvaluationCadence from '../EvaluationCadence';
import { createMockAlertContextState } from './testUtils';

jest.mock('../EvaluationCadence/EditCustomSchedule', () => ({
	__esModule: true,
	default: ({
		setIsPreviewVisible,
	}: {
		setIsPreviewVisible: (isPreviewVisible: boolean) => void;
	}): JSX.Element => (
		<div data-testid="edit-custom-schedule">
			<div>EditCustomSchedule</div>
			<button type="button" onClick={(): void => setIsPreviewVisible(true)}>
				Preview
			</button>
		</div>
	),
}));
jest.mock('../EvaluationCadence/EvaluationCadenceDetails', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="evaluation-cadence-details">EvaluationCadenceDetails</div>
	),
}));
jest.mock('../EvaluationCadence/EvaluationCadencePreview', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="evaluation-cadence-preview">EvaluationCadencePreview</div>
	),
}));

const mockSetAdvancedOptions = jest.fn();
const EVALUATION_CADENCE_DETAILS_TEST_ID = 'evaluation-cadence-details';
const ADD_CUSTOM_SCHEDULE_TEXT = 'Add custom schedule';
const EVALUATION_CADENCE_PREVIEW_TEST_ID = 'evaluation-cadence-preview';

jest.spyOn(alertState, 'useCreateAlertState').mockReturnValue(
	createMockAlertContextState({
		setAdvancedOptions: mockSetAdvancedOptions,
	}),
);

const EVALUATION_CADENCE_INPUT_GROUP = 'evaluation-cadence-input-group';

describe('EvaluationCadence', () => {
	it('should render the title, description, tooltip and input group with default values', () => {
		render(<EvaluationCadence />);
		expect(screen.getByText('How often to check')).toBeInTheDocument();
		expect(
			screen.getByText(
				'How frequently this alert checks your data. Default: Every 1 minute',
			),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('evaluation-cadence-tooltip-icon'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId(EVALUATION_CADENCE_INPUT_GROUP),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Enter time')).toHaveValue(1);
		expect(screen.getByText('Minutes')).toBeInTheDocument();
		// TODO: Uncomment this when add custom schedule button is implemented
		// expect(screen.getByText(ADD_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
	});

	// TODO: Unskip this when add custom schedule button is implemented
	it.skip('should hide the input group when add custom schedule button is clicked', () => {
		render(<EvaluationCadence />);

		expect(
			screen.getByTestId(EVALUATION_CADENCE_INPUT_GROUP),
		).toBeInTheDocument();

		fireEvent.click(screen.getByText(ADD_CUSTOM_SCHEDULE_TEXT));

		expect(
			screen.queryByTestId(EVALUATION_CADENCE_INPUT_GROUP),
		).not.toBeInTheDocument();
		expect(
			screen.getByTestId(EVALUATION_CADENCE_DETAILS_TEST_ID),
		).toBeInTheDocument();
	});

	// TODO: Unskip this when add custom schedule button is implemented
	it.skip('should not show the edit custom schedule component in default mode', () => {
		render(<EvaluationCadence />);
		expect(screen.queryByTestId('edit-custom-schedule')).not.toBeInTheDocument();
	});

	// TODO: Unskip this when add custom schedule button is implemented
	it.skip('should show the custom schedule text when the mode is custom with selected values', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce(
			createMockAlertContextState({
				advancedOptions: {
					...INITIAL_ADVANCED_OPTIONS_STATE,
					evaluationCadence: {
						...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
						mode: 'custom',
						custom: {
							repeatEvery: 'day',
							startAt: '00:00:00',
							occurence: [],
							timezone: TIMEZONE_DATA[0].value,
						},
					},
				},
			}),
		);
		render(<EvaluationCadence />);
		expect(screen.getByTestId('edit-custom-schedule')).toBeInTheDocument();
	});

	it('should not show evaluation cadence details component in default mode', () => {
		render(<EvaluationCadence />);
		expect(
			screen.queryByTestId(EVALUATION_CADENCE_DETAILS_TEST_ID),
		).not.toBeInTheDocument();
	});

	// TODO: Unskip this when add custom schedule button is implemented
	it.skip('should show evaluation cadence details component when clicked on add custom schedule button', () => {
		render(<EvaluationCadence />);

		expect(
			screen.queryByTestId(EVALUATION_CADENCE_DETAILS_TEST_ID),
		).not.toBeInTheDocument();
		expect(screen.getByText(ADD_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
		fireEvent.click(screen.getByText(ADD_CUSTOM_SCHEDULE_TEXT));
		expect(
			screen.getByTestId(EVALUATION_CADENCE_DETAILS_TEST_ID),
		).toBeInTheDocument();
	});

	it('should not show evaluation cadence preview component in default mode', () => {
		render(<EvaluationCadence />);
		expect(
			screen.queryByTestId(EVALUATION_CADENCE_PREVIEW_TEST_ID),
		).not.toBeInTheDocument();
	});

	it('should show evaluation cadence preview component when clicked on preview button in custom mode', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce(
			createMockAlertContextState({
				advancedOptions: {
					...INITIAL_ADVANCED_OPTIONS_STATE,
					evaluationCadence: {
						...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
						mode: 'custom',
					},
				},
			}),
		);
		render(<EvaluationCadence />);
		expect(
			screen.queryByTestId(EVALUATION_CADENCE_PREVIEW_TEST_ID),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByText('Preview'));
		expect(
			screen.getByTestId(EVALUATION_CADENCE_PREVIEW_TEST_ID),
		).toBeInTheDocument();
	});
});
