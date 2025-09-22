import { render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';
import { INITIAL_ADVANCED_OPTIONS_STATE } from 'container/CreateAlertV2/context/constants';

import { TIMEZONE_DATA } from '../constants';
import EvaluationCadencePreview, {
	ScheduleList,
} from '../EvaluationCadence/EvaluationCadencePreview';
import { createMockAlertContextState } from './testUtils';

jest
	.spyOn(alertState, 'useCreateAlertState')
	.mockReturnValue(createMockAlertContextState());

const mockSetIsOpen = jest.fn();

describe('EvaluationCadencePreview', () => {
	it('should render list of dates when schedule is generated', () => {
		render(<EvaluationCadencePreview isOpen setIsOpen={mockSetIsOpen} />);
		expect(screen.getByTestId('schedule-preview')).toBeInTheDocument();
	});

	it('should render empty state when no schedule is generated', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce(
			createMockAlertContextState({
				advancedOptions: {
					...INITIAL_ADVANCED_OPTIONS_STATE,
					evaluationCadence: {
						...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
						mode: 'custom',
						custom: {
							repeatEvery: 'week',
							startAt: '00:00:00',
							occurence: [],
							timezone: TIMEZONE_DATA[0].value,
						},
					},
				},
			}),
		);
		render(<EvaluationCadencePreview isOpen setIsOpen={mockSetIsOpen} />);
		expect(screen.getByTestId('no-schedule')).toBeInTheDocument();
	});
});

describe('ScheduleList', () => {
	const schedule = [
		new Date('2024-01-15T00:00:00Z'),
		new Date('2024-01-16T00:00:00Z'),
		new Date('2024-01-17T00:00:00Z'),
		new Date('2024-01-18T00:00:00Z'),
		new Date('2024-01-19T00:00:00Z'),
	];
	it('should render list of dates when schedule is generated', () => {
		render(
			<ScheduleList
				schedule={schedule}
				currentTimezone={TIMEZONE_DATA[0].value}
			/>,
		);
		expect(
			screen.queryByText(
				'Please fill the relevant information to generate a schedule',
			),
		).not.toBeInTheDocument();

		// Verify all dates are rendered correctly
		schedule.forEach((date) => {
			const dateString = date.toLocaleDateString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
			});
			const timeString = date.toLocaleTimeString('en-US', {
				hour12: false,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			});
			const combinedString = `${dateString}, ${timeString}`;
			expect(screen.getByText(combinedString)).toBeInTheDocument();
		});

		// Verify timezone is rendered correctly with each date
		const timezoneElements = screen.getAllByText(TIMEZONE_DATA[0].label);
		expect(timezoneElements).toHaveLength(schedule.length);
	});
});
