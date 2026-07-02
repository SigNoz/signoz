import { fireEvent, render, screen } from 'tests/test-utils';

import AutoRefresh from '../AutoRefresh';

describe('Public dashboard AutoRefresh', () => {
	it('renders the interval selector', () => {
		render(<AutoRefresh value="off" onChange={jest.fn()} />);
		expect(
			screen.getByTestId('public-dashboard-auto-refresh'),
		).toBeInTheDocument();
	});

	it('lets the viewer pick a refresh interval', () => {
		const onChange = jest.fn();
		render(<AutoRefresh value="off" onChange={onChange} />);

		fireEvent.click(screen.getByTestId('public-dashboard-auto-refresh'));
		fireEvent.click(screen.getByText('30 seconds'));

		expect(onChange).toHaveBeenCalledWith('30s');
	});
});
