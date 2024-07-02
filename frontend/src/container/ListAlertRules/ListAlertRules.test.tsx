import { act } from 'react-dom/test-utils';
import { fireEvent, render, screen, within } from 'tests/test-utils';

import ListAlertRules from '.';

describe('ListAlertRules', () => {
	test('Should render the table', async () => {
		act(() => {
			render(<ListAlertRules />);
		});

		const newAlert = await screen.findByRole('button', {
			name: /plus new alert/i,
		});

		expect(newAlert).toBeInTheDocument();

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

		const enabled = await screen.findByRole('menuitem', {
			name: /enable/i,
		});
		expect(enabled).toBeInTheDocument();
	});

	test('Should render enabled for disabled alert in menu', async () => {
		act(() => {
			render(<ListAlertRules />);
		});

		const disabledRow = await screen.findByRole('row', {
			name: /disabled Test Rule 1 warning details: https:\/\/stagi\.\.\. hello: world region: us \+1 ellipsis/i,
		});
		expect(disabledRow).toBeInTheDocument();

		const actionButton = within(disabledRow).getByRole('button', {
			name: /ellipsis/i,
		});
		expect(actionButton).toBeInTheDocument();

		fireEvent.mouseOver(actionButton);

		const enabled = await screen.findByRole('menuitem', {
			name: /enable/i,
		});
		expect(enabled).toBeInTheDocument();
	});

	test('Should render disabled for Ok alert in menu', async () => {
		act(() => {
			render(<ListAlertRules />);
		});

		const enabledRow = await screen.findByRole('row', {
			name: /ok test rule 2 warning - ellipsis/i,
		});

		expect(enabledRow).toBeInTheDocument();

		const actionButton = within(enabledRow).getByRole('button', {
			name: /ellipsis/i,
		});
		expect(actionButton).toBeInTheDocument();

		fireEvent.mouseOver(actionButton);

		const disabled = await screen.findByRole('menuitem', {
			name: /disable/i,
		});
		expect(disabled).toBeInTheDocument();
	});
});
