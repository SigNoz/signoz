import { render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';

import EvaluationSettings from '../EvaluationSettings';
import { createMockAlertContextState } from './testUtils';

vi.mock('container/CreateAlertV2/utils', async () => ({
	...(await vi.importActual('container/CreateAlertV2/utils')),
}));

// Browser mode has no SSR transform, so a real ESM namespace is frozen and
// `vi.spyOn` on it throws. `vi.mock(..., { spy: true })` routes the module
// through the mocker instead, which works in both environments.
vi.mock('container/CreateAlertV2/context', { spy: true });

const mockSetEvaluationWindow = vi.fn();
vi.mocked(alertState.useCreateAlertState).mockReturnValue(
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
