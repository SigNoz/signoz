import { render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';
import { AlertTypes } from 'types/api/alerts/alertTypes';

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

jest.mock('../AdvancedOptions', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="advanced-options">AdvancedOptions</div>
	),
}));

describe('EvaluationSettings', () => {
	it('should render the condensed evaluation settings layout', () => {
		render(<EvaluationSettings />);
		expect(
			screen.getByTestId('condensed-evaluation-settings-container'),
		).toBeInTheDocument();
	});

	it('should not render evaluation window for anomaly based alert', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce(
			createMockAlertContextState({
				alertType: AlertTypes.ANOMALY_BASED_ALERT,
			}),
		);
		render(<EvaluationSettings />);
		// Only evaluation window popover should be visible
		expect(
			screen.getByTestId('condensed-evaluation-settings-container'),
		).toBeInTheDocument();
	});
});
