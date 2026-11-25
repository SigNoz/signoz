import { render, screen, userEvent } from 'tests/test-utils';

import Stepper from '../Stepper';
import { InspectionStep } from '../types';

const TIME_AGGREGATION_STEP_TEST_ID = 'inspect-step-time-aggregation';

describe('Stepper', () => {
	const mockResetInspection = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders welcome message', () => {
		render(
			<Stepper
				inspectionStep={InspectionStep.TIME_AGGREGATION}
				resetInspection={mockResetInspection}
			/>,
		);

		expect(
			screen.getByText('👋 Hello, welcome to the Metrics Inspector'),
		).toBeInTheDocument();
	});

	it('shows temporal aggregation step as active when on first step', () => {
		render(
			<Stepper
				inspectionStep={InspectionStep.TIME_AGGREGATION}
				resetInspection={mockResetInspection}
			/>,
		);

		expect(screen.getByTestId(TIME_AGGREGATION_STEP_TEST_ID)).toHaveClass(
			'whats-next-checklist-item',
		);
	});

	it('shows temporal aggregation step as completed when on later steps', () => {
		render(
			<Stepper
				inspectionStep={InspectionStep.SPACE_AGGREGATION}
				resetInspection={mockResetInspection}
			/>,
		);

		expect(screen.getByTestId(TIME_AGGREGATION_STEP_TEST_ID)).toHaveClass(
			'completed-checklist-item',
		);
	});

	it('calls resetInspection when reset button is clicked', async () => {
		render(
			<Stepper
				inspectionStep={InspectionStep.COMPLETED}
				resetInspection={mockResetInspection}
			/>,
		);

		const resetButton = screen.getByRole('button');
		await userEvent.click(resetButton);

		expect(mockResetInspection).toHaveBeenCalledTimes(1);
	});
});
