import userEvent from '@testing-library/user-event';
import { render, screen } from 'tests/test-utils';

import { SeriesLabel } from '../SeriesLabel';

describe('SeriesLabel', () => {
	it('renders the label text', () => {
		render(
			<SeriesLabel label="Test Series Label" labelIndex={1} onClick={jest.fn()} />,
		);
		expect(screen.getByTestId('series-label-button-1')).toHaveTextContent(
			'Test Series Label',
		);
	});

	it('calls onClick with labelIndex when clicked', async () => {
		const onClick = jest.fn();
		render(<SeriesLabel label="Series A" labelIndex={2} onClick={onClick} />);

		await userEvent.click(screen.getByTestId('series-label-button-2'));

		expect(onClick).toHaveBeenCalledWith(2);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('renders disabled button when disabled prop is true', () => {
		render(
			<SeriesLabel label="Disabled" labelIndex={0} onClick={jest.fn()} disabled />,
		);
		const button = screen.getByTestId('series-label-button-0');
		expect(button).toBeDisabled();
	});

	it('has chart-manager-series-label class', () => {
		render(<SeriesLabel label="Label" labelIndex={0} onClick={jest.fn()} />);
		const button = screen.getByTestId('series-label-button-0');
		expect(button).toHaveClass('chart-manager-series-label');
	});
});
