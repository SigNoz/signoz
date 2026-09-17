import { fireEvent, render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';
import { INITIAL_ADVANCED_OPTIONS_STATE } from 'container/CreateAlertV2/context/constants';
import { AdvancedOptionsState } from 'container/CreateAlertV2/context/types';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import EvaluationCadenceDetails from '../EvaluationCadence/EvaluationCadenceDetails';
import { createMockAlertContextState } from './testUtils';

dayjs.extend(utc);
dayjs.extend(timezone);

const ENTER_RRULE_PLACEHOLDER = 'Enter RRule';

// Frozen "now" for this file (21 Jan 2025). See the note below on why time is
// frozen with fake timers instead of a dayjs module mock.
const FROZEN_NOW = new Date('2025-01-21T16:31:36.982Z');

// Freezing "now" at 21 Jan 2025 by mocking the 'dayjs' module does not work
// here, nor does pinning `dayjs.tz.guess()` that way: in browser
// mode the default import of a mocked pre-bundled (CJS) dependency lands on
// the whole factory record instead of its `default` export (verified with a
// probe: jsdom reads `.default`, browser reads the record), so the component
// would receive a non-callable. Freeze time with fake timers and stub `guess`
// (a plain-object method, safe for `vi.spyOn`) instead — same observable
// behaviour in both environments.
vi.spyOn(dayjs.tz, 'guess').mockReturnValue('Asia/Saigon');

beforeEach(() => {
	vi.useFakeTimers();
	// 21 Jan 2025
	vi.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
	vi.useRealTimers();
});

const INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE: AdvancedOptionsState =
	{
		...INITIAL_ADVANCED_OPTIONS_STATE,
		evaluationCadence: {
			...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
			mode: 'custom',
		},
	};

const mockSetAdvancedOptions = vi.fn();
// Browser mode has no SSR transform, so a real ESM namespace is frozen and
// `vi.spyOn` on it throws. `vi.mock(..., { spy: true })` routes the module
// through the mocker instead, which works in both environments.
vi.mock('container/CreateAlertV2/context', { spy: true });
vi.mocked(alertState.useCreateAlertState).mockReturnValue(
	createMockAlertContextState({
		advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE,
		setAdvancedOptions: mockSetAdvancedOptions,
	}),
);

const mockSetIsOpen = vi.fn();
const mockSetIsCustomScheduleButtonVisible = vi.fn();

const SCHEDULE_PREVIEW_TEST_ID = 'schedule-preview';
const NO_SCHEDULE_TEST_ID = 'no-schedule';
const EDITOR_VIEW_TEST_ID = 'editor-view';
const RULE_VIEW_TEST_ID = 'rrule-view';
const SAVE_CUSTOM_SCHEDULE_TEXT = 'Save Custom Schedule';

describe('EvaluationCadenceDetails', () => {
	it('should render the evaluation cadence details component with editor mode in daily occurence by default', () => {
		render(
			<EvaluationCadenceDetails
				isOpen
				setIsOpen={mockSetIsOpen}
				setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
			/>,
		);
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
		render(
			<EvaluationCadenceDetails
				isOpen
				setIsOpen={mockSetIsOpen}
				setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
			/>,
		);
		fireEvent.click(screen.getByText('RRule'));
		expect(screen.getByTestId(RULE_VIEW_TEST_ID)).toBeInTheDocument();

		expect(
			screen.queryByTestId(SCHEDULE_PREVIEW_TEST_ID),
		).not.toBeInTheDocument();
		expect(screen.getByTestId(NO_SCHEDULE_TEST_ID)).toBeInTheDocument();

		expect(screen.getByText('STARTING ON')).toBeInTheDocument();
		expect(screen.getByText('AT')).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(ENTER_RRULE_PLACEHOLDER),
		).toBeInTheDocument();

		expect(screen.getByText('Discard')).toBeInTheDocument();
		expect(screen.getByText(SAVE_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
	});

	it('when showing weekly occurence, the occurence options should be rendered', () => {
		vi.mocked(alertState.useCreateAlertState).mockReturnValueOnce(
			createMockAlertContextState({
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
			}),
		);
		render(
			<EvaluationCadenceDetails
				isOpen
				setIsOpen={mockSetIsOpen}
				setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
			/>,
		);

		// Verify that the "ON DAY(S)" section is rendered for weekly occurrence
		expect(screen.getByText('ON DAY(S)')).toBeInTheDocument();

		// Verify that the schedule preview is shown as today is selected by default
		expect(screen.getByTestId(SCHEDULE_PREVIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(NO_SCHEDULE_TEST_ID)).not.toBeInTheDocument();
	});

	it('render schedule preview in weekly occurence when days are selected', () => {
		vi.mocked(alertState.useCreateAlertState).mockReturnValueOnce(
			createMockAlertContextState({
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
			}),
		);
		render(
			<EvaluationCadenceDetails
				isOpen
				setIsOpen={mockSetIsOpen}
				setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
			/>,
		);

		// Verify that the schedule preview is shown because days are selected
		expect(screen.getByTestId(SCHEDULE_PREVIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(NO_SCHEDULE_TEST_ID)).not.toBeInTheDocument();
	});

	it('when showing monthly occurence, the occurence options should be rendered', () => {
		vi.mocked(alertState.useCreateAlertState).mockReturnValueOnce(
			createMockAlertContextState({
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
			}),
		);
		render(
			<EvaluationCadenceDetails
				isOpen
				setIsOpen={mockSetIsOpen}
				setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
			/>,
		);

		// Verify that the "ON DAY(S)" section is rendered for monthly occurrence
		expect(screen.getByText('ON DAY(S)')).toBeInTheDocument();

		// Verify that the schedule preview is  shown as today is selected by default
		expect(screen.getByTestId(SCHEDULE_PREVIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(NO_SCHEDULE_TEST_ID)).not.toBeInTheDocument();
	});

	it('render schedule preview in monthly occurence when days are selected', () => {
		vi.mocked(alertState.useCreateAlertState).mockReturnValueOnce(
			createMockAlertContextState({
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
			}),
		);
		render(
			<EvaluationCadenceDetails
				isOpen
				setIsOpen={mockSetIsOpen}
				setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
			/>,
		);

		// Verify that the schedule preview is shown because days are selected
		expect(screen.getByTestId(SCHEDULE_PREVIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(NO_SCHEDULE_TEST_ID)).not.toBeInTheDocument();
	});

	it('discard action works correctly', () => {
		render(
			<EvaluationCadenceDetails
				isOpen
				setIsOpen={mockSetIsOpen}
				setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
			/>,
		);
		fireEvent.click(screen.getByText('Discard'));
		expect(mockSetIsOpen).toHaveBeenCalledWith(false);
		expect(mockSetIsCustomScheduleButtonVisible).toHaveBeenCalledWith(true);
	});

	it('save custom schedule action works correctly', () => {
		render(
			<EvaluationCadenceDetails
				isOpen
				setIsOpen={mockSetIsOpen}
				setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
			/>,
		);
		fireEvent.click(screen.getByText(SAVE_CUSTOM_SCHEDULE_TEXT));
		expect(mockSetAdvancedOptions).toHaveBeenCalledTimes(2);
		// The component stamps `startAt` from `dayjs()` at render time, which is
		// the frozen clock here, while INITIAL_*_STATE was built at import time
		// from the real clock — so the expected payload pins both `startAt`
		// fields to the frozen instant (rendered in the local timezone, exactly
		// as the component formats it) instead of spreading INITIAL's.
		const expectedStartAt = dayjs(FROZEN_NOW).format('HH:mm:ss');
		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_EVALUATION_CADENCE',
			payload: {
				...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence,
				custom: {
					...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence
						.custom,
					startAt: expectedStartAt,
					// today selected by default
					occurence: [new Date().getDate().toString()],
				},
				rrule: {
					...INITIAL_ADVANCED_OPTIONS_STATE_WITH_CUSTOM_SCHEDULE.evaluationCadence
						.rrule,
					startAt: expectedStartAt,
				},
			},
		});
		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: 'custom',
		});
	});

	describe('alert context mock state verification', () => {
		it('should set the evaluation cadence tab to rrule from custom', () => {
			render(
				<EvaluationCadenceDetails
					isOpen
					setIsOpen={mockSetIsOpen}
					setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
				/>,
			);

			// Switch to RRule tab
			fireEvent.click(screen.getByText('RRule'));
			expect(screen.getByTestId(RULE_VIEW_TEST_ID)).toBeInTheDocument();
			expect(screen.queryByTestId(EDITOR_VIEW_TEST_ID)).not.toBeInTheDocument();

			// Type in the text box
			expect(screen.getByPlaceholderText(ENTER_RRULE_PLACEHOLDER)).toHaveValue('');
			fireEvent.change(screen.getByPlaceholderText(ENTER_RRULE_PLACEHOLDER), {
				target: { value: 'RRULE:FREQ=DAILY' },
			});
			// Ensure text box content is updated
			expect(screen.getByPlaceholderText(ENTER_RRULE_PLACEHOLDER)).toHaveValue(
				'RRULE:FREQ=DAILY',
			);
		});

		it('ensure rrule content is not modified by previous test', () => {
			render(
				<EvaluationCadenceDetails
					isOpen
					setIsOpen={mockSetIsOpen}
					setIsCustomScheduleButtonVisible={mockSetIsCustomScheduleButtonVisible}
				/>,
			);

			// Switch to RRule tab
			fireEvent.click(screen.getByText('RRule'));
			expect(screen.getByTestId(RULE_VIEW_TEST_ID)).toBeInTheDocument();
			expect(screen.queryByTestId(EDITOR_VIEW_TEST_ID)).not.toBeInTheDocument();

			// Verify text box content
			expect(screen.getByPlaceholderText(ENTER_RRULE_PLACEHOLDER)).toHaveValue('');
		});
	});
});
