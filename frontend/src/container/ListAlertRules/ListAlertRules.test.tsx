import { act } from 'react-dom/test-utils';
import { fireEvent, render, screen, waitFor, within } from 'tests/test-utils';

import ListAlertRules from '.';

describe('ListAlertRules', () => {
	test('Should render the table', async () => {
		act(() => {
			render(<ListAlertRules />);
		});
		const status = await screen.findByText(/status/i);
		expect(status).toBeInTheDocument();

		const alertName = await screen.findByText(/alert name/i);
		expect(alertName).toBeInTheDocument();

		const severity = await screen.findByText(/severity/i);
		expect(severity).toBeInTheDocument();

		const label = await screen.findByText(/label/i);
		expect(label).toBeInTheDocument();

		const action = await screen.findByText(/action/i);
		expect(action).toBeInTheDocument();
	});

	test('Should render the table data', async () => {
		act(() => {
			render(<ListAlertRules />);
		});

		const status = await screen.findByText(/status/i);
		expect(status).toBeInTheDocument();

		const disabledRow = await screen.findByRole('row', {
			name: /disabled Test Rule 1 warning details: https:\/\/stagi\.\.\. hello: world region: us \+1 ellipsis/i,
		});
		expect(disabledRow).toBeInTheDocument();

		const actionButton = within(disabledRow).getByRole('button', {
			name: /ellipsis/i,
		});
		expect(actionButton).toBeInTheDocument();

		fireEvent.mouseOver(actionButton);

		waitFor(() => {
			const button = screen.getByRole('button', {
				name: /enable/i,
			});

			within(button).getByText(/enable/i);
		});

		screen.debug();
	});
});
