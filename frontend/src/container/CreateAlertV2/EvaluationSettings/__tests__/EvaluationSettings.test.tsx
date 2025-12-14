import { render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';
import * as utils from 'container/CreateAlertV2/utils';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import EvaluationSettings from '../EvaluationSettings';
import { createMockAlertContextState } from './testUtils';

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

const EVALUATION_SETTINGS_TEXT = 'Evaluation settings';
const CHECK_CONDITIONS_USING_DATA_FROM_TEXT =
	'Check conditions using data from';

describe('EvaluationSettings', () => {
	it('should render the default evaluation settings layout', () => {
		render(<EvaluationSettings />);
		expect(screen.getByText(EVALUATION_SETTINGS_TEXT)).toBeInTheDocument();
		expect(
			screen.getByText(CHECK_CONDITIONS_USING_DATA_FROM_TEXT),
		).toBeInTheDocument();
		expect(screen.getByTestId('advanced-options')).toBeInTheDocument();
	});

	it('should not render evaluation window for anomaly based alert', () => {
		jest.spyOn(alertState, 'useCreateAlertState').mockReturnValueOnce(
			createMockAlertContextState({
				alertType: AlertTypes.ANOMALY_BASED_ALERT,
			}),
		);
		render(<EvaluationSettings />);
		expect(screen.getByText(EVALUATION_SETTINGS_TEXT)).toBeInTheDocument();
		expect(
			screen.queryByText(CHECK_CONDITIONS_USING_DATA_FROM_TEXT),
		).not.toBeInTheDocument();
	});

	it('should render the condensed evaluation settings layout', () => {
		jest.spyOn(utils, 'showCondensedLayout').mockReturnValueOnce(true);
		render(<EvaluationSettings />);
		// Header, check conditions using data from and advanced options should be hidden
		expect(screen.queryByText(EVALUATION_SETTINGS_TEXT)).not.toBeInTheDocument();
		expect(
			screen.queryByText(CHECK_CONDITIONS_USING_DATA_FROM_TEXT),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('advanced-options')).not.toBeInTheDocument();
		// Only evaluation window popover should be visible
		expect(
			screen.getByTestId('condensed-evaluation-settings-container'),
		).toBeInTheDocument();
	});
});
