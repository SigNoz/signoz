import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Stepper from '../Stepper';
import { InspectionStep } from '../types';

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

		const temporalStep = screen.getByText(/First, align the data by selecting a/);
		expect(temporalStep.parentElement).toHaveClass('whats-next-checklist-item');
	});

	it('shows temporal aggregation step as completed when on later steps', () => {
		render(
			<Stepper
				inspectionStep={InspectionStep.SPACE_AGGREGATION}
				resetInspection={mockResetInspection}
			/>,
		);

		const temporalStep = screen.getByText(/First, align the data by selecting a/);
		expect(temporalStep.parentElement).toHaveClass('completed-checklist-item');
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
