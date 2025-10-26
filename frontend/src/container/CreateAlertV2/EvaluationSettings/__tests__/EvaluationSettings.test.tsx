import { render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';

import EvaluationSettings from '../EvaluationSettings';
import { createMockAlertContextState } from './testUtils';

jest.mock('container/CreateAlertV2/utils', () => ({
	...jest.requireActual('container/CreateAlertV2/utils'),
}));

const mockSetEvaluationWindow = jest.fn();
jest.spyOn(alertState, 'useCreateAlertState').mockReturnValue(
	createMockAlertContextState({
		setEvaluationWindow: mockSetEvaluationWindow,
	}),
);

describe('EvaluationSettings', () => {
	it('should render the condensed evaluation settings layout', () => {
		render(<EvaluationSettings />);
		expect(
			screen.getByTestId('condensed-evaluation-settings-container'),
		).toBeInTheDocument();
		// Verify that default option is selected
		expect(screen.getByText('Rolling')).toBeInTheDocument();
		expect(screen.getByText('Last 5 minutes')).toBeInTheDocument();
	});
});
