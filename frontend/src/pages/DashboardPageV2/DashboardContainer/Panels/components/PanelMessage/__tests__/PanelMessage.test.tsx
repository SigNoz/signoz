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
});
