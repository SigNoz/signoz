import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import StatCard from './StatCard';

describe('StatCard', () => {
	it('should render label and value', () => {
		render(<StatCard label="Firing" value={5} />);

		expect(screen.getByTestId('stat-card-label')).toHaveTextContent('Firing');
		expect(screen.getByTestId('stat-card-value')).toHaveTextContent('5');
	});

	it('should apply custom color to value', () => {
		render(<StatCard label="Firing" value={5} color="red" />);

		expect(screen.getByTestId('stat-card-value')).toHaveStyle({ color: 'red' });
	});

	it('should not have button role when onClick is not provided', () => {
		render(<StatCard label="Firing" value={5} />);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('should have button role when onClick is provided', () => {
		const onClick = jest.fn();

		render(<StatCard label="Firing" value={5} onClick={onClick} />);

		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('should call onClick with exclusive: false on regular click', async () => {
		const user = userEvent.setup();
		const onClick = jest.fn();

		render(<StatCard label="Firing" value={5} onClick={onClick} />);

		await user.click(screen.getByTestId('stat-card'));

		expect(onClick).toHaveBeenCalledWith({ exclusive: false });
	});

	it('should call onClick with exclusive: true on alt+click', async () => {
		const user = userEvent.setup();
		const onClick = jest.fn();

		render(<StatCard label="Firing" value={5} onClick={onClick} />);

		await user.keyboard('{Alt>}');
		await user.click(screen.getByTestId('stat-card'));
		await user.keyboard('{/Alt}');

		expect(onClick).toHaveBeenCalledWith({ exclusive: true });
	});

	it('should call onClick on Enter key press', async () => {
		const user = userEvent.setup();
		const onClick = jest.fn();

		render(<StatCard label="Firing" value={5} onClick={onClick} />);

		const card = screen.getByTestId('stat-card');
		card.focus();
		await user.keyboard('{Enter}');

		expect(onClick).toHaveBeenCalledWith({ exclusive: false });
	});

	it('should call onClick on Space key press', async () => {
		const user = userEvent.setup();
		const onClick = jest.fn();

		render(<StatCard label="Firing" value={5} onClick={onClick} />);

		const card = screen.getByTestId('stat-card');
		card.focus();
		await user.keyboard(' ');

		expect(onClick).toHaveBeenCalledWith({ exclusive: false });
	});

	it('should be focusable when onClick is provided', () => {
		render(<StatCard label="Firing" value={5} onClick={jest.fn()} />);

		expect(screen.getByTestId('stat-card')).toHaveAttribute('tabindex', '0');
	});

	it('should not be focusable when onClick is not provided', () => {
		render(<StatCard label="Firing" value={5} />);

		expect(screen.getByTestId('stat-card')).not.toHaveAttribute('tabindex');
	});

	it('should not have color style when color prop is not provided', () => {
		render(<StatCard label="Firing" value={5} />);

		expect(screen.getByTestId('stat-card-value')).not.toHaveAttribute('style');
	});
});
