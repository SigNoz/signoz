/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';
import { INITIAL_ADVANCED_OPTIONS_STATE } from 'container/CreateAlertV2/context/constants';

import EvaluationCadenceDetails from '../EvaluationCadence/EvaluationCadenceDetails';

const INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE = {
	...INITIAL_ADVANCED_OPTIONS_STATE,
	evaluationCadence: {
		...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
		mode: 'custom',
	},
};

const mockSetAdvancedOptions = jest.fn();
jest.spyOn(alertState, 'useCreateAlertState').mockReturnValue({
	advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE,
	setAdvancedOptions: mockSetAdvancedOptions,
} as any);

const mockSetIsOpen = jest.fn();

const SCHEDULE_PREVIEW_TEST_ID = 'schedule-preview';
const NO_SCHEDULE_TEST_ID = 'no-schedule';
const EDITOR_VIEW_TEST_ID = 'editor-view';
const RULE_VIEW_TEST_ID = 'rrule-view';
const SAVE_CUSTOM_SCHEDULE_TEXT = 'Save Custom Schedule';

describe('EvaluationCadenceDetails', () => {
	it('should render the evaluation cadence details component with editor mode in daily occurence by default', () => {
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);
		expect(screen.getByText('Add Custom Schedule')).toBeInTheDocument();

		expect(screen.getByTestId(EDITOR_VIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId('rrule-view')).not.toBeInTheDocument();

		expect(screen.getByText('REPEAT EVERY')).toBeInTheDocument();
		expect(screen.getByText('AT')).toBeInTheDocument();
		expect(screen.getByText('TIMEZONE')).toBeInTheDocument();

		expect(screen.getByTestId(SCHEDULE_PREVIEW_TEST_ID)).toBeInTheDocument();

		expect(screen.getByText('Discard')).toBeInTheDocument();
		expect(screen.getByText(SAVE_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
	});

	it('when switching to rrule mode, the rrule view should be rendered with no schedule preview', () => {
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);
		fireEvent.click(screen.getByText('RRule'));
		expect(screen.getByTestId(RULE_VIEW_TEST_ID)).toBeInTheDocument();

		expect(
			screen.queryByTestId(SCHEDULE_PREVIEW_TEST_ID),
		).not.toBeInTheDocument();
		expect(screen.getByTestId(NO_SCHEDULE_TEST_ID)).toBeInTheDocument();

		expect(screen.getByText('STARTING ON')).toBeInTheDocument();
		expect(screen.getByText('AT')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Enter RRule')).toBeInTheDocument();

		expect(screen.getByText('Discard')).toBeInTheDocument();
		expect(screen.getByText(SAVE_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
	});

	it('when showing weekly occurence, the occurence options should be rendered', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce({
			advancedOptions: {
				...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence,
					custom: {
						...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence
							.custom,
						repeatEvery: 'week',
					},
				},
			},
		} as any);
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);

		// Verify that the "ON DAY(S)" section is rendered for weekly occurrence
		expect(screen.getByText('ON DAY(S)')).toBeInTheDocument();

		// Verify that the schedule preview is not shown because no days are selected
		expect(
			screen.queryByTestId(SCHEDULE_PREVIEW_TEST_ID),
		).not.toBeInTheDocument();
		expect(screen.getByTestId(NO_SCHEDULE_TEST_ID)).toBeInTheDocument();
	});

	it('render schedule preview in weekly occurence when days are selected', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce({
			advancedOptions: {
				...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence,
					custom: {
						...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence
							.custom,
						repeatEvery: 'week',
						occurence: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
					},
				},
			},
		} as any);
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);

		// Verify that the schedule preview is shown because days are selected
		expect(screen.getByTestId(SCHEDULE_PREVIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(NO_SCHEDULE_TEST_ID)).not.toBeInTheDocument();
	});

	it('when showing monthly occurence, the occurence options should be rendered', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce({
			advancedOptions: {
				...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence,
					custom: {
						...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence
							.custom,
						repeatEvery: 'month',
					},
				},
			},
		} as any);
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);

		// Verify that the "ON DAY(S)" section is rendered for monthly occurrence
		expect(screen.getByText('ON DAY(S)')).toBeInTheDocument();

		// Verify that the schedule preview is not shown because no days are selected
		expect(
			screen.queryByTestId(SCHEDULE_PREVIEW_TEST_ID),
		).not.toBeInTheDocument();
		expect(screen.getByTestId(NO_SCHEDULE_TEST_ID)).toBeInTheDocument();
	});

	it('render schedule preview in monthly occurence when days are selected', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce({
			advancedOptions: {
				...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence,
					custom: {
						...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence
							.custom,
						repeatEvery: 'month',
						occurence: ['1'],
					},
				},
			},
		} as any);
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);

		// Verify that the schedule preview is shown because days are selected
		expect(screen.getByTestId(SCHEDULE_PREVIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(NO_SCHEDULE_TEST_ID)).not.toBeInTheDocument();
	});

	it('discard action works correctly', () => {
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);
		fireEvent.click(screen.getByText('Discard'));
		expect(mockSetIsOpen).toHaveBeenCalledWith(false);
		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: 'default',
		});
	});

	it('save custom schedule action works correctly', () => {
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);
		fireEvent.click(screen.getByText(SAVE_CUSTOM_SCHEDULE_TEXT));
		expect(mockSetAdvancedOptions).toHaveBeenCalledTimes(2);
		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_EVALUATION_CADENCE',
			payload: {
				...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence,
				custom: {
					...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence
						.custom,
				},
			},
		});
		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: 'custom',
		});
	});
});
