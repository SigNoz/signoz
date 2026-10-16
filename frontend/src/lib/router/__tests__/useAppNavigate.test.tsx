import { MemoryRouter, useHistory } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import type { NavigateOptions, To } from '../types';
import { useAppLocation } from '../useAppLocation';
import { useAppNavigate } from '../useAppNavigate';

function Probe({
	to,
	options,
}: {
	to: To;
	options?: NavigateOptions;
}): JSX.Element {
	const navigate = useAppNavigate();
	const location = useAppLocation();
	const history = useHistory();

	return (
		<div>
			<button
				type="button"
				data-testid="navigate"
				aria-label="navigate"
				onClick={(): void => navigate(to, options)}
			/>
			<span data-testid="pathname">{location.pathname}</span>
			<span data-testid="search">{location.search}</span>
			<span data-testid="state">{JSON.stringify(location.state ?? null)}</span>
			<span data-testid="length">{history.length}</span>
		</div>
	);
}

function renderProbe(to: To, options?: NavigateOptions): void {
	render(
		<MemoryRouter initialEntries={['/']}>
			<Probe to={to} options={options} />
		</MemoryRouter>,
	);
}

describe('useAppNavigate', () => {
	it('pushes a string target', () => {
		renderProbe('/logs?a=1');
		fireEvent.click(screen.getByTestId('navigate'));

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('search')).toHaveTextContent('?a=1');
	});

	it('pushes an object target', () => {
		renderProbe({ pathname: '/logs', search: '?a=1' });
		fireEvent.click(screen.getByTestId('navigate'));

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('search')).toHaveTextContent('?a=1');
	});

	it('carries state', () => {
		renderProbe('/logs', { state: { from: 'test' } });
		fireEvent.click(screen.getByTestId('navigate'));

		expect(screen.getByTestId('state')).toHaveTextContent('{"from":"test"}');
	});

	it('adds a history entry by default', () => {
		renderProbe('/logs');
		const before = screen.getByTestId('length').textContent;
		fireEvent.click(screen.getByTestId('navigate'));

		expect(Number(screen.getByTestId('length').textContent)).toBe(
			Number(before) + 1,
		);
	});

	it('does not add a history entry when replacing', () => {
		renderProbe('/logs', { replace: true });
		const before = screen.getByTestId('length').textContent;
		fireEvent.click(screen.getByTestId('navigate'));

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('length').textContent).toBe(before);
	});
});
