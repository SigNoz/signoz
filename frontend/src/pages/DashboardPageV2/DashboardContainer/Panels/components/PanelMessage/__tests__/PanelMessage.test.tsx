import { fireEvent, render, screen } from '@testing-library/react';

import PanelMessage from '../PanelMessage';

describe('PanelMessage', () => {
	it('renders the icon, title and description', () => {
		render(
			<PanelMessage
				icon={<svg data-testid="icon" />}
				title="Nothing to visualize yet"
				description="This panel has no query."
				data-testid="panel-state"
			/>,
		);

		expect(screen.getByTestId('panel-state')).toBeInTheDocument();
		expect(screen.getByTestId('icon')).toBeInTheDocument();
		expect(screen.getByText('Nothing to visualize yet')).toBeInTheDocument();
		expect(screen.getByText('This panel has no query.')).toBeInTheDocument();
	});

	it('renders no action button when no action is provided', () => {
		render(
			<PanelMessage icon={null} title="No data" data-testid="panel-state" />,
		);

		expect(screen.queryByTestId('panel-state-action')).not.toBeInTheDocument();
	});

	it('renders the action button and fires onClick when pressed', () => {
		const onClick = jest.fn();
		render(
			<PanelMessage
				icon={null}
				title="Couldn’t load panel data"
				action={{ label: 'Retry', onClick }}
				data-testid="panel-error"
			/>,
		);

		const button = screen.getByTestId('panel-error-action');
		expect(button).toHaveTextContent('Retry');
		fireEvent.click(button);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('renders both actions side by side and wires each onClick', () => {
		const onPrimary = jest.fn();
		const onSecondary = jest.fn();
		render(
			<PanelMessage
				icon={null}
				title="No data in this time range"
				action={{ label: 'Extend time range', onClick: onPrimary }}
				secondaryAction={{ label: 'Retry', onClick: onSecondary }}
				data-testid="panel-no-data"
			/>,
		);

		const primary = screen.getByTestId('panel-no-data-action');
		const secondary = screen.getByTestId('panel-no-data-secondary-action');
		expect(primary).toHaveTextContent('Extend time range');
		expect(secondary).toHaveTextContent('Retry');

		fireEvent.click(primary);
		fireEvent.click(secondary);
		expect(onPrimary).toHaveBeenCalledTimes(1);
		expect(onSecondary).toHaveBeenCalledTimes(1);
	});
});
