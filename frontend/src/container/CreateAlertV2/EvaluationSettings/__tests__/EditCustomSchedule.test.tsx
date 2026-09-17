import { fireEvent, render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';
import { INITIAL_ADVANCED_OPTIONS_STATE } from 'container/CreateAlertV2/context/constants';

import { TIMEZONE_DATA } from '../constants';
import EditCustomSchedule from '../EvaluationCadence/EditCustomSchedule';
import { createMockAlertContextState } from './testUtils';

// Browser mode has no SSR transform, so a real ESM namespace is frozen and
// `vi.spyOn` on it throws. `vi.mock(..., { spy: true })` routes the module
// through the mocker instead, which works in both environments.
vi.mock('container/CreateAlertV2/context', { spy: true });

const mockSetAdvancedOptions = vi.fn();
vi.mocked(alertState.useCreateAlertState).mockReturnValue(
	createMockAlertContextState({
		setAdvancedOptions: mockSetAdvancedOptions,
	}),
);

const mockSetIsEvaluationCadenceDetailsVisible = vi.fn();
const mockSetIsPreviewVisible = vi.fn();

const EDIT_CUSTOM_SCHEDULE_TEST_ID = '.edit-custom-schedule';

describe('EditCustomSchedule', () => {
	it('should render the correct display text for custom mode with daily occurrence', () => {
		vi.mocked(alertState.useCreateAlertState).mockReturnValueOnce(
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
		render(
			<EditCustomSchedule
				setIsEvaluationCadenceDetailsVisible={
					mockSetIsEvaluationCadenceDetailsVisible
				}
				setIsPreviewVisible={mockSetIsPreviewVisible}
			/>,
		);

		// Use textContent to verify the complete text across multiple Typography components
		const container = screen
			.getByText('Every')
			.closest(EDIT_CUSTOM_SCHEDULE_TEST_ID);
		expect(container).toHaveTextContent('EveryDayat00:00:00');
	});

	it('should render the correct display text for custom mode with weekly occurrence', () => {
		vi.mocked(alertState.useCreateAlertState).mockReturnValueOnce(
			createMockAlertContextState({
				advancedOptions: {
					...INITIAL_ADVANCED_OPTIONS_STATE,
					evaluationCadence: {
						...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
						mode: 'custom',
						custom: {
							repeatEvery: 'week',
							startAt: '00:00:00',
							occurence: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
							timezone: TIMEZONE_DATA[0].value,
						},
					},
				},
			}),
		);

		render(
			<EditCustomSchedule
				setIsEvaluationCadenceDetailsVisible={
					mockSetIsEvaluationCadenceDetailsVisible
				}
				setIsPreviewVisible={mockSetIsPreviewVisible}
			/>,
		);

		const container = screen
			.getByText('Every')
			.closest(EDIT_CUSTOM_SCHEDULE_TEST_ID);
		expect(container).toHaveTextContent(
			'EveryWeekonMonday, Tuesday, Wednesday, Thursday, Fridayat00:00:00',
		);
	});

	it('should render the correct display text for custom mode with monthly occurrence', () => {
		vi.mocked(alertState.useCreateAlertState).mockReturnValueOnce(
			createMockAlertContextState({
				advancedOptions: {
					...INITIAL_ADVANCED_OPTIONS_STATE,
					evaluationCadence: {
						...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
						mode: 'custom',
						custom: {
							repeatEvery: 'month',
							startAt: '00:00:00',
							occurence: ['1'],
							timezone: TIMEZONE_DATA[0].value,
						},
					},
				},
			}),
		);

		render(
			<EditCustomSchedule
				setIsEvaluationCadenceDetailsVisible={
					mockSetIsEvaluationCadenceDetailsVisible
				}
				setIsPreviewVisible={mockSetIsPreviewVisible}
			/>,
		);

		const container = screen
			.getByText('Every')
			.closest(EDIT_CUSTOM_SCHEDULE_TEST_ID);
		expect(container).toHaveTextContent('EveryMonthon1at00:00:00');
	});

	it('edit custom schedule action works correctly', () => {
		render(
			<EditCustomSchedule
				setIsEvaluationCadenceDetailsVisible={
					mockSetIsEvaluationCadenceDetailsVisible
				}
				setIsPreviewVisible={mockSetIsPreviewVisible}
			/>,
		);

		fireEvent.click(screen.getByText('Edit custom schedule'));
		expect(mockSetIsEvaluationCadenceDetailsVisible).toHaveBeenCalledWith(true);
		expect(mockSetIsPreviewVisible).not.toHaveBeenCalled();
	});

	it('preview custom schedule action works correctly', () => {
		render(
			<EditCustomSchedule
				setIsEvaluationCadenceDetailsVisible={
					mockSetIsEvaluationCadenceDetailsVisible
				}
				setIsPreviewVisible={mockSetIsPreviewVisible}
			/>,
		);

		fireEvent.click(screen.getByText('Preview'));
		expect(mockSetIsPreviewVisible).toHaveBeenCalledWith(true);
		expect(mockSetIsEvaluationCadenceDetailsVisible).not.toHaveBeenCalled();
	});
});
