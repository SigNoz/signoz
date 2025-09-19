import { render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';
import { INITIAL_ADVANCED_OPTIONS_STATE } from 'container/CreateAlertV2/context/constants';

import { TIMEZONE_DATA } from '../constants';
import EvaluationCadencePreview from '../EvaluationCadence/EvaluationCadencePreview';

jest.spyOn(alertState, 'useCreateAlertState').mockReturnValue({
	advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE,
} as any);

const mockSetIsOpen = jest.fn();

describe('EvaluationCadencePreview', () => {
	it('should render list of dates when schedule is generated', () => {
		render(<EvaluationCadencePreview isOpen setIsOpen={mockSetIsOpen} />);
		expect(screen.getByTestId('schedule-preview')).toBeInTheDocument();
	});

	it('should render empty state when no schedule is generated', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce({
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
		} as any);
		render(<EvaluationCadencePreview isOpen setIsOpen={mockSetIsOpen} />);
		expect(screen.getByTestId('no-schedule')).toBeInTheDocument();
	});
});
